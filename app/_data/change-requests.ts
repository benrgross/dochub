import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { tag } from '@/lib/cache-tags'
import type {
  AiMetadata,
  ChangeRequest,
  ChangeRequestStatus,
  Comment,
} from '@/lib/types'

/**
 * NOTE: We intentionally do NOT wrap the open change-request *list* in `use cache`
 * because the demo wants near-real-time PR status. It streams in via Suspense
 * for fast TTFB while the static shell paints from the CDN.
 *
 * Individual change requests (and the history list) ARE cached, because they
 * change less often and we invalidate them precisely via `updateTag`.
 */
export async function listChangeRequests(documentId: string): Promise<ChangeRequest[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('change_requests')
    .select('*, comments(*)')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[data] listChangeRequests', error)
    throw error
  }

  return (data ?? []).map(mapChangeRequest)
}

export async function getChangeRequest(id: string): Promise<ChangeRequest | null> {
  'use cache'
  cacheLife('minutes')
  cacheTag(tag.changeRequest(id))

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('change_requests')
    .select('*, comments(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[data] getChangeRequest', error)
    throw error
  }
  if (!data) return null
  return mapChangeRequest(data)
}

function mapChangeRequest(row: {
  id: string
  document_id: string
  title: string
  description: string | null
  author: string
  status: string
  original_content: string
  proposed_content: string
  ai_metadata: AiMetadata | null
  created_at: string
  approved_by: string | null
  approved_at: string | null
  comments?: Array<{
    id: string
    change_request_id: string
    author: string
    content: string
    created_at: string
  }>
}): ChangeRequest {
  const comments: Comment[] = (row.comments ?? [])
    .map((c) => ({
      id: c.id,
      changeRequestId: c.change_request_id,
      author: c.author,
      content: c.content,
      createdAt: new Date(c.created_at),
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    description: row.description ?? '',
    author: row.author,
    status: row.status as ChangeRequestStatus,
    originalContent: row.original_content,
    proposedContent: row.proposed_content,
    aiMetadata: row.ai_metadata,
    createdAt: new Date(row.created_at),
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    comments,
  }
}
