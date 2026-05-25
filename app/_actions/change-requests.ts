'use server'

import { z } from 'zod'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { tag } from '@/lib/cache-tags'
import { actionError, type FormActionState } from './_helpers'
import type { AiMetadata } from '@/lib/types'

const CreateSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  proposedContent: z.string().min(1).max(200_000),
  originalContent: z.string().min(0).max(200_000),
  aiMetadata: z.unknown().optional(),
})

export async function createChangeRequest(input: {
  documentId: string
  title: string
  description?: string
  proposedContent: string
  originalContent: string
  aiMetadata?: AiMetadata
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const parsed = CreateSchema.parse(input)
    if (parsed.proposedContent === parsed.originalContent) {
      return { ok: false, error: 'Proposed content is identical to the source' }
    }

    const author = await getCurrentUser()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('change_requests')
      .insert({
        document_id: parsed.documentId,
        title: parsed.title,
        description: parsed.description,
        author,
        original_content: parsed.originalContent,
        proposed_content: parsed.proposedContent,
        ai_metadata: parsed.aiMetadata ?? null,
      })
      .select('id')
      .single()
    if (error) throw error

    revalidatePath('/changes')
    return { ok: true, id: data.id }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
    }
    const result = actionError(error, 'Failed to create change request')
    return result as { ok: false; error: string }
  }
}

/**
 * Form action wrapper for the "New Change Request" modal.
 */
export async function createChangeRequestForm(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const result = await createChangeRequest({
    documentId: String(formData.get('documentId') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    proposedContent: String(formData.get('proposedContent') ?? ''),
    originalContent: String(formData.get('originalContent') ?? ''),
  })
  if (!result.ok) return result
  redirect(`/changes/${result.id}`)
}

const IdSchema = z.object({ id: z.string().uuid() })

export async function approveChangeRequest(input: { id: string }): Promise<FormActionState> {
  try {
    const { id } = IdSchema.parse(input)
    const approver = await getCurrentUser()
    const supabase = await createClient()
    const { error } = await supabase
      .from('change_requests')
      .update({ status: 'approved', approved_by: approver, approved_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    updateTag(tag.changeRequest(id))
    revalidatePath('/changes')
    return { ok: true }
  } catch (error) {
    return actionError(error, 'Failed to approve')
  }
}

export async function closeChangeRequest(input: { id: string }): Promise<FormActionState> {
  try {
    const { id } = IdSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase
      .from('change_requests')
      .update({ status: 'closed' })
      .eq('id', id)
    if (error) throw error
    updateTag(tag.changeRequest(id))
    revalidatePath('/changes')
    return { ok: true }
  } catch (error) {
    return actionError(error, 'Failed to close')
  }
}

/**
 * Merge: update the source doc, append a commit, mark CR merged.
 * Note: this is not a DB transaction. For the demo it's acceptable; v2 would
 * move this into a Postgres function or use Supabase's rpc.
 *
 * Invalidates: document (so the doc page sees new content this request),
 * commits (so history updates), the CR itself.
 */
export async function mergeChangeRequest(input: { id: string }): Promise<FormActionState> {
  try {
    const { id } = IdSchema.parse(input)
    const author = await getCurrentUser()
    const supabase = await createClient()

    const { data: cr, error: fetchErr } = await supabase
      .from('change_requests')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    if (cr.status === 'merged') return { ok: false, error: 'Already merged' }

    const { error: docErr } = await supabase
      .from('documents')
      .update({ content: cr.proposed_content })
      .eq('id', cr.document_id)
    if (docErr) throw docErr

    const { error: crErr } = await supabase
      .from('change_requests')
      .update({ status: 'merged' })
      .eq('id', id)
    if (crErr) throw crErr

    const { error: commitErr } = await supabase.from('commits').insert({
      document_id: cr.document_id,
      change_request_id: id,
      message: cr.title,
      author,
      content_snapshot: cr.proposed_content,
    })
    if (commitErr) throw commitErr

    updateTag(tag.document())
    updateTag(tag.document(cr.document_id))
    updateTag(tag.commits(cr.document_id))
    updateTag(tag.changeRequest(id))
    revalidatePath('/document')
    revalidatePath('/changes')
    revalidatePath('/history')
    return { ok: true }
  } catch (error) {
    return actionError(error, 'Failed to merge')
  }
}
