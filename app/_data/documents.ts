import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { tag } from '@/lib/cache-tags'
import type { DocumentRow } from '@/lib/types'

/**
 * Returns the currently pinned source-of-truth document, or null if none is pinned.
 *
 * Cache strategy: `cacheLife('hours')` — the source doc changes only on merge,
 * and merges call `updateTag(tag.document(id))` so we get same-request freshness
 * via Cache Components.
 */
export async function getPinnedDocument(): Promise<DocumentRow | null> {
  'use cache'
  cacheLife('hours')
  cacheTag(tag.document())

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('pinned', true)
    .maybeSingle()

  if (error) {
    console.error('[data] getPinnedDocument', error)
    throw error
  }
  if (!data) return null

  return mapDocument(data)
}

export async function getDocumentById(id: string): Promise<DocumentRow | null> {
  'use cache'
  cacheLife('hours')
  cacheTag(tag.document(id))

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[data] getDocumentById', error)
    throw error
  }
  if (!data) return null
  return mapDocument(data)
}

function mapDocument(row: {
  id: string
  title: string
  content: string
  pinned: boolean
  created_at: string
  updated_at: string
}): DocumentRow {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    pinned: row.pinned,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}
