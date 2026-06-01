import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIBranchTrigger } from '@/components/ai-branch-trigger'
import { isAiBranchEnabled } from '@/lib/flags'
import type { DocumentRow } from '@/lib/types'

/**
 * Gates the AI Branch trigger on the Edge Config kill switch.
 *
 * When `aiBranchEnabled` is off we render a disabled, explained button
 * instead of the interactive trigger — so a user never opens the modal and
 * hits a 503. The route handler still enforces the switch independently
 * (defense in depth); this is purely the graceful client-facing experience.
 *
 * Reads Edge Config (request-dynamic), so the layout wraps this in a
 * Suspense boundary and the static shell paints first.
 */
export async function AIBranchSlot({ document }: { document: DocumentRow }) {
  const enabled = await isAiBranchEnabled()

  if (!enabled) {
    return (
      <Button
        disabled
        aria-label="AI Branch temporarily unavailable"
        title="AI Branch is temporarily unavailable"
        className="bg-purple-600/40 cursor-not-allowed"
      >
        <Bot className="w-4 h-4 sm:mr-2" />
        <span className="hidden sm:inline">AI Branch</span>
      </Button>
    )
  }

  return <AIBranchTrigger document={document} />
}

/** Matches the trigger's footprint so there's no layout shift while the flag resolves. */
export function AIBranchSlotSkeleton() {
  return (
    <div className="h-9 w-9 sm:w-28 rounded-md bg-purple-600/30 animate-pulse" />
  )
}
