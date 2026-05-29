import 'server-only'
import { cookies } from 'next/headers'
import { DEFAULT_PERSONA, PERSONAS, USER_COOKIE, type Persona } from './personas'

/**
 * Reads the active persona from the dochub_user cookie. Set by the header
 * persona picker via the setCurrentUser Server Action.
 */
export async function getCurrentUser(): Promise<Persona> {
  const value = (await cookies()).get(USER_COOKIE)?.value
  if (value && (PERSONAS as readonly string[]).includes(value)) {
    return value as Persona
  }
  return DEFAULT_PERSONA
}

export { PERSONAS, USER_COOKIE, type Persona }
