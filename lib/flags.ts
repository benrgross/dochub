import 'server-only'
import { get } from '@vercel/edge-config'

/**
 * Runtime feature flags backed by Vercel Edge Config.
 *
 * Why Edge Config: changes propagate to every region in <1s and don't require
 * a redeploy. Perfect kill switch material for production-only features.
 *
 * If EDGE_CONFIG is not set (local dev) we fall back to env vars so the dev
 * loop is friction-free.
 */

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6'
const FALLBACK_MODEL = 'openai/gpt-5.4'

export async function isAiBranchEnabled(): Promise<boolean> {
  if (!process.env.EDGE_CONFIG) {
    return process.env.AI_BRANCH_ENABLED !== 'false'
  }
  try {
    const value = await get<boolean>('aiBranchEnabled')
    return value !== false
  } catch (error) {
    console.error('[flags] isAiBranchEnabled', error)
    return true
  }
}

/**
 * Resolves the model used for AI Branch. Plain "provider/model" strings
 * are routed through AI Gateway by the AI SDK automatically.
 */
export async function resolveAiModel(): Promise<string> {
  if (!process.env.EDGE_CONFIG) {
    return process.env.AI_MODEL_OVERRIDE || DEFAULT_MODEL
  }
  try {
    const flag = await get<string>('aiModel')
    if (!flag || flag === 'auto') return DEFAULT_MODEL
    if (flag === 'fallback') return FALLBACK_MODEL
    return flag
  } catch (error) {
    console.error('[flags] resolveAiModel', error)
    return DEFAULT_MODEL
  }
}
