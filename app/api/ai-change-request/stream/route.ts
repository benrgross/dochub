import { getRun } from 'workflow/api'

/**
 * Live progress feed for a durable AI Change Request run. The workflow writes
 * coarse `ProgressEvent`s (load → generate → propose → persist) to its run
 * stream under the `progress` namespace; this route reads them back out with
 * `getRun(runId).getReadable(...)` and pipes them to the browser as
 * newline-delimited JSON.
 *
 * The underlying workflow stream is reconnectable by chunk index, so a dropped
 * connection doesn't lose the run — the edit keeps running durably regardless
 * of whether anyone is watching. We just need enough headroom to stay open
 * until the `persisted` event (generation can take a couple of minutes).
 */
export const maxDuration = 300

export async function GET(req: Request) {
  const runId = new URL(req.url).searchParams.get('runId')
  if (!runId) {
    return new Response('Missing runId', { status: 400 })
  }

  let readable: ReadableStream<unknown>
  try {
    readable = getRun(runId).getReadable({ namespace: 'progress' })
  } catch {
    return new Response('Run not found', { status: 404 })
  }

  // Chunks come back as the strings the workflow wrote; encode to bytes so the
  // platform can stream them. (Tolerate Uint8Array too, just in case.)
  const encoder = new TextEncoder()
  const bytes = readable.pipeThrough(
    new TransformStream<unknown, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : (chunk as Uint8Array),
        )
      },
    }),
  )

  return new Response(bytes, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
    },
  })
}
