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

export type ChangeRequestFilter = 'all' | 'open' | 'closed' | 'ai'

/**
 * The open change-request list is intentionally NOT wrapped in `use cache`
 * — PR status changes too often for stale-then-revalidate to feel right.
 * It streams in via a Suspense boundary so the static shell paints first.
 *
 * Filter + query come in via URL search params (dynamic), so only this
 * Suspense boundary re-renders when they change.
 *
 * Individual change requests and the commit history ARE cached; we
 * invalidate them precisely via `updateTag` after each mutation.
 */
export async function listChangeRequests(
  documentId: string,
  filter: ChangeRequestFilter = 'all',
  query = '',
): Promise<ChangeRequest[]> {
  const supabase = createServiceClient()
  let q = supabase
    .from('change_requests')
    .select('*, comments(*)')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (filter === 'open') {
    q = q.in('status', ['open', 'approved'])
  } else if (filter === 'closed') {
    q = q.in('status', ['merged', 'closed'])
  } else if (filter === 'ai') {
    q = q.not('ai_metadata', 'is', null)
  }

  if (query.trim()) {
    q = q.ilike('title', `%${query.trim()}%`)
  }

  const { data, error } = await q
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
