'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIBranchModal } from '@/components/ai-branch-modal'
import type { DocumentRow } from '@/lib/types'

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
      <AIBranchModal document={document} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
