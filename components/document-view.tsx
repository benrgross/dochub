import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText } from 'lucide-react'
import type { DocumentRow } from '@/lib/types'
import { TimeAgo } from '@/components/time-ago'

interface DocumentViewProps {
  document: DocumentRow
}

/**
 * Renders the pinned source-of-truth document as styled prose. Pure
 * server component — `react-markdown` runs at render time, no client
 * JS needed for display.
 *
 * Styling uses @tailwindcss/typography (the `prose` classes) with a
 * dark-theme variant matched to the rest of the app. Wrapped in a paper-
 * like card with generous padding so it actually reads like a document
 * instead of a code dump.
 */
export function DocumentView({ document }: DocumentViewProps) {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Document header */}
        <header className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Source of truth</span>
            <span className="text-muted-foreground/50">·</span>
            <span>Last updated <TimeAgo date={document.updatedAt} /></span>
          </div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            {document.title}
          </h1>
        </header>

        {/* Document body */}
        <article
          className={[
            'prose prose-invert max-w-none',
            // tighter top spacing on headings
            'prose-headings:font-semibold prose-headings:tracking-tight',
            'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
            'prose-h1:mt-8 prose-h2:mt-6 prose-h3:mt-4',
            // paragraph and list density
            'prose-p:leading-7 prose-li:leading-7',
            // inline + block code
            'prose-code:bg-secondary/60 prose-code:text-foreground',
            'prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
            'prose-code:before:content-none prose-code:after:content-none',
            'prose-pre:bg-card prose-pre:border prose-pre:border-border',
            // links
            'prose-a:text-[oklch(0.65_0.15_145)] hover:prose-a:text-[oklch(0.75_0.15_145)]',
            // blockquotes
            'prose-blockquote:border-l-[oklch(0.65_0.15_145)]',
            'prose-blockquote:text-muted-foreground prose-blockquote:not-italic',
            // tables
            'prose-table:text-sm',
            'prose-th:bg-secondary/40 prose-th:px-3 prose-th:py-2',
            'prose-td:px-3 prose-td:py-2 prose-td:border-border',
            // hr separator
            'prose-hr:border-border',
            // image
            'prose-img:rounded-md prose-img:border prose-img:border-border',
          ].join(' ')}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {document.content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
