import { routes, type VercelConfig } from '@vercel/config/v1'

/**
 * Typed Vercel project configuration. Compiled to vercel.json at build.
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
