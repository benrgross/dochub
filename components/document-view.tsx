import type { DocumentRow } from '@/lib/types'

interface DocumentViewProps {
  document: DocumentRow
}

/**
 * Pure presentational; renders the pinned document content.
 * Server Component — no client interactivity needed.
 */
export function DocumentView({ document }: DocumentViewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Source of Truth</h2>
        <p className="text-xs text-muted-foreground mt-1">{document.title}</p>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        <div className="font-mono text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
          {document.content}
        </div>
      </div>
    </div>
  )
}
