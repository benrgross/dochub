import { redirect } from 'next/navigation'
import { getPinnedDocument } from '@/app/_data/documents'

/**
 * Server Component entry point. Sends users straight to the source-of-truth
 * document, or to the upload flow if no doc is pinned yet.
 */
export default async function RootPage() {
  const doc = await getPinnedDocument()
  redirect(doc ? '/document' : '/upload')
}
