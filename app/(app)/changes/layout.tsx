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
    <div className="h-full flex">
      <div className="w-80 border-r border-border bg-card flex-shrink-0">{list}</div>
      <div className="flex-1 bg-background min-w-0">{children}</div>
    </div>
  )
}
