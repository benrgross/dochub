import { getCache } from '@vercel/functions'

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
  limit: number
}

/**
 * Sliding-ish window rate limiter backed by the Vercel Runtime Cache.
 *
 * Why Runtime Cache: it's per-region, requires zero infra, and is exactly
 * the right TTL granularity for short rolling windows. No Redis needed.
 *
 * Bucket-per-window approach: at any instant we compare the current
 * 1-minute window count against the limit. This drifts by at most one
 * window — fine for protecting an AI endpoint from runaway loops.
 */
export async function rateLimit(
  key: string,
  { limit, windowSec }: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
  try {
    const cache = getCache()
    const now = Date.now()
    const windowStart = Math.floor(now / (windowSec * 1000))
    const cacheKey = `rl:${key}:${windowStart}`

    const prior = (await cache.get(cacheKey)) as number | undefined
    const count = (prior ?? 0) + 1

    await cache.set(cacheKey, count, {
      ttl: windowSec + 5,
      name: 'rate-limit',
    })

    const resetAt = (windowStart + 1) * windowSec * 1000
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      limit,
    }
  } catch (error) {
    // Fail open — never block legitimate traffic because the cache layer
    // hiccuped. The talking point: production rate limiters degrade
    // gracefully; they don't take the app down with them.
    console.error('[rate-limit] cache error', error)
    return { ok: true, remaining: limit, resetAt: Date.now() + windowSec * 1000, limit }
  }
}
