import type { NextConfig } from 'next'
import { withBotId } from 'botid/next/config'

const nextConfig: NextConfig = {
  // Cache Components: enables PPR + the `use cache` directive at the page,
  // component, and function level.
  cacheComponents: true,

  images: {
    remotePatterns: [],
  },
}

// withBotId proxies the BotID detection script through our own domain so
// ad/script blockers don't disable it.
export default withBotId(nextConfig)
