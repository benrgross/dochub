'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentRow } from '@/lib/types'

// Code-split the AI modal: it pulls in @ai-sdk/react (useChat), the streaming
// client, and the diff engine. Loading it on demand keeps that weight out of
// the initial bundle on every page where the header trigger appears.
const AIBranchModal = dynamic(
  () => import('@/components/ai-branch-modal').then((m) => m.AIBranchModal),
  { ssr: false },
)

interface AIBranchTriggerProps {
  document: DocumentRow
}

export function AIBranchTrigger({ document }: AIBranchTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="bg-purple-600 hover:bg-purple-700">
        <Bot className="w-4 h-4 mr-2" />
        AI Branch
      </Button>
      {isOpen && (
        <AIBranchModal document={document} isOpen onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}
