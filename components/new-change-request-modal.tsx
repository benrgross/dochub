'use client'

import { useState, useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X, Loader2 } from 'lucide-react'
import { createChangeRequestForm } from '@/app/_actions/change-requests'
import { type FormActionState } from '@/app/_actions/_helpers'
import type { DocumentRow } from '@/lib/types'

interface NewChangeRequestModalProps {
  document: DocumentRow
}

export function NewChangeRequestModal({ document }: NewChangeRequestModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [proposedContent, setProposedContent] = useState(document.content)
  const [state, formAction, isPending] = useActionState<FormActionState, FormData>(
    createChangeRequestForm,
    null,
  )

  useEffect(() => {
    if (isOpen) setProposedContent(document.content)
  }, [isOpen, document.content])

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        aria-label="New Change Request"
        className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]"
      >
        <Plus className="w-4 h-4 sm:mr-1.5" />
        <span className="hidden sm:inline">New Change Request</span>
      </Button>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[900px] md:max-h-[85vh] bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">New Change Request</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form action={formAction} className="flex-1 flex flex-col overflow-hidden">
          <input type="hidden" name="documentId" value={document.id} />
          <input type="hidden" name="originalContent" value={document.content} />

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
              <input
                name="title"
                type="text"
                required
                placeholder="Brief description of changes"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                placeholder="Explain your changes in detail..."
                rows={2}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Proposed Changes
                <span className="text-xs text-muted-foreground ml-2">
                  (Edit the document below)
                </span>
              </label>
              <textarea
                name="proposedContent"
                value={proposedContent}
                onChange={(e) => setProposedContent(e.target.value)}
                rows={15}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {state && !state.ok && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || proposedContent === document.content}
              className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              Create Change Request
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
