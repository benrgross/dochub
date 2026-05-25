'use client'

import { useState } from 'react'
import { useDocHubStore } from '@/lib/store'
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
  Clock
} from 'lucide-react'

export function ChangeRequestDetail() {
  const { selectedChangeRequest, approveChangeRequest, mergeChangeRequest, closeChangeRequest, addComment } = useDocHubStore()
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified')
  const [newComment, setNewComment] = useState('')
  const [showDescription, setShowDescription] = useState(true)

  if (!selectedChangeRequest) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-20">
            <GitMerge className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-sm">Select a change request to view details</p>
        </div>
      </div>
    )
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment(selectedChangeRequest.id, 'You', newComment.trim())
      setNewComment('')
    }
  }

  const isOpen = selectedChangeRequest.status === 'open'
  const isApproved = selectedChangeRequest.status === 'approved'
  const canMerge = isOpen || isApproved

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{selectedChangeRequest.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedChangeRequest.status === 'open'
                    ? 'bg-[oklch(0.25_0.08_145)] text-[oklch(0.75_0.12_145)]'
                    : selectedChangeRequest.status === 'approved'
                    ? 'bg-[oklch(0.25_0.08_200)] text-[oklch(0.75_0.12_200)]'
                    : selectedChangeRequest.status === 'merged'
                    ? 'bg-[oklch(0.25_0.08_280)] text-[oklch(0.75_0.12_280)]'
                    : 'bg-[oklch(0.25_0.08_25)] text-[oklch(0.75_0.12_25)]'
                }`}
              >
                {selectedChangeRequest.status === 'open' && (
                  <>
                    <Clock className="w-3 h-3" />
                    Pending Review
                  </>
                )}
                {selectedChangeRequest.status === 'approved' && (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Approved
                  </>
                )}
                {selectedChangeRequest.status === 'merged' && 'Merged'}
                {selectedChangeRequest.status === 'closed' && 'Closed'}
              </span>
              <span>{selectedChangeRequest.author}</span>
              <span>•</span>
              <span>{formatDistanceToNow(selectedChangeRequest.createdAt, { addSuffix: true })}</span>
            </div>
          </div>

          {canMerge && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeChangeRequest(selectedChangeRequest.id)}
                className="text-[oklch(0.75_0.12_25)] border-[oklch(0.35_0.08_25)] hover:bg-[oklch(0.25_0.08_25)]"
              >
                <X className="w-4 h-4 mr-1.5" />
                Close
              </Button>
              {isOpen && (
                <Button
                  size="sm"
                  onClick={() => approveChangeRequest(selectedChangeRequest.id, 'You')}
                  className="bg-[oklch(0.55_0.12_200)] text-white hover:bg-[oklch(0.50_0.12_200)]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Approve
                </Button>
              )}
              {isApproved && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                  <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.12_200)]" />
                  <span>Approved by {selectedChangeRequest.approvedBy}</span>
                </div>
              )}
              <Button
                size="sm"
                onClick={() => mergeChangeRequest(selectedChangeRequest.id)}
                className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]"
              >
                <GitMerge className="w-4 h-4 mr-1.5" />
                Merge
              </Button>
            </div>
          )}
        </div>

        {/* Description */}
        <button
          onClick={() => setShowDescription(!showDescription)}
          className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showDescription ? '' : '-rotate-90'}`} />
          Description
        </button>
        {showDescription && (
          <p className="mt-2 text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md">
            {selectedChangeRequest.description}
          </p>
        )}
      </div>

      {/* Diff View */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* View mode toggle */}
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
          <span className="text-sm font-medium text-foreground">Changes</span>
          <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'unified'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'split'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Split
            </button>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-card">
          <DiffViewer
            original={selectedChangeRequest.originalContent}
            modified={selectedChangeRequest.proposedContent}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* Comments section */}
      <div className="border-t border-border bg-background">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageSquare className="w-4 h-4" />
            Comments ({selectedChangeRequest.comments.length})
          </div>
        </div>

        {/* Comment list */}
        <div className="max-h-40 overflow-y-auto custom-scrollbar">
          {selectedChangeRequest.comments.map((comment) => (
            <div key={comment.id} className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{comment.author}</span>
                <span>•</span>
                <span>{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
              </div>
              <p className="text-sm text-foreground/90">{comment.content}</p>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <div className="p-3 flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Add a comment..."
            className="flex-1 bg-secondary border-none rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
