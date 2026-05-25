import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { tag } from '@/lib/cache-tags'
import type { Commit } from '@/lib/types'

/**
 * Append-only merge history for a document. Cached because it is grow-only;
 * a successful merge invalidates `commits:<docId>` via `updateTag`.
 */
export async function listCommits(documentId: string): Promise<Commit[]> {
  'use cache'
  cacheLife('hours')
  cacheTag(tag.commits(documentId))

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('commits')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[data] listCommits', error)
    throw error
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    documentId: row.document_id,
    changeRequestId: row.change_request_id,
    message: row.message,
    author: row.author,
    contentSnapshot: row.content_snapshot,
    createdAt: new Date(row.created_at),
  }))
}
