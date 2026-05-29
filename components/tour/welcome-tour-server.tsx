import { hasSeenTour } from '@/lib/tour'
import { getPinnedDocument } from '@/app/_data/documents'
import { WelcomeTour } from '@/components/tour/welcome-tour'

/**
 * Server-side wrapper that reads the cookie and decides whether to auto-open
 * the tour. Lives in its own component so it can sit inside a Suspense
 * boundary — `cookies()` is dynamic and Cache Components forces it there.
 *
 * Also reads the pinned-doc cache so the tour copy can adapt: visitors
 * who hit the app with a doc already pinned see "create a change request"
 * messaging; first-time visitors with no doc see "pin a source of truth."
 * `getPinnedDocument()` is `use cache`-tagged, so this is a CDN read on
 * repeat visits — no extra DB hit.
 *
 * Returns null (renders nothing) for repeat visitors; the static shell
 * paints from the CDN with zero tour overhead.
 */
export async function WelcomeTourServer() {
  const [seen, doc] = await Promise.all([hasSeenTour(), getPinnedDocument()])
  if (seen) return null
  return <WelcomeTour autoOpen hasDocument={!!doc} docTitle={doc?.title} />
}
