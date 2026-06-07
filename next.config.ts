import type { NextConfig } from 'next'
import { withBotId } from 'botid/next/config'
import { withWorkflow } from 'workflow/next'

const nextConfig: NextConfig = {
  // Cache Components: enables PPR + the `use cache` directive at the page,
  // component, and function level.
  cacheComponents: true,

  images: {
    remotePatterns: [],
  },
}

// Compose the config wrappers (withWorkflow must be outermost — it returns
// Next's phase-function config form):
// - withBotId proxies the BotID detection script through our own domain so
//   ad/script blockers don't disable it.
// - withWorkflow compiles the `'use workflow'` / `'use step'` directives into
//   the durable routes that back Vercel Workflows.
export default withWorkflow(withBotId(nextConfig))
