import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 16 Cache Components: enables PPR + the `use cache` directive at the page,
  // component, and function level. Replaces the old `experimental.ppr` flag.
  cacheComponents: true,

  // Keep image optimization on in production; disable only if Supabase Storage
  // becomes the source for user-uploaded files later.
  images: {
    remotePatterns: [],
  },

  // Production hygiene: do not paper over TS errors. The previous v0 starter
  // had `ignoreBuildErrors: true`, which we explicitly drop here.
}

export default nextConfig
