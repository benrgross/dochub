'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { TOUR_COOKIE } from '@/lib/tour'

/**
 * Mark the tour as seen so it doesn't auto-open on the next visit.
 * The "Tour" button in the footer can still replay it on demand.
 */
export async function dismissTour(): Promise<void> {
  const store = await cookies()
  store.set(TOUR_COOKIE, '1', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // one year
  })
  revalidatePath('/', 'layout')
}

/**
 * Reset the tour flag so it auto-opens on next page load. Useful for
 * the "Replay tour" affordance.
 */
export async function replayTour(): Promise<void> {
  const store = await cookies()
  store.delete(TOUR_COOKIE)
  revalidatePath('/', 'layout')
}
