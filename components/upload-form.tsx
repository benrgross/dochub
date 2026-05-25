'use client'

import { useState, useActionState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FileUp, Loader2, FileText } from 'lucide-react'
import { pinDocument } from '@/app/_actions/document'
import { type FormActionState } from '@/app/_actions/_helpers'

const SEED_TEMPLATE = `# Product Requirements: <Name>

## Goals
1. ...

## Non-goals
- ...

## Users
- ...

## Functional requirements
- ...

## Open questions
- ...
`

/**
 * Pin-a-doc form with drag-and-drop for .md/.txt files.
 * Form submission goes through the \`pinDocument\` Server Action, which
 * unpins any prior doc, inserts the new one, and invalidates the
 * \`document\` cache tag so the document tab re-renders fresh.
 */
export function UploadForm() {
  const [state, formAction, isPending] = useActionState<FormActionState, FormData>(
    pinDocument,
    null,
  )
  const [content, setContent] = useState(SEED_TEMPLATE)
  const [title, setTitle] = useState('Product Requirements Document')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function readFile(file: File) {
    const text = await file.text()
    setContent(text)
    const guessTitle = file.name.replace(/\.(md|markdown|txt)$/i, '')
    if (guessTitle) setTitle(guessTitle)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) void readFile(f)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void readFile(f)
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Document title
        </label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Source content (markdown or plain text)
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`relative rounded-md border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'
          }`}
        >
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            required
            className="w-full bg-transparent rounded-md px-3 py-3 text-sm font-mono focus:outline-none resize-none"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              onChange={onFileChange}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="w-3.5 h-3.5 mr-1.5" />
              Upload file
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Or drag and drop a <code>.md</code> / <code>.txt</code> file into the box.
        </p>
      </div>

      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[oklch(0.65_0.15_145)] text-[oklch(0.12_0.01_240)] hover:bg-[oklch(0.60_0.15_145)]"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-1.5" />
          )}
          Pin as source of truth
        </Button>
      </div>
    </form>
  )
}
