/**
 * Client-side helpers for the durable "AI Change Request" workflow
 * (the headless counterpart to the live `/api/ai-edit` streaming flow).
 *
 *   queueAiChangeRequest → POST /api/ai-change-request        (start a run)
 *   resumeAiWorkflow      → POST /api/ai-change-request/resume (wake a paused run)
 *
 * Both are thin `fetch` wrappers used from Client Components. Keeping them
 * here avoids duplicating the endpoint/shape knowledge across the modal and
 * the change-request detail buttons.
 */

export type ResumeDecision = 'approved' | 'changes' | 'closed'

export type QueueResult =
  | { ok: true; runId: string }
  | { ok: false; error: string }

/**
 * Kicks off a durable workflow run for `documentId` + `instruction`. Returns
 * the `runId` so the caller can point the user at Vercel → Observability →
 * Workflows.
 */
export async function queueAiChangeRequest(input: {
  documentId: string
  instruction: string
  model?: string
}): Promise<QueueResult> {
  try {
    const res = await fetch('/api/ai-change-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = (await res.json().catch(() => null)) as
      | { runId?: string; error?: string }
      | null
    if (!res.ok || !data?.runId) {
      return { ok: false, error: data?.error ?? `Request failed (${res.status})` }
    }
    return { ok: true, runId: data.runId }
  } catch {
    return { ok: false, error: 'Network error — could not queue the durable edit.' }
  }
}

/**
 * Wakes a paused workflow run for `changeRequestId` with a review `decision`.
 *
 * Returns `true` when a run was actually resumed. A 409 (or any non-OK
 * response) means no workflow is awaiting review for this CR — e.g. a
 * manually-created CR — which callers should treat as a no-op and fall back
 * to the normal server-action behavior, NOT as an error.
 */
export async function resumeAiWorkflow(
  changeRequestId: string,
  decision: ResumeDecision,
  notes?: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/ai-change-request/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeRequestId, decision, notes }),
    })
    return res.ok
  } catch {
    // Network/other failure: don't block the existing server-action flow.
    return false
  }
}
