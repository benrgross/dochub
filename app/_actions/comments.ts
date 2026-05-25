'use server'

import { z } from 'zod'
import { revalidatePath, updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { tag } from '@/lib/cache-tags'
import { actionError, type FormActionState } from './_helpers'

const Schema = z.object({
  changeRequestId: z.string().uuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(4000),
})

export async function addComment(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    const parsed = Schema.parse({
      changeRequestId: formData.get('changeRequestId'),
      content: formData.get('content'),
    })
    const author = await getCurrentUser()
    const supabase = await createClient()
    const { error } = await supabase.from('comments').insert({
      change_request_id: parsed.changeRequestId,
      author,
      content: parsed.content,
    })
    if (error) throw error

    updateTag(tag.changeRequest(parsed.changeRequestId))
    revalidatePath(`/changes/${parsed.changeRequestId}`)
    return { ok: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
    }
    return actionError(error, 'Failed to add comment')
  }
}
