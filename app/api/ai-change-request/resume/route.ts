import { z } from 'zod'
import { reviewHook } from '@/app/workflows/ai-change-request'
import { getCurrentUser } from '@/lib/current-user'

/**
 * Resumes a paused AI Change Request workflow when a human reviews it. The
 * workflow is waiting on `reviewHook` keyed by the change request id; sending
 * the decision here wakes it to merge, regenerate, or close — no polling, no
 * queue. Wire your Approve / Request-changes / Close buttons to POST here.
 */

const ResumeSchema = z.object({
  changeRequestId: z.string().uuid(),
  decision: z.enum(['approved', 'changes', 'closed']),
  notes: z.string().max(2000).optional(),
})

export async function POST(req: Request) {
  let parsed: z.infer<typeof ResumeSchema>
  try {
    parsed = ResumeSchema.parse(await req.json())
  } catch (error) {
    return Response.json(
      { error: error instanceof z.ZodError ? error.issues[0]?.message : 'Bad request' },
      { status: 400 },
    )
  }

  const approver = await getCurrentUser()

  const resumed = await reviewHook.resume(parsed.changeRequestId, {
    decision: parsed.decision,
    approver,
    notes: parsed.notes,
  })

  // `resume` returns null when no run is waiting on that token (already
  // resolved, merged, or never started a workflow).
  if (resumed == null) {
    return Response.json(
      { error: 'No workflow is awaiting review for that change request.' },
      { status: 409 },
    )
  }

  return Response.json({ ok: true, decision: parsed.decision })
}
