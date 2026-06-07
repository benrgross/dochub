import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

/**
 * Non-cookie-bound Supabase client used by cached read functions in
 * `app/_data/`. Required because `cookies()` is forbidden inside a
 * `use cache` scope (Cache Components dynamic-data rule). Mutations
 * continue to use the cookie-bound `createServerClient` from
 * `lib/supabase/server.ts`.
 */
export function createServiceClient() {
  const { url, anonKey } = getSupabaseConfig()
  return createClient(url, anonKey, { auth: { persistSession: false } })
}
