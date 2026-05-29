import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Cache Components: enables PPR + the `use cache` directive at the page,
  // component, and function level.
  cacheComponents: true,

  images: {
    remotePatterns: [],
  },
}

export default nextConfig
