import { Suspense } from 'react'
import { ListContent, normalizeFilter } from '../page'

interface PageProps {
  params: Promise<{ crId: string }>
  searchParams: Promise<{ filter?: string; q?: string }>
}

/**
 * @list slot when at /changes/[crId]. Same list as the index slot, but with
 * the selected PR highlighted. Sync wrapper + Suspense around the dynamic
 * read so PPR can stream the chrome before this resolves.
 */
export default function ListSlotWithSelection(props: PageProps) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Body {...props} />
    </Suspense>
  )
}

async function Body({ params, searchParams }: PageProps) {
  const [{ crId }, sp] = await Promise.all([params, searchParams])
  return (
    <ListContent filter={normalizeFilter(sp.filter)} query={sp.q ?? ''} selectedId={crId} />
  )
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
