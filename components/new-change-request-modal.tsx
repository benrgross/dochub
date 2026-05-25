'use client'

import { useState } from 'react'
import { useDocHubStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

export function NewChangeRequestModal() {
  const { document, createChangeRequest } = useDocHubStore()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [proposedContent, setProposedContent] = useState('')

  const handleOpen = () => {
    setProposedContent(document.content)
    setIsOpen(true)
  }

  const handleSubmit = () => {
    if (title.trim() && author.trim() && proposedContent !== document.content) {
      createChangeRequest(title.trim(), description.trim(), author.trim(), proposedContent)
      setIsOpen(false)
      setTitle('')
      setDescription('')
      setAuthor('')
      setProposedContent('')
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={handleOpen} size="sm" className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]">
        <Plus className="w-4 h-4 mr-1.5" />
        New Change Request
      </Button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[900px] md:max-h-[85vh] bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">New Change Request</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of changes"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain your changes in detail..."
              rows={2}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Proposed Changes
              <span className="text-xs text-muted-foreground ml-2">(Edit the document below)</span>
            </label>
            <textarea
              value={proposedContent}
              onChange={(e) => setProposedContent(e.target.value)}
              rows={15}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !author.trim() || proposedContent === document.content}
            className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]"
          >
            Create Change Request
          </Button>
        </div>
      </div>
    </>
  )
}
