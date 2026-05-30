import { redirect } from 'next/navigation'
import { getPinnedDocument } from '@/app/_data/documents'

/**
 * Parallel routes: the sidebar (@list) stays mounted across PR navigation —
 * scroll position, filter selection, and search input all persist while
 * only the detail pane re-streams. This is a pure RSC payload swap with no
 * client roundtrip.
 */
export default async function ChangesLayout({
  children,
  list,
}: {
  children: React.ReactNode
  list: React.ReactNode
}) {
  const doc = await getPinnedDocument()
  if (!doc) redirect('/upload')

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* On phones the list sits on top in a capped, scrollable strip; at md+
          it becomes the fixed-width sidebar. */}
      <div className="w-full md:w-80 max-h-52 md:max-h-none shrink-0 border-b md:border-b-0 md:border-r border-border bg-card overflow-y-auto md:overflow-hidden">
        {list}
      </div>
      <div className="flex-1 min-h-0 min-w-0 bg-background">{children}</div>
    </div>
  )
}
