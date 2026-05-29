/**
 * Client-safe constants for the persona picker. Pure data — importable
 * from both Server Components (via `getCurrentUser`) and Client Components
 * (the picker dropdown).
 */
export const PERSONAS = [
  'Demo User',
  'Sarah (PM)',
  'Alex (Engineer)',
  'Jordan (Legal)',
  'Casey (Security)',
] as const

export type Persona = (typeof PERSONAS)[number]

export const USER_COOKIE = 'dochub_user'
export const DEFAULT_PERSONA: Persona = 'Demo User'
