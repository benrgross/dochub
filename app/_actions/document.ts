'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tag } from '@/lib/cache-tags'
import { actionError, type FormActionState } from './_helpers'

const PinSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  content: z.string().min(1, 'Document content required').max(200_000),
})

/**
 * Upload + pin a markdown document as the source of truth.
 *
 * The schema enforces exactly one pinned document via a partial unique index,
 * so we unpin existing rows first inside a transaction-style sequence.
 */
export async function pinDocument(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    const parsed = PinSchema.parse({
      title: formData.get('title'),
      content: formData.get('content'),
    })

    const supabase = await createClient()

    const { error: unpinErr } = await supabase
      .from('documents')
      .update({ pinned: false })
      .eq('pinned', true)
    if (unpinErr) throw unpinErr

    const { data, error } = await supabase
      .from('documents')
      .insert({ title: parsed.title, content: parsed.content, pinned: true })
      .select('id')
      .single()
    if (error) throw error

    updateTag(tag.document())
    updateTag(tag.document(data.id))
    updateTag(tag.commits(data.id))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
    }
    return actionError(error, 'Failed to pin document')
  }

  redirect('/document')
}
