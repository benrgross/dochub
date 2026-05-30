import { z } from 'zod'
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from 'ai'
import { checkBotId } from 'botid/server'
import { isAiBranchEnabled, resolveAiModel } from '@/lib/flags'
import { DEFAULT_MODEL_ID, isValidModelId } from '@/lib/models'

/**
 * Streamed AI proposal endpoint. Uses AI SDK 6 streamText with two tools
 * (proposeReplacement, proposeInsertion) routed through Vercel AI Gateway
 * via the plain provider/model string.
 */

// Cache Components disallows explicit `runtime` segment config — Node is
// the default for Vercel Functions. We keep maxDuration so streamed
// responses have room to finish.
export const maxDuration = 60

const RequestSchema = z.object({
  messages: z.array(z.any()).min(1, 'No instructions provided'),
  document: z.object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string().max(200_000),
  }),
  // Optional user-selected model. Server-side allowlist enforced below;
  // the Edge Config admin override (resolveAiModel) still wins if set.
  model: z.string().optional(),
})

export async function POST(req: Request) {
  // BotID: invisible bot detection (no CAPTCHA). Blocks scripted abuse of
  // this public, cost-bearing endpoint. Fails OPEN on any error so a BotID
  // misconfiguration can never lock out real users.
  try {
    const verdict = await checkBotId()
    if ('isBot' in verdict && verdict.isBot) {
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

  const { messages, document, model: requestedModel } = parsed

  // The user's most recent text message is the instructions. Pulling it
  // from the message stream avoids a duplicate field and stale-closure
  // bugs when the body callback fires before the next render.
  const instructions = extractLatestUserText(messages as UIMessage[])
  if (!instructions) {
    return Response.json({ error: 'No instructions provided' }, { status: 400 })
  }

  // Resolution order:
  //   1. Edge Config admin override (resolveAiModel) — wins if not 'auto'
  //   2. User-selected model from the picker (allowlisted via isValidModelId)
  //   3. Default Claude
  const adminOverride = await resolveAiModel()
  const userPick = isValidModelId(requestedModel) ? requestedModel : undefined
  const model = adminOverride !== DEFAULT_MODEL_ID ? adminOverride : (userPick ?? DEFAULT_MODEL_ID)

  const result = streamText({
    model,
    stopWhen: stepCountIs(8),
    // Usage telemetry: fires after the stream completes, off the response
    // path. Lands in Runtime Logs for per-feature cost attribution.
    onFinish: ({ usage, finishReason }) => {
      console.log(
        JSON.stringify({
          event: 'ai_branch_generated',
          model,
          finishReason,
          usage,
          at: new Date().toISOString(),
        }),
      )
    },
    system: `You are a meticulous document editor. The user has a source-of-truth markdown document titled "${document.title}" and a set of edit instructions. Your job is to propose targeted edits to that document by emitting tool calls. Never rewrite the document wholesale.

Rules:
- Always propose at least one concrete edit using the tools. This is a one-shot flow — the user cannot reply, so NEVER ask clarifying questions or request more information.
- If the instruction is vague or open-ended, make reasonable best-effort improvements (clarity, concision, grammar, structure, impact) and state your interpretation in the summary.
- Use the proposeReplacement tool when you want to change an existing substring. The "find" value must match the source document exactly.
- Use the proposeInsertion tool when you want to add new content after a heading.
- Each tool call must include a one-sentence rationale that explains why the edit improves the document.
- Prefer many small, surgical edits over one giant rewrite.
- Do NOT narrate your process, retries, or reasoning in the visible text. No "let me look at...", no step-by-step thinking.
- After all tool calls, output exactly one or two plain sentences summarizing the changes overall — no preamble, no markdown, no bullet list, no per-edit breakdown.

The current document is between the <doc> tags:
<doc>
${document.content}
</doc>

The user's instructions are: ${instructions}`,
    messages: await convertToModelMessages(messages as UIMessage[]),
    tools: {
      proposeReplacement: {
        description:
          'Replace an exact substring of the document with new content. "find" must appear in the document exactly once.',
        inputSchema: z.object({
          find: z.string().min(1).describe('Exact substring to replace.'),
          replace: z.string().describe('The replacement content.'),
          rationale: z.string().describe('Why this change improves the document.'),
        }),
        execute: async ({
          find,
          replace,
          rationale,
        }: {
          find: string
          replace: string
          rationale: string
        }) => {
          const occurrences = countOccurrences(document.content, find)
          if (occurrences === 0) {
            return {
              ok: false as const,
              reason: '"find" did not match the document. Re-read the doc and try again.',
            }
          }
          if (occurrences > 1) {
            return {
              ok: false as const,
              reason: `"find" matched ${occurrences} times — narrow it down with more surrounding context.`,
            }
          }
          return { ok: true as const, find, replace, rationale }
        },
      },
      proposeInsertion: {
        description:
          'Insert new content immediately after a specific heading. The heading text must appear in the document.',
        inputSchema: z.object({
          afterHeading: z
            .string()
            .min(1)
            .describe('The heading line to insert content after (include the leading # marks).'),
          content: z.string().describe('The content to insert below the heading.'),
          rationale: z.string().describe('Why this addition improves the document.'),
        }),
        execute: async ({
          afterHeading,
          content,
          rationale,
        }: {
          afterHeading: string
          content: string
          rationale: string
        }) => {
          if (!document.content.includes(afterHeading)) {
            return {
              ok: false as const,
              reason: `Heading "${afterHeading}" not found in the document.`,
            }
          }
          return { ok: true as const, afterHeading, content, rationale }
        },
      },
    },
  })

  return result.toUIMessageStreamResponse()
}

function extractLatestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    const text = m.parts
      ?.filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('\n')
      .trim()
    if (text) return text
  }
  return ''
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count += 1
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}
