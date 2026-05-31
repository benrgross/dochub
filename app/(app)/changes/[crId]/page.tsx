import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { ChangeRequestDetail } from '@/components/change-request-detail'
import { getChangeRequest } from '@/app/_data/change-requests'
import { ensureChangeRequestSummary } from '@/app/_data/cr-summary'
import { getCurrentUser } from '@/lib/current-user'

interface PageProps {
  params: Promise<{ crId: string }>
}

// UUID v4-ish guard: cheap regex that rejects the literal "[crId]" placeholder
// Next.js passes during prerender, but accepts any well-formed UUID at runtime.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Per-PR metadata for shareable links. During static prerender Next invokes
 * this with `crId === "[crId]"` (the route placeholder), so we return
 * defaults when the id isn't a real UUID rather than querying Postgres with
 * a literal placeholder.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { crId } = await params
  if (!UUID_RE.test(crId)) {
    return { title: 'Change request · DocHub' }
  }
  const cr = await getChangeRequest(crId)
  if (!cr) return { title: 'Change request not found' }

  const status = cr.status[0].toUpperCase() + cr.status.slice(1)
  const ai = cr.aiMetadata ? ' · AI-authored' : ''
  return {
    title: `${cr.title} · ${status} · DocHub`,
    description: cr.description || `${status} change request by ${cr.author}${ai}.`,
    openGraph: {
      title: cr.title,
      description: cr.description || `${status} change request by ${cr.author}${ai}.`,
      type: 'article',
    },
  }
}

/**
 * Cache Components require dynamic data (`cookies()`, `headers()`, `searchParams`)
 * to be read inside a Suspense boundary so PPR can stream the static shell
 * first. The page exports a sync wrapper; the actual fetch lives in `<Detail/>`.
 */
export default function ChangeRequestPage(props: PageProps) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail {...props} />
    </Suspense>
  )
}

async function Detail({ params }: PageProps) {
  const { crId } = await params
  const [cr, currentUser] = await Promise.all([getChangeRequest(crId), getCurrentUser()])
  if (!cr) notFound()
  return (
    <ChangeRequestDetail
      changeRequest={cr}
      currentUser={currentUser}
      summarySlot={
        // Only generate an AI summary as the description when the CR is
        // AI-authored AND has no description of its own. Older records that
        // already carry a description keep theirs untouched.
        cr.aiMetadata && !cr.description?.trim() ? (
          <Suspense fallback={<SummarySkeleton />}>
            <PrSummary crId={cr.id} />
          </Suspense>
        ) : null
      }
    />
  )
}

/**
 * AI-generated description for an AI-authored change request that has none.
 * Generated once and cached in the DB by `ensureChangeRequestSummary`, then
 * shown in the description slot, styled like a normal description. Its own
 * Suspense boundary streams it in while the diff and comments stay interactive.
 */
async function PrSummary({ crId }: { crId: string }) {
  const summary = await ensureChangeRequestSummary(crId)
  if (!summary) return null
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        Description · AI-generated
      </div>
      <p className="text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md whitespace-pre-wrap leading-6 max-h-40 overflow-y-auto custom-scrollbar">
        {summary}
      </p>
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-400" />
        Generating description…
      </div>
      <div className="bg-secondary/30 p-3 rounded-md space-y-1.5">
        <div className="h-3 w-full bg-secondary/50 rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-secondary/50 rounded animate-pulse" />
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="h-full p-4 space-y-3">
      <div className="h-6 w-2/3 bg-secondary/50 rounded animate-pulse" />
      <div className="h-4 w-1/3 bg-secondary/40 rounded animate-pulse" />
      <div className="h-72 bg-secondary/30 rounded mt-4 animate-pulse" />
    </div>
  )
}
