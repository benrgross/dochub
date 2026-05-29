import 'server-only'
import { cookies } from 'next/headers'

/**
 * Cookie-gated first-visit tour.
 *
 * Why a cookie and not a header? Cookies are the right primitive for
 * "remember this preference across visits without a backend table."
 * Reading cookies is request-dynamic in Next 16 — Cache Components
 * forces the call site into a Suspense boundary so the static shell
 * still paints from the CDN.
 */

export const TOUR_COOKIE = 'dochub_tour_seen'

export async function hasSeenTour(): Promise<boolean> {
  return (await cookies()).get(TOUR_COOKIE)?.value === '1'
}
