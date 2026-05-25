import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Non-cookie-bound Supabase client used by cached read functions in
 * `app/_data/`. Required because `cookies()` is forbidden inside a
 * `use cache` scope (Cache Components dynamic-data rule).
 *
 * v1: uses the anon key — RLS is off and the data is public-by-design.
 * v2: swap to the service-role key (still RLS-bypassed, but moved to a
 *     dedicated env var so anon reads from the browser keep their RLS
 *     guarantees when we turn RLS on).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}
