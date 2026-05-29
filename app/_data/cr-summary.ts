import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { generateText } from 'ai'
import { getChangeRequest } from './change-requests'
import { tag } from '@/lib/cache-tags'
import { DEFAULT_MODEL_ID } from '@/lib/models'

const MAX_CHARS = 8_000

/**
 * AI-generated one-paragraph summary of a change request.
 *
 * This is an expensive computation (an LLM call), so it's wrapped in
 * `use cache` keyed by the change-request id: we generate it once and serve
 * it from cache on every subsequent view. A change request's proposed
 * content is immutable after creation, so `cacheLife('days')` is safe; the
 * dedicated `crSummary` tag lets a future "regenerate" action invalidate
 * just this entry without touching the CR's own cache.
 *
 * Errors (e.g. a gateway rate limit) resolve to null rather than throwing,
 * so the summary's Suspense boundary degrades gracefully without taking
 * down the surrounding page.
 */
export async function getChangeRequestSummary(crId: string): Promise<string | null> {
  'use cache'
  cacheLife('days')
  cacheTag(tag.crSummary(crId))

  const cr = await getChangeRequest(crId)
  if (!cr) return null

  try {
    const { text } = await generateText({
      model: DEFAULT_MODEL_ID,
      system:
        'You summarize proposed edits to a document for a reviewer. Respond with one or two plain sentences describing what changed and why it matters. No preamble, no markdown, no bullet points.',
      prompt: `Original document:\n${cr.originalContent.slice(0, MAX_CHARS)}\n\nProposed document:\n${cr.proposedContent.slice(0, MAX_CHARS)}\n\nSummarize the change in one or two sentences.`,
    })
    return text.trim() || null
  } catch (error) {
    console.error('[data] getChangeRequestSummary', error)
    return null
  }
}
