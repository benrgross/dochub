'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Bot,
  GitBranch,
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Replace,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { DiffViewer } from '@/components/diff-viewer'
import { ModelPickerPills } from '@/components/model-picker'
import { DEFAULT_MODEL_ID, findModel } from '@/lib/models'
import type { DocumentRow, AiMetadata, ToolCallRecord } from '@/lib/types'
import { createChangeRequest } from '@/app/_actions/change-requests'

interface AIBranchModalProps {
  document: DocumentRow
  isOpen: boolean
  onClose: () => void
}

type Proposal =
  | { kind: 'replacement'; find: string; replace: string; rationale: string }
  | { kind: 'insertion'; afterHeading: string; content: string; rationale: string }

/**
 * AI Branch flow:
 *   1. User types instructions.
 *   2. We POST to /api/ai-edit with the doc (via transport.body()) and
 *      the instructions as the user message.
 *   3. The route streams `streamText` with two tools — proposeReplacement
 *      and proposeInsertion — and we render each tool call as a card the
 *      moment it arrives.
 *   4. We apply the accepted proposals client-side to compute the proposed
 *      content, render a diff, and create a Change Request via Server Action.
 *
 */
export function AIBranchModal({ document, isOpen, onClose }: AIBranchModalProps) {
  const router = useRouter()
  const [instructions, setInstructions] = useState('')
  const [branchName, setBranchName] = useState('')
  const [pending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID)
  const modelIdRef = useRef(modelId)
  modelIdRef.current = modelId

  // Stabilize the transport so useChat doesn't bind to a stale closure of
  // `instructions`. Doc fields are static per session; the user's text
  // (the instructions) ships as the message body via sendMessage({ text }).
  // Model is read through a ref so picker changes don't re-build the
  // transport mid-stream — the next request just picks up the new value.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai-edit',
        body: () => ({
          document: { id: document.id, title: document.title, content: document.content },
          model: modelIdRef.current,
        }),
      }),
    [document.id, document.title, document.content],
  )

  // Deterministic ID per document — keeps the build prerender pure and lets
  // a single AI session bind to a single doc (no Math.random() at SSR).
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: `ai-branch-${document.id}`,
    transport,
  })

  const proposals = collectProposals(messages)
  const summary = collectAssistantText(messages)
  const proposed = applyProposals(document.content, proposals)
  const isStreaming = status === 'streaming' || status === 'submitted'
  const hasProposal = proposals.length > 0 || summary.length > 0

  function handleGenerate() {
    if (!instructions.trim() || isStreaming) return
    setMessages([])
    setSubmitError(null)
    sendMessage({ text: instructions.trim() })
  }

  function handleReset() {
    setMessages([])
    setSubmitError(null)
  }

  function handleCreateBranch() {
    if (!proposals.length || !branchName.trim()) return
    startTransition(async () => {
      const toolCalls: ToolCallRecord[] = proposals.map((p) =>
        p.kind === 'replacement'
          ? {
              name: 'proposeReplacement',
              input: { find: p.find, replace: p.replace },
              rationale: p.rationale,
            }
          : {
              name: 'proposeInsertion',
              input: { afterHeading: p.afterHeading, content: p.content },
              rationale: p.rationale,
            },
      )
      const aiMetadata: AiMetadata = {
        model: modelId,
        provider: findModel(modelId)?.provider,
        instructions,
        toolCalls,
      }
      const result = await createChangeRequest({
        documentId: document.id,
        title: branchName.trim(),
        description: summary || `AI-generated changes based on: "${instructions}"`,
        originalContent: document.content,
        proposedContent: proposed,
        aiMetadata,
      })
      if (!result.ok) {
        setSubmitError(result.error)
        return
      }
      handleClose()
      router.push(`/changes/${result.id}`)
    })
  }

  function handleClose() {
    setInstructions('')
    setBranchName('')
    setMessages([])
    setSubmitError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Branch</h2>
              <p className="text-sm text-muted-foreground">
                Pick a model. It proposes structured edits — humans review and merge.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasProposal ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    What changes should the AI make?
                  </label>
                  <ModelPickerPills value={modelId} onChange={setModelId} disabled={isStreaming} />
                </div>
                <Textarea
                  placeholder="e.g., Tighten the goals section, add a security paragraph, fix grammar issues..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="bg-background border-border resize-none"
                  disabled={isStreaming}
                />
              </div>

              {isStreaming ? (
                <ThinkingIndicator label="Connecting to the model" />
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Source of truth
                  </label>
                  <div className="bg-background border border-border rounded-lg p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {document.content.trim()}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <ProposalView
              proposals={proposals}
              summary={summary}
              original={document.content}
              proposed={proposed}
              instructions={instructions}
              branchName={branchName}
              setBranchName={setBranchName}
              isStreaming={isStreaming}
            />
          )}

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error.message || 'AI request failed'}</span>
            </div>
          )}
          {submitError && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          {!hasProposal ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!instructions.trim() || isStreaming}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate proposal
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleReset} disabled={isStreaming || pending}>
                Start over
              </Button>
              <Button
                onClick={handleCreateBranch}
                disabled={
                  !proposals.length || !branchName.trim() || isStreaming || pending
                }
                className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]"
              >
                {pending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <GitBranch className="w-4 h-4 mr-2" />
                )}
                Create branch
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ProposalView({
  proposals,
  summary,
  original,
  proposed,
  instructions,
  branchName,
  setBranchName,
  isStreaming,
}: {
  proposals: Proposal[]
  summary: string
  original: string
  proposed: string
  instructions: string
  branchName: string
  setBranchName: (v: string) => void
  isStreaming: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="bg-muted/40 rounded-md p-3 text-sm">
        <div className="text-xs text-muted-foreground mb-1">Instructions</div>
        <div className="text-foreground">{instructions}</div>
      </div>

      {isStreaming && (
        <ThinkingIndicator
          label={
            proposals.length === 0
              ? 'Analyzing the document and planning edits'
              : `Proposing edits (${proposals.length} so far)`
          }
        />
      )}

      {proposals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Proposed edits ({proposals.length})
            {isStreaming && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          <ul className="space-y-2">
            {proposals.map((p, i) => (
              <li
                key={i}
                className="border border-border bg-background rounded-md p-3 text-sm"
              >
                {p.kind === 'replacement' ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Replace className="w-3.5 h-3.5" />
                      <span>Replacement</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs font-mono">
                      <div className="bg-[oklch(0.18_0.04_25)] text-[oklch(0.75_0.12_25)] rounded px-2 py-1 truncate">
                        {p.find}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="bg-[oklch(0.18_0.04_145)] text-[oklch(0.75_0.12_145)] rounded px-2 py-1 truncate">
                        {p.replace}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insertion after {p.afterHeading}</span>
                    </div>
                    <pre className="bg-[oklch(0.18_0.04_145)] text-[oklch(0.75_0.12_145)] rounded px-2 py-1 text-xs font-mono whitespace-pre-wrap">
                      {p.content}
                    </pre>
                  </>
                )}
                <div className="mt-2 text-xs text-muted-foreground italic">{p.rationale}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="border border-border bg-background rounded-md p-3 text-sm">
          <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">
            Summary
          </div>
          <p className="text-foreground/90 whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {!isStreaming && proposals.length > 0 && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Branch name</label>
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ai/tighten-goals"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.12_200)]" />
              Preview diff
            </div>
            <div className="bg-card border border-border rounded-md overflow-hidden max-h-72 overflow-y-auto">
              <DiffViewer original={original} modified={proposed} viewMode="unified" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Persistent "working" indicator shown while the model streams. Tool-call
 * generation can pause for a few seconds between the preamble text and the
 * first edit, so this keeps it obvious that work is in flight.
 */
function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-purple-500/30 bg-purple-500/5 px-3 py-2.5">
      <Bot className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
      <span className="text-sm text-purple-200">{label}</span>
      <span className="ml-0.5 flex items-end gap-1" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="sr-only">Working…</span>
    </div>
  )
}

type UIMsg = ReturnType<typeof useChat>['messages'][number]

function collectProposals(messages: UIMsg[]): Proposal[] {
  const out: Proposal[] = []
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    for (const part of m.parts) {
      if (part.type === 'tool-proposeReplacement' && part.state === 'output-available') {
        const output = part.output as { ok?: boolean; find?: string; replace?: string; rationale?: string }
        if (output?.ok && output.find != null && output.replace != null) {
          out.push({
            kind: 'replacement',
            find: output.find,
            replace: output.replace,
            rationale: output.rationale ?? '',
          })
        }
      } else if (part.type === 'tool-proposeInsertion' && part.state === 'output-available') {
        const output = part.output as { ok?: boolean; afterHeading?: string; content?: string; rationale?: string }
        if (output?.ok && output.afterHeading != null && output.content != null) {
          out.push({
            kind: 'insertion',
            afterHeading: output.afterHeading,
            content: output.content,
            rationale: output.rationale ?? '',
          })
        }
      }
    }
  }
  return out
}

function collectAssistantText(messages: UIMsg[]): string {
  const chunks: string[] = []
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    for (const part of m.parts) {
      if (part.type === 'text') chunks.push(part.text)
    }
  }
  return chunks.join('\n').trim()
}

/**
 * Apply proposals to the source document in order. Each replacement assumes
 * its `find` is unique in the *current* (post-prior-edits) document; if it's
 * no longer present we skip it (the AI sometimes proposes overlapping edits).
 */
function applyProposals(original: string, proposals: Proposal[]): string {
  let out = original
  for (const p of proposals) {
    if (p.kind === 'replacement') {
      const idx = out.indexOf(p.find)
      if (idx === -1) continue
      out = out.slice(0, idx) + p.replace + out.slice(idx + p.find.length)
    } else {
      const idx = out.indexOf(p.afterHeading)
      if (idx === -1) continue
      const endOfHeading = out.indexOf('\n', idx)
      const insertAt = endOfHeading === -1 ? out.length : endOfHeading + 1
      const insertion = p.content.endsWith('\n') ? p.content : `${p.content}\n`
      out = out.slice(0, insertAt) + insertion + out.slice(insertAt)
    }
  }
  return out
}
