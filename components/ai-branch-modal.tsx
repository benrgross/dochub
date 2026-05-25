'use client'

/**
 * STUB: full implementation lands in Phase 3.
 *
 * Phase 3 will replace this with a `useChat`-driven panel that:
 *   - Streams tokens from /api/ai-edit (Fluid Compute, Node runtime)
 *   - Renders tool-call cards as `proposeReplacement` / `proposeInsertion` arrive
 *   - Lets the user accept/reject individual tool calls
 *   - Opens a real PR via `createChangeRequest` Server Action (with ai_metadata)
 */

import { Button } from '@/components/ui/button'
import { Bot } from 'lucide-react'

export function AIBranchButton() {
  return (
    <Button disabled className="bg-purple-600 hover:bg-purple-700">
      <Bot className="w-4 h-4 mr-2" />
      AI Branch
      <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">coming</span>
    </Button>
  )
}
