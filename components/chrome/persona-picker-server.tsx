import { getCurrentUser } from '@/lib/current-user'
import { PersonaPicker } from '@/components/chrome/persona-picker'

/**
 * Server-side wrapper that reads the cookie-backed persona and hands it
 * to the client picker. Lives in its own component so it can be wrapped
 * in <Suspense> at the layout level — cookies() is request-dynamic and
 * Cache Components requires it inside a Suspense for PPR to work.
 */
export async function PersonaPickerServer() {
  const user = await getCurrentUser()
  return <PersonaPicker current={user} />
}

export function PersonaPickerSkeleton() {
  return (
    <div className="h-7 w-32 rounded-md bg-secondary/50 animate-pulse" aria-hidden />
  )
}
