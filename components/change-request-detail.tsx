'use client'

import { useState, useOptimistic, useTransition, useActionState, startTransition } from 'react'
import { DiffViewer } from './diff-viewer'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import {
  GitMerge,
  X,
  MessageSquare,
  ChevronDown,
  Send,
  SplitSquareVertical,
  AlignJustify,
  CheckCircle2,
  Clock,
  Bot,
  Loader2,
} from 'lucide-react'
import type { ChangeRequest, Comment } from '@/lib/types'
import {
  approveChangeRequest,
  closeChangeRequest,
  mergeChangeRequest,
} from '@/app/_actions/change-requests'
import { addComment } from '@/app/_actions/comments'
import { type FormActionState } from '@/app/_actions/_helpers'
import { useDraftStorage } from '@/hooks/use-draft-storage'

interface ChangeRequestDetailProps {
  changeRequest: ChangeRequest
  currentUser: string
}

export function ChangeRequestDetail({ changeRequest, currentUser }: ChangeRequestDetailProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified')
  const [showDescription, setShowDescription] = useState(true)
  const [isPending, startPendingTransition] = useTransition()

  const [optimisticComments, addOptimisticComment] = useOptimistic(
    changeRequest.comments,
    (state: Comment[], next: Comment) => [...state, next],
  )

  const isOpen = changeRequest.status === 'open'
  const isApproved = changeRequest.status === 'approved'
  const canActOn = isOpen || isApproved
  const isAi = changeRequest.aiMetadata != null

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {isAi && <Bot className="w-5 h-5 text-purple-400" />}
              {changeRequest.title}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <StatusBadge status={changeRequest.status} />
              <span>{changeRequest.author}</span>
              <span>•</span>
              <span>{formatDistanceToNow(changeRequest.createdAt, { addSuffix: true })}</span>
            </div>
          </div>

          {canActOn && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  startPendingTransition(async () => {
                    await closeChangeRequest({ id: changeRequest.id })
                  })
                }
                className="text-[oklch(0.75_0.12_25)] border-[oklch(0.35_0.08_25)] hover:bg-[oklch(0.25_0.08_25)]"
              >
                <X className="w-4 h-4 mr-1.5" />
                Close
              </Button>
              {isOpen && (
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startPendingTransition(async () => {
                      await approveChangeRequest({ id: changeRequest.id })
                    })
                  }
                  className="bg-[oklch(0.55_0.12_200)] text-white hover:bg-[oklch(0.50_0.12_200)]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Approve
                </Button>
              )}
              {isApproved && changeRequest.approvedBy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                  <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.12_200)]" />
                  <span>Approved by {changeRequest.approvedBy}</span>
                </div>
              )}
              <Button
                size="sm"
                disabled={isPending}
                onClick={() =>
                  startPendingTransition(async () => {
                    await mergeChangeRequest({ id: changeRequest.id })
                  })
                }
                className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4 mr-1.5" />
                )}
                Merge
              </Button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowDescription(!showDescription)}
          className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showDescription ? '' : '-rotate-90'}`}
          />
          Description
        </button>
        {showDescription && changeRequest.description && (
          <p className="mt-2 text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md whitespace-pre-wrap">
            {changeRequest.description}
          </p>
        )}

        {isAi && changeRequest.aiMetadata && (
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground inline-flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              AI provenance ({changeRequest.aiMetadata.model})
            </summary>
            <div className="mt-2 bg-secondary/30 p-3 rounded-md space-y-1.5">
              <div>
                <span className="font-medium text-foreground">Instructions:</span>{' '}
                {changeRequest.aiMetadata.instructions}
              </div>
              <div>
                <span className="font-medium text-foreground">Tool calls:</span>{' '}
                {changeRequest.aiMetadata.toolCalls.length}
              </div>
            </div>
          </details>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
          <span className="text-sm font-medium text-foreground">Changes</span>
          <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
            <ViewModeBtn
              active={viewMode === 'unified'}
              onClick={() => setViewMode('unified')}
              icon={<AlignJustify className="w-3.5 h-3.5" />}
              label="Unified"
            />
            <ViewModeBtn
              active={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              icon={<SplitSquareVertical className="w-3.5 h-3.5" />}
              label="Split"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar bg-card">
          <DiffViewer
            original={changeRequest.originalContent}
            modified={changeRequest.proposedContent}
            viewMode={viewMode}
          />
        </div>
      </div>

      <CommentsSection
        changeRequestId={changeRequest.id}
        comments={optimisticComments}
        currentUser={currentUser}
        onOptimistic={addOptimisticComment}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: ChangeRequest['status'] }) {
  const cfg =
    status === 'open'
      ? {
          bg: 'bg-[oklch(0.25_0.08_145)]',
          fg: 'text-[oklch(0.75_0.12_145)]',
          icon: <Clock className="w-3 h-3" />,
          label: 'Pending Review',
        }
      : status === 'approved'
      ? {
          bg: 'bg-[oklch(0.25_0.08_200)]',
          fg: 'text-[oklch(0.75_0.12_200)]',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'Approved',
        }
      : status === 'merged'
      ? {
          bg: 'bg-[oklch(0.25_0.08_280)]',
          fg: 'text-[oklch(0.75_0.12_280)]',
          icon: null,
          label: 'Merged',
        }
      : {
          bg: 'bg-[oklch(0.25_0.08_25)]',
          fg: 'text-[oklch(0.75_0.12_25)]',
          icon: null,
          label: 'Closed',
        }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.fg}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function ViewModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
        active
          ? 'bg-background text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function CommentsSection({
  changeRequestId,
  comments,
  currentUser,
  onOptimistic,
}: {
  changeRequestId: string
  comments: Comment[]
  currentUser: string
  onOptimistic: (next: Comment) => void
}) {
  const [state, formAction, isPending] = useActionState<FormActionState, FormData>(addComment, null)

  // Persist the in-progress comment to localStorage scoped per CR so the user
  // can refresh / lose wifi without losing their typing. Cleared on successful
  // submit; the Server Action remains the source of truth.
  const [draft, setDraft, clearDraft] = useDraftStorage({
    key: `comment:${changeRequestId}`,
  })

  return (
    <div className="border-t border-border bg-background">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="w-4 h-4" />
          Comments ({comments.length})
          {draft.length > 0 && (
            <span
              className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground"
              title="Draft saved locally — survives refresh"
            >
              · draft saved
            </span>
          )}
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto custom-scrollbar">
        {comments.map((comment) => (
          <div key={comment.id} className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{comment.author}</span>
              <span>•</span>
              <span>{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>

      <form
        action={(fd) => {
          const content = draft.trim()
          if (!content) return
          fd.set('content', content)
          startTransition(() => {
            onOptimistic({
              id: `tmp-${Date.now()}`,
              changeRequestId,
              author: currentUser,
              content,
              createdAt: new Date(),
            })
            formAction(fd)
            clearDraft()
          })
        }}
        className="p-3 flex items-center gap-2"
      >
        <input type="hidden" name="changeRequestId" value={changeRequestId} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          type="text"
          placeholder="Add a comment..."
          autoComplete="off"
          className="flex-1 bg-secondary border-none rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !draft.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
      {state && !state.ok && (
        <p className="px-3 pb-2 text-xs text-destructive">{state.error}</p>
      )}
    </div>
  )
}
