import 'server-only'

export type ActionState =
  | { ok: true; message?: string; data?: unknown }
  | { ok: false; error: string }

export type FormActionState = ActionState | null

/**
 * Common shape for Server Actions invoked from forms.
 * Lets us return validation errors without throwing — the form re-renders
 * with the message via `useActionState`.
 */
export function actionError(error: unknown, fallback: string): ActionState {
  if (error instanceof Error) {
    console.error('[action]', error)
    return { ok: false, error: error.message || fallback }
  }
  console.error('[action]', error)
  return { ok: false, error: fallback }
}
