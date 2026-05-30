import 'server-only'
import { generateText } from 'ai'
import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_MODEL_ID } from '@/lib/models'
import type { AiMetadata } from '@/lib/types'

/**
 * Returns an AI summary of a change request's proposed edits, generating it
 * exactly once and persisting it to `change_requests.ai_summary`.
 *
 * - First view: generates from the stored tool-call rationales (one AI call),
 *   writes it back, returns it. The page shows a skeleton via Suspense while
 *   this runs.
 * - Later views: a single indexed read, no AI call.
 *
 * DB-backed rather than `use cache` because the AI Gateway call reads a
 * request-scoped OIDC token (which makes a `use cache` scope dynamic) and
 * `use cache` entries also bust on every deploy. A change request's proposed
 * content is immutable, so the stored summary never goes stale.
 *
 * Returns null for non-AI change requests or on any failure, so the summary
 * section degrades gracefully.
 */
export async function ensureChangeRequestSummary(crId: string): Promise<string | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('change_requests')
    .select('ai_summary, ai_metadata, original_content, proposed_content')
    .eq('id', crId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[data] ensureChangeRequestSummary read', error)
    return null
  }
  if (data.ai_summary) return data.ai_summary

  const meta = data.ai_metadata as AiMetadata | null
  if (!meta) return null // not an AI-authored change request

  try {
    const rationales = (meta.toolCalls ?? [])
      .map((t, i) => `${i + 1}. (${t.name === 'proposeInsertion' ? 'insertion' : 'replacement'}) ${t.rationale ?? ''}`)
      .join('\n')

    const { text } = await generateText({
      model: DEFAULT_MODEL_ID,
      system:
        'You summarize a set of proposed document edits for a reviewer. Respond with one or two plain sentences describing what the changes accomplish overall. No preamble, no markdown, no bullet points.',
      prompt: `User instruction: ${meta.instructions}\n\nProposed edits (${meta.toolCalls?.length ?? 0}) and their rationales:\n${rationales}\n\nWrite a one or two sentence summary of what these changes accomplish.`,
    })
    const summary = text.trim()
    if (!summary) return null

    await supabase.from('change_requests').update({ ai_summary: summary }).eq('id', crId)
    return summary
  } catch (err) {
    console.error('[data] ensureChangeRequestSummary generate', err)
    return null
  }
}
