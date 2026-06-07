import { defineHook, FatalError, getWritable } from 'workflow'
import { z } from 'zod'
import { generateText, stepCountIs } from 'ai'
import { revalidatePath, updateTag } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { applyProposals, type Proposal } from '@/lib/proposals'
import { tag } from '@/lib/cache-tags'
import type { AiMetadata, ToolCallRecord } from '@/lib/types'

/**
 * Durable "AI Change Request" workflow.
 *
 * This is the additive, headless counterpart to the live-streaming
 * `/api/ai-edit` endpoint. Where that route streams an interactive proposal
 * to the browser (bounded by `maxDuration = 60`), this workflow runs the full
 * change-request lifecycle durably and survives crashes/deploys:
 *
 *   loadDocument → generateProposal → persistChangeRequest → [HOOK: human review] → mergeApproved
 *
 * Each `'use step'` function gets automatic retries; the `reviewHook` pauses
 * the run — for minutes or days — until a human approves, requests changes,
 * or closes it, consuming no compute while it waits. Every step is visible in
 * the Vercel dashboard under Observability → Workflows.
 *
 * Note on data access: steps run outside a request (no cookies), so they use
 * the non-cookie-bound `createServiceClient()` and take the acting persona as
 * an explicit argument rather than calling the cookie-based `getCurrentUser()`.
 */

export type ReviewDecision = {
  decision: 'approved' | 'changes' | 'closed'
  approver: string
  notes?: string
}

/**
 * Module-level hook so an API route / Server Action can resume a paused run
 * via `reviewHook.resume(changeRequestId, decision)`.
 */
export const reviewHook = defineHook<ReviewDecision>()

export interface AiChangeRequestInput {
  documentId: string
  instruction: string
  /** AI Gateway model slug, e.g. "anthropic/claude-sonnet-4.6". */
  modelId: string
  modelProvider?: string
  /** Persona that triggered the run (captured from the request). */
  author: string
}

export type AiChangeRequestResult = {
  changeRequestId: string
  status: 'merged' | 'closed'
}

/**
 * Coarse progress events written to the run's stream (namespace `progress`)
 * so the UI can watch a durable run live — load → generate → propose →
 * persist — instead of waiting blind. Read them out with
 * `getRun(runId).getReadable({ namespace: 'progress' })`. Best-effort only:
 * the stream is observational and never gates the actual work.
 */
export type ProgressEvent =
  | { type: 'phase'; phase: 'loaded'; title: string }
  | { type: 'phase'; phase: 'generating' }
  | { type: 'proposals'; summary: string; items: Proposal[] }
  | { type: 'phase'; phase: 'persisted'; changeRequestId: string }
  | { type: 'error'; message: string }

const PROGRESS_NAMESPACE = 'progress'

export async function aiChangeRequestWorkflow(
  input: AiChangeRequestInput,
): Promise<AiChangeRequestResult> {
  'use workflow'

  const doc = await loadDocument(input.documentId)

  let instruction = input.instruction
  let proposal = await generateProposal(doc, instruction, input.modelId)
  let changeRequestId = await persistChangeRequest({
    documentId: input.documentId,
    author: input.author,
    originalContent: doc.content,
    proposal,
    instruction,
    modelId: input.modelId,
    modelProvider: input.modelProvider,
  })

  // Human-in-the-loop review loop. Each revision waits on a fresh hook keyed
  // by the *current* change request id, so resuming targets the right version.
  for (;;) {
    const review = await reviewHook.create({ token: changeRequestId })

    if (review.decision === 'approved') {
      await mergeApproved(changeRequestId, review.approver)
      return { changeRequestId, status: 'merged' }
    }
    if (review.decision === 'closed') {
      return { changeRequestId, status: 'closed' }
    }

    // 'changes' → regenerate with the reviewer's notes and open a new version.
    instruction = `${input.instruction}\n\nReviewer feedback to address: ${review.notes ?? '(none provided)'}`
    proposal = await generateProposal(doc, instruction, input.modelId)
    changeRequestId = await persistChangeRequest({
      documentId: input.documentId,
      author: input.author,
      originalContent: doc.content,
      proposal,
      instruction,
      modelId: input.modelId,
      modelProvider: input.modelProvider,
    })
  }
}

// ─── Steps ──────────────────────────────────────────────────────────────────

interface LoadedDoc {
  id: string
  title: string
  content: string
}

async function loadDocument(documentId: string): Promise<LoadedDoc> {
  'use step'

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, content')
    .eq('id', documentId)
    .single()

  // A missing document is unrecoverable — don't burn retries on it.
  if (error) {
    await emitProgress({ type: 'error', message: 'Document not found.' })
    throw new FatalError(`Document ${documentId} not found: ${error.message}`)
  }
  await emitProgress({ type: 'phase', phase: 'loaded', title: data.title })
  return data as LoadedDoc
}

interface GeneratedProposal {
  proposedContent: string
  summary: string
  aiMetadata: AiMetadata
}

async function generateProposal(
  doc: LoadedDoc,
  instruction: string,
  modelId: string,
): Promise<GeneratedProposal> {
  'use step'

  await emitProgress({ type: 'phase', phase: 'generating' })

  const result = await generateText({
    model: modelId,
    stopWhen: stepCountIs(8),
    system: `You are a meticulous document editor. The user has a source-of-truth markdown document titled "${doc.title}" and a set of edit instructions. Your job is to propose targeted edits to that document by emitting tool calls. Never rewrite the document wholesale.

Rules:
- Always propose at least one concrete edit using the tools. This is a one-shot flow — the user cannot reply, so NEVER ask clarifying questions or request more information.
- If the instruction is vague or open-ended, make reasonable best-effort improvements (clarity, concision, grammar, structure, impact) and state your interpretation in the summary.
- Use the proposeReplacement tool when you want to change an existing substring. The "find" value must match the source document exactly.
- Use the proposeInsertion tool when you want to add new content after a heading.
- Each tool call must include a one-sentence rationale that explains why the edit improves the document.
- Prefer many small, surgical edits over one giant rewrite.
- After all tool calls, output exactly one or two plain sentences summarizing the changes overall — no preamble, no markdown, no bullet list.

The current document is between the <doc> tags:
<doc>
${doc.content}
</doc>

The user's instructions are: ${instruction}`,
    prompt: instruction,
    tools: {
      proposeReplacement: {
        description:
          'Replace an exact substring of the document with new content. "find" must appear in the document exactly once.',
        inputSchema: z.object({
          find: z.string().min(1).describe('Exact substring to replace.'),
          replace: z.string().describe('The replacement content.'),
          rationale: z.string().describe('Why this change improves the document.'),
        }),
        execute: async ({ find, replace, rationale }) => {
          const occurrences = countOccurrences(doc.content, find)
          if (occurrences === 0) {
            return { ok: false as const, reason: '"find" did not match the document.' }
          }
          if (occurrences > 1) {
            return {
              ok: false as const,
              reason: `"find" matched ${occurrences} times — add surrounding context.`,
            }
          }
          return { ok: true as const, find, replace, rationale }
        },
      },
      proposeInsertion: {
        description:
          'Insert new content immediately after a specific heading. The heading text must appear in the document.',
        inputSchema: z.object({
          afterHeading: z
            .string()
            .min(1)
            .describe('The heading line to insert content after (include the leading # marks).'),
          content: z.string().describe('The content to insert below the heading.'),
          rationale: z.string().describe('Why this addition improves the document.'),
        }),
        execute: async ({ afterHeading, content, rationale }) => {
          if (!doc.content.includes(afterHeading)) {
            return { ok: false as const, reason: `Heading "${afterHeading}" not found.` }
          }
          return { ok: true as const, afterHeading, content, rationale }
        },
      },
    },
  })

  // Collect accepted proposals from successful tool results across every step.
  const proposals: Proposal[] = []
  const toolCalls: ToolCallRecord[] = []
  for (const step of result.steps) {
    for (const tr of step.toolResults) {
      const output = tr.output as
        | { ok: true; find?: string; replace?: string; afterHeading?: string; content?: string; rationale: string }
        | { ok: false; reason: string }
      if (!output?.ok) continue
      if (tr.toolName === 'proposeReplacement' && output.find != null && output.replace != null) {
        proposals.push({
          kind: 'replacement',
          find: output.find,
          replace: output.replace,
          rationale: output.rationale,
        })
        toolCalls.push({
          name: 'proposeReplacement',
          input: { find: output.find, replace: output.replace },
          rationale: output.rationale,
        })
      } else if (
        tr.toolName === 'proposeInsertion' &&
        output.afterHeading != null &&
        output.content != null
      ) {
        proposals.push({
          kind: 'insertion',
          afterHeading: output.afterHeading,
          content: output.content,
          rationale: output.rationale,
        })
        toolCalls.push({
          name: 'proposeInsertion',
          input: { afterHeading: output.afterHeading, content: output.content },
          rationale: output.rationale,
        })
      }
    }
  }

  if (proposals.length === 0) {
    const message = 'The model proposed no applicable edits for that instruction.'
    await emitProgress({ type: 'error', message })
    throw new FatalError(message)
  }

  const proposedContent = applyProposals(doc.content, proposals)
  if (proposedContent === doc.content) {
    const message = 'Proposed edits produced no change to the document.'
    await emitProgress({ type: 'error', message })
    throw new FatalError(message)
  }

  const summary = result.text.trim() || 'AI-proposed edits.'
  await emitProgress({ type: 'proposals', summary, items: proposals })

  return {
    proposedContent,
    summary,
    aiMetadata: { model: modelId, instructions: instruction, toolCalls },
  }
}

interface PersistInput {
  documentId: string
  author: string
  originalContent: string
  proposal: GeneratedProposal
  instruction: string
  modelId: string
  modelProvider?: string
}

async function persistChangeRequest(input: PersistInput): Promise<string> {
  'use step'

  const supabase = createServiceClient()
  const title = deriveTitle(input.instruction)
  const { data, error } = await supabase
    .from('change_requests')
    .insert({
      document_id: input.documentId,
      title,
      description: input.proposal.summary,
      author: input.author,
      original_content: input.originalContent,
      proposed_content: input.proposal.proposedContent,
      ai_metadata: {
        ...input.proposal.aiMetadata,
        provider: input.modelProvider ?? input.proposal.aiMetadata.provider,
      },
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create change request: ${error.message}`)

  revalidatePath('/changes')
  await emitProgress({ type: 'phase', phase: 'persisted', changeRequestId: data.id as string })
  return data.id as string
}

async function mergeApproved(changeRequestId: string, approver: string): Promise<void> {
  'use step'

  const supabase = createServiceClient()

  const { data: cr, error: fetchErr } = await supabase
    .from('change_requests')
    .select('*')
    .eq('id', changeRequestId)
    .single()
  if (fetchErr) throw new Error(`Failed to load change request: ${fetchErr.message}`)
  if (cr.status === 'merged') return // idempotent — replays/retries are safe

  const { error: docErr } = await supabase
    .from('documents')
    .update({ content: cr.proposed_content })
    .eq('id', cr.document_id)
  if (docErr) throw new Error(`Failed to update document: ${docErr.message}`)

  const { error: crErr } = await supabase
    .from('change_requests')
    .update({ status: 'merged', approved_by: approver, approved_at: new Date().toISOString() })
    .eq('id', changeRequestId)
  if (crErr) throw new Error(`Failed to mark merged: ${crErr.message}`)

  const { error: commitErr } = await supabase.from('commits').insert({
    document_id: cr.document_id,
    change_request_id: changeRequestId,
    message: cr.title,
    author: approver,
    content_snapshot: cr.proposed_content,
  })
  if (commitErr) throw new Error(`Failed to write commit: ${commitErr.message}`)

  // Invalidate caches to ensure UI reflects merged state
  updateTag(tag.document())
  updateTag(tag.document(cr.document_id))
  updateTag(tag.commits(cr.document_id))
  updateTag(tag.changeRequest(changeRequestId))
  revalidatePath('/document')
  revalidatePath('/changes')
  revalidatePath('/history')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Append one progress event to the run's readable stream. Call only from
 * inside `'use step'` functions (steps run exactly once, so the side effect
 * isn't duplicated on replay). Releasing the writer lock flushes the chunk
 * without closing the stream, so later steps keep appending to it. Swallows
 * all errors — a failed telemetry write must never fail the real edit.
 */
async function emitProgress(event: ProgressEvent): Promise<void> {
  try {
    const writer = getWritable<string>({ namespace: PROGRESS_NAMESPACE }).getWriter()
    await writer.write(`${JSON.stringify(event)}\n`)
    writer.releaseLock()
  } catch {
    // Streaming is observational; ignore.
  }
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count += 1
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}

function deriveTitle(instruction: string): string {
  const firstLine = instruction.split('\n')[0]?.trim() ?? 'AI change request'
  const clean = firstLine.length > 0 ? firstLine : 'AI change request'
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean
}
