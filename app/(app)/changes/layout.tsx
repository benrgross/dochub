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

  return <ChangesShell list={list} detail={children} />
}
