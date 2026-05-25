import { routes, type VercelConfig } from '@vercel/config/v1'

/**
 * Typed Vercel project configuration (replaces vercel.json).
 *
 * The CLI auto-compiles this to vercel.json during build/dev/deploy.
 * Lets us configure crons, headers, redirects, and rewrites with full
 * TypeScript + env access — no JSON gymnastics.
 */
export const config: VercelConfig = {
  framework: 'nextjs',
  headers: [
    routes.cacheControl('/icon-light-32x32.png', {
      public: true,
      maxAge: '7 days',
      immutable: true,
    }),
    routes.cacheControl('/icon-dark-32x32.png', {
      public: true,
      maxAge: '7 days',
      immutable: true,
    }),
    routes.cacheControl('/apple-icon.png', {
      public: true,
      maxAge: '7 days',
      immutable: true,
    }),
  ],
}
