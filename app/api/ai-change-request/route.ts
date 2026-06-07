import { z } from 'zod'
import { start } from 'workflow/api'
import { checkBotId } from 'botid/server'
import { aiChangeRequestWorkflow } from '@/app/workflows/ai-change-request'
import { isAiBranchEnabled, resolveAiModel } from '@/lib/flags'
import { DEFAULT_MODEL_ID, findModel, isValidModelId } from '@/lib/models'
import { getCurrentUser } from '@/lib/current-user'

/**
 * Kicks off the durable "AI Change Request" workflow. Unlike `/api/ai-edit`
 * (which streams an interactive proposal back to the browser), this returns
 * immediately with a `runId`; the workflow then runs the propose → review →
 * merge lifecycle durably in the background. Track it in the Vercel dashboard
 * under Observability → Workflows.
 */

const RequestSchema = z.object({
  documentId: z.string().uuid(),
  instruction: z.string().min(1, 'No instructions provided').max(4000),
  model: z.string().optional(),
})

export async function POST(req: Request) {
  // BotID (monitor-mode by default), mirroring the streaming endpoint.
  try {
    const verdict = await checkBotId()
    if ('isBot' in verdict && verdict.isBot && process.env.BOTID_ENFORCE === 'true') {
      return Response.json({ error: 'Automated access is not allowed.' }, { status: 403 })
    }
  } catch (error) {
    console.error('[botid] check failed — allowing request', error)
  }

  if (!(await isAiBranchEnabled())) {
    return Response.json({ error: 'AI Branch is disabled' }, { status: 503 })
  }

  let parsed: z.infer<typeof RequestSchema>
  try {
    parsed = RequestSchema.parse(await req.json())
  } catch (error) {
    return Response.json(
      { error: error instanceof z.ZodError ? error.issues[0]?.message : 'Bad request' },
      { status: 400 },
    )
  }

  // Same resolution order as /api/ai-edit: admin override → user pick → default.
  const adminOverride = await resolveAiModel()
  const userPick = isValidModelId(parsed.model) ? parsed.model : undefined
  const modelId = adminOverride !== DEFAULT_MODEL_ID ? adminOverride : (userPick ?? DEFAULT_MODEL_ID)
  const author = await getCurrentUser()

  const run = await start(aiChangeRequestWorkflow, [
    {
      documentId: parsed.documentId,
      instruction: parsed.instruction,
      modelId,
      modelProvider: findModel(modelId)?.provider,
      author,
    },
  ])

  return Response.json({ runId: run.runId, status: 'started' }, { status: 202 })
}
