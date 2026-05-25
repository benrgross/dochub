'use client'

import { useDocHubStore } from '@/lib/store'

export function DocumentView() {
  const { document } = useDocHubStore()

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Master Document</h2>
        <p className="text-xs text-muted-foreground mt-1">{document.name}</p>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        <div className="font-mono text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
          {document.content}
        </div>
      </div>
    </div>
  )
}
