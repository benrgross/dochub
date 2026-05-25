'use client'

import { useDocHubStore } from '@/lib/store'
import { formatDistanceToNow, format } from 'date-fns'
import { GitCommit, FileText } from 'lucide-react'

export function CommitHistory() {
  const { commits, document } = useDocHubStore()

  const reversedCommits = [...commits].reverse()

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Commit History</h2>
        <p className="text-xs text-muted-foreground mt-1">{commits.length} commits</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

          {/* Current state */}
          <div className="relative flex gap-4 pb-6">
            <div className="relative z-10 w-6 h-6 rounded-full bg-[oklch(0.65_0.15_145)] flex items-center justify-center">
              <FileText className="w-3 h-3 text-[oklch(0.12_0.01_240)]" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm font-medium text-foreground">Current Version</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Last updated {formatDistanceToNow(document.updatedAt, { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Commits */}
          {reversedCommits.map((commit, index) => (
            <div key={commit.id} className="relative flex gap-4 pb-6">
              <div className="relative z-10 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                <GitCommit className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="text-sm font-medium text-foreground">{commit.message}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{commit.author}</span>
                  <span>•</span>
                  <span>{format(commit.createdAt, 'MMM d, yyyy')}</span>
                  <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                    {commit.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
