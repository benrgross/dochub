import { hasSeenTour } from '@/lib/tour'
import { WelcomeTour } from '@/components/tour/welcome-tour'

/**
 * Server-side wrapper that reads the cookie and decides whether to auto-open
 * the tour. Lives in its own component so it can sit inside a Suspense
 * boundary — `cookies()` is dynamic and Cache Components forces it there.
 *
 * Returns null (renders nothing) for repeat visitors; the static shell
 * paints from the CDN with zero tour overhead.
 */
export async function WelcomeTourServer() {
  const seen = await hasSeenTour()
  if (seen) return null
  return <WelcomeTour autoOpen />
}
