'use client'

import { useDocHubStore } from '@/lib/store'
import { ChangeRequest } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { GitPullRequest, GitMerge, X, MessageSquare, CheckCircle2 } from 'lucide-react'

export function ChangeRequestList() {
  const { changeRequests, selectChangeRequest, selectedChangeRequest } = useDocHubStore()

  const openRequests = changeRequests.filter((cr) => cr.status === 'open' || cr.status === 'approved')
  const closedRequests = changeRequests.filter((cr) => cr.status === 'merged' || cr.status === 'closed')

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Change Requests</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {openRequests.length} open, {closedRequests.length} closed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {openRequests.length > 0 && (
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Open</div>
            {openRequests.map((cr) => (
              <ChangeRequestItem
                key={cr.id}
                cr={cr}
                isSelected={selectedChangeRequest?.id === cr.id}
                onClick={() => selectChangeRequest(cr)}
              />
            ))}
          </div>
        )}

        {closedRequests.length > 0 && (
          <div className="p-2 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Closed</div>
            {closedRequests.map((cr) => (
              <ChangeRequestItem
                key={cr.id}
                cr={cr}
                isSelected={selectedChangeRequest?.id === cr.id}
                onClick={() => selectChangeRequest(cr)}
              />
            ))}
          </div>
        )}

        {changeRequests.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No change requests yet
          </div>
        )}
      </div>
    </div>
  )
}

function ChangeRequestItem({
  cr,
  isSelected,
  onClick,
}: {
  cr: ChangeRequest
  isSelected: boolean
  onClick: () => void
}) {
  const statusIcon = {
    open: <GitPullRequest className="w-4 h-4 text-[oklch(0.65_0.15_145)]" />,
    approved: <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.15_200)]" />,
    merged: <GitMerge className="w-4 h-4 text-[oklch(0.65_0.18_280)]" />,
    closed: <X className="w-4 h-4 text-[oklch(0.55_0.22_25)]" />,
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-secondary/50 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{statusIcon[cr.status]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{cr.title}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{cr.author}</span>
            <span>•</span>
            <span>{formatDistanceToNow(cr.createdAt, { addSuffix: true })}</span>
            {cr.comments.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {cr.comments.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
