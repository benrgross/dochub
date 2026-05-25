import 'server-only'
import { cookies } from 'next/headers'
import { DEFAULT_PERSONA, PERSONAS, USER_COOKIE, type Persona } from './personas'

/**
 * Lightweight "who is acting" identity for the v1 demo. Backed by a cookie
 * so changes survive refresh; switchable from the header persona menu.
 *
 * v2 plan: replace with Clerk session from the Marketplace integration.
 */
export async function getCurrentUser(): Promise<Persona> {
  const value = (await cookies()).get(USER_COOKIE)?.value
  if (value && (PERSONAS as readonly string[]).includes(value)) {
    return value as Persona
  }
  return DEFAULT_PERSONA
}

export { PERSONAS, USER_COOKIE, type Persona }
