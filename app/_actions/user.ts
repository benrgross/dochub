'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { PERSONAS, USER_COOKIE, type Persona } from '@/lib/personas'

export async function setCurrentUser(formData: FormData): Promise<void> {
  const requested = String(formData.get('user') ?? '')
  const valid = (PERSONAS as readonly string[]).includes(requested)
  if (!valid) return
  const store = await cookies()
  store.set(USER_COOKIE, requested as Persona, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  revalidatePath('/', 'layout')
}
