import { redirect } from 'next/navigation'
import { DocumentView } from '@/components/document-view'
import { getPinnedDocument } from '@/app/_data/documents'

/**
 * Pinned-document view. The doc itself is cached (`use cache` + `cacheTag('document')`),
 * so this page is largely a CDN hit until a merge invalidates the tag via `updateTag`.
 */
export default async function DocumentPage() {
  const doc = await getPinnedDocument()
  if (!doc) redirect('/upload')

  return (
    <div className="h-full">
      <DocumentView document={doc} />
    </div>
  )
}
