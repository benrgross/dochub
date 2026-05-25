import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ChangeRequestList } from '@/components/change-request-list'
import { ChangeRequestFilterBar } from '@/components/change-request-filter'
import {
  listChangeRequests,
  type ChangeRequestFilter,
} from '@/app/_data/change-requests'
import { getPinnedDocument } from '@/app/_data/documents'

interface PageProps {
  searchParams: Promise<{ filter?: string; q?: string }>
}

/**
 * Default @list slot at /changes. Sync wrapper + Suspended async body —
 * the searchParams read is dynamic so Cache Components requires it to
 * live inside a Suspense boundary.
 */
export default function ListSlot(props: PageProps) {
  return (
    <Suspense fallback={<Skeleton />}>
      <ListSlotBody {...props} />
    </Suspense>
  )
}

async function ListSlotBody({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <ListContent filter={normalizeFilter(params.filter)} query={params.q ?? ''} />
  )
}

export async function ListContent({
  filter,
  query,
  selectedId,
}: {
  filter: ChangeRequestFilter
  query: string
  selectedId?: string
}) {
  const doc = await getPinnedDocument()
  if (!doc) redirect('/upload')

  return (
    <div className="h-full flex flex-col">
      <ChangeRequestFilterBar filter={filter} query={query} />
      <Suspense fallback={<Skeleton />}>
        <List
          documentId={doc.id}
          filter={filter}
          query={query}
          selectedId={selectedId}
        />
      </Suspense>
    </div>
  )
}

async function List({
  documentId,
  filter,
  query,
  selectedId,
}: {
  documentId: string
  filter: ChangeRequestFilter
  query: string
  selectedId?: string
}) {
  const changeRequests = await listChangeRequests(documentId, filter, query)
  return <ChangeRequestList changeRequests={changeRequests} selectedId={selectedId} />
}

function Skeleton() {
  return (
    <div className="p-2 space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 bg-secondary/30 rounded-md animate-pulse" />
      ))}
    </div>
  )
}

export function normalizeFilter(raw: string | undefined): ChangeRequestFilter {
  if (raw === 'open' || raw === 'closed' || raw === 'ai') return raw
  return 'all'
}
