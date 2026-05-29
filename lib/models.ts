/**
 * Shared model catalog. Pure data — importable from both Server and Client
 * Components. The "id" is the AI Gateway model slug (provider/model);
 * passing this string to the AI SDK routes the request through the gateway
 * automatically with observability + failover + cost tagging.
 *
 * Talking point: swapping providers is a single string change. No provider
 * SDK swap, no client refactor, no redeploy if the override lives in
 * Edge Config. This is exactly the value of AI Gateway as an indirection.
 */

export interface ModelOption {
  /** AI Gateway slug — what we hand to `streamText({ model })`. */
  id: string
  /** Human label shown in the picker. */
  label: string
  /** Provider name for badges / metadata. */
  provider: 'anthropic' | 'openai'
  /** Short marketing description shown under the label. */
  hint: string
}

export const MODELS: readonly ModelOption[] = [
  {
    id: 'anthropic/claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    hint: 'Anthropic · best for careful structured edits',
  },
  {
    id: 'openai/gpt-5.4',
    label: 'GPT-5.4',
    provider: 'openai',
    hint: 'OpenAI · faster, cheaper, broad capability',
  },
] as const

export const DEFAULT_MODEL_ID: (typeof MODELS)[number]['id'] = 'anthropic/claude-sonnet-4.6'

/**
 * Returns true if the string is one of the allowed AI Gateway model slugs.
 * Used server-side to reject arbitrary user-supplied strings (cost/abuse
 * mitigation — we don't want someone aiming this endpoint at an expensive
 * model we haven't budgeted for).
 */
export function isValidModelId(id: string | undefined): id is ModelOption['id'] {
  if (!id) return false
  return MODELS.some((m) => m.id === id)
}

export function findModel(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id)
}
