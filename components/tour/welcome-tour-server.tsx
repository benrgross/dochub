import { hasSeenTour } from '@/lib/tour'
import { getPinnedDocument } from '@/app/_data/documents'
import { WelcomeTour } from '@/components/tour/welcome-tour'

/**
 * Reads the tour cookie and the pinned-doc cache (in parallel) to decide
 * whether to auto-open the tour and which step copy to show. Lives in its
 * own component so it can sit inside a Suspense boundary — `cookies()` is
 * dynamic and Cache Components requires it there.
 *
 * Returns null for repeat visitors; renders nothing on their request path.
 */
export async function WelcomeTourServer() {
  const [seen, doc] = await Promise.all([hasSeenTour(), getPinnedDocument()])
  if (seen) return null
  return <WelcomeTour autoOpen hasDocument={!!doc} docTitle={doc?.title} />
}
