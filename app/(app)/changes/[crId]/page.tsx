import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChangeRequestDetail } from '@/components/change-request-detail'
import { getChangeRequest } from '@/app/_data/change-requests'
import { getCurrentUser } from '@/lib/current-user'

interface PageProps {
  params: Promise<{ crId: string }>
}

// UUID v4-ish guard: cheap regex that rejects the literal "[crId]" placeholder
// Next.js passes during prerender, but accepts any well-formed UUID at runtime.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Per-PR metadata for shareable links (Slack / Linear / email previews).
 * Reuses the cached `getChangeRequest` so no extra DB hit at runtime.
 *
 * Note: during static prerender Next invokes this with `crId === "[crId]"`
 * (the route placeholder). We return defaults in that case so the build
 * doesn't try to query Postgres with a literal placeholder.
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
  return <ChangeRequestDetail changeRequest={cr} currentUser={currentUser} />
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
