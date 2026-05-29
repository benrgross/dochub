import 'server-only'
import { cookies } from 'next/headers'

/**
 * Cookie-gated first-visit tour. Reading the cookie is request-dynamic,
 * so callers wrap it in a Suspense boundary.
 */

export const TOUR_COOKIE = 'dochub_tour_seen'

export async function hasSeenTour(): Promise<boolean> {
  return (await cookies()).get(TOUR_COOKIE)?.value === '1'
}
