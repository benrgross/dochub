import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ChangeRequestList } from '@/components/change-request-list'
import { listChangeRequests } from '@/app/_data/change-requests'
import { getPinnedDocument } from '@/app/_data/documents'

/**
 * Sidebar (PR list) + child detail. The sidebar streams in via Suspense because
 * the open-PR list is intentionally dynamic — we don't `use cache` it; the static
 * shell and the rest of the chrome render instantly from the CDN/RSC payload.
 */
export default async function ChangesLayout({ children }: { children: React.ReactNode }) {
  const doc = await getPinnedDocument()
  if (!doc) redirect('/upload')

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-border bg-card flex-shrink-0">
        <Suspense fallback={<ListSkeleton />}>
          <List documentId={doc.id} />
        </Suspense>
      </div>
      <div className="flex-1 bg-background min-w-0">{children}</div>
    </div>
  )
}

async function List({ documentId }: { documentId: string }) {
  const changeRequests = await listChangeRequests(documentId)
  return <ChangeRequestList changeRequests={changeRequests} />
}

function ListSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="h-4 w-32 bg-secondary/60 rounded animate-pulse" />
        <div className="h-3 w-24 bg-secondary/40 rounded mt-2 animate-pulse" />
      </div>
      <div className="p-2 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 bg-secondary/30 rounded-md animate-pulse" />
        ))}
      </div>
    </div>
  )
}
