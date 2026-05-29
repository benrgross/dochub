import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit } from '@/lib/runtime-cache'

/**
 * Routing Middleware.
 *
 * Responsibilities:
 *   1. Apply security headers to every response (CSP, X-Frame-Options, etc.).
 *   2. Sliding-window rate limit on POST /api/ai-edit per IP — protects the
 *      AI Gateway budget from runaway loops or accidental DoS.
 *
 * Notes:
 *   - Runs before the cache, so 429s never pollute cached responses.
 *   - Fails open if the Runtime Cache is unreachable.
 */

const AI_LIMIT = { limit: 10, windowSec: 60 }

export async function middleware(req: NextRequest) {
  if (req.method === 'POST' && req.nextUrl.pathname === '/api/ai-edit') {
    const ip = clientIp(req)
    const result = await rateLimit(`ai-edit:${ip}`, AI_LIMIT)
    if (!result.ok) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded — slow down and try again in a minute.',
        }),
        {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            'x-ratelimit-limit': result.limit.toString(),
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': Math.ceil(result.resetAt / 1000).toString(),
          },
        },
      )
    }
  }

  const res = NextResponse.next()
  applySecurityHeaders(res)
  return res
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? '0.0.0.0'
}

function applySecurityHeaders(res: NextResponse): void {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // Conservative CSP: allow self + Vercel's analytics/insights endpoints.
  // Tightening further requires nonce-based inline scripts.
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
    ].join('; '),
  )
}

/**
 * Match all routes except Next.js internals and static files. We need to
 * hit /api/ai-edit (POST) for rate limiting AND apply security headers
 * to every HTML response, so the matcher is broad.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
}
