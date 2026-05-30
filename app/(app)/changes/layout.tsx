import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ChangesShell } from '@/components/chrome/changes-shell'
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

  // ChangesShell reads usePathname (request-dynamic), so it lives inside a
  // Suspense boundary per Cache Components. The fallback shows the default
  // both-panes layout so there's no blank flash before hydration.
  return (
    <Suspense
      fallback={
        <div className="h-full md:flex">
          <div className="h-full w-full md:w-80 md:shrink-0 border-r border-border bg-card overflow-hidden">
            {list}
          </div>
          <div className="hidden md:flex h-full flex-1 min-w-0 bg-background">{children}</div>
        </div>
      }
    >
      <ChangesShell list={list} detail={children} />
    </Suspense>
  )
}
