import 'server-only'

/**
 * Resolves which Supabase project the server talks to.
 *
 * Preview deployments must NOT read/write the production database. When we're
 * running on a Vercel **Preview** deployment (`VERCEL_ENV === 'preview'`) and
 * preview credentials are configured, we point at those instead; otherwise we
 * fall back to the default (production / local) credentials. Production and
 * local dev are unaffected — they never see the `PREVIEW_*` vars.
 *
 * Both Supabase clients — the cookie-bound `server.ts` and the cached-read
 * `service.ts` — resolve their URL/key through here so the choice lives in one
 * place. This is server-only: `VERCEL_ENV` and the `PREVIEW_*` vars are read at
 * runtime on the server (no `NEXT_PUBLIC_` inlining involved).
 *
 * To enable a preview database, set `PREVIEW_SUPABASE_URL` and
 * `PREVIEW_SUPABASE_ANON_KEY` in Vercel (scoped to Preview is fine, but not
 * required — they're only consulted when `VERCEL_ENV === 'preview'`).
 */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const isPreview = process.env.VERCEL_ENV === 'preview'

  const url =
    (isPreview ? process.env.PREVIEW_SUPABASE_URL : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    (isPreview ? process.env.PREVIEW_SUPABASE_ANON_KEY : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY (and optionally PREVIEW_SUPABASE_URL / ' +
        'PREVIEW_SUPABASE_ANON_KEY for preview deployments).',
    )
  }

  return { url, anonKey }
}
