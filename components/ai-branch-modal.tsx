'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  ArrowRight,
  Plus,
  Replace,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ModelPickerPills } from '@/components/model-picker'
import { DEFAULT_MODEL_ID } from '@/lib/models'
import type { DocumentRow } from '@/lib/types'
import type { Proposal } from '@/lib/proposals'
import { queueAiChangeRequest } from '@/lib/ai-workflow-client'

interface AIBranchModalProps {
  document: DocumentRow
  isOpen: boolean
  onClose: () => void
}

/** Mirror of the workflow's `ProgressEvent` (app/workflows/ai-change-request.ts). */
type ProgressEvent =
  | { type: 'phase'; phase: 'loaded'; title: string }
  | { type: 'phase'; phase: 'generating' }
  | { type: 'proposals'; summary: string; items: Proposal[] }
  | { type: 'phase'; phase: 'persisted'; changeRequestId: string }
  | { type: 'error'; message: string }

type Phase = 'idle' | 'starting' | 'loaded' | 'generating' | 'proposed' | 'opening' | 'error'

/**
 * AI Branch flow (durable).
 *
 * "Generate proposal" kicks off the durable AI Change Request *workflow* and
 * streams its coarse progress back into the modal:
 *
 *   start run → load document → generate proposal → (edits stream in) → persist
 *
 * The workflow creates the change request itself and then pauses for human
 * review; the moment it persists, we navigate to that change request's page,
 * where the diff and the Approve / Request-changes / Close actions live (those
 * resume the same run). Because the run is durable, closing this modal — or
 * losing the connection — doesn't stop it: the change request still lands under
 * Changes. This replaces the old in-browser streaming flow.
 */
export function AIBranchModal({ document, isOpen, onClose }: AIBranchModalProps) {
  const router = useRouter()
  const [instructions, setInstructions] = useState('')
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID)

  const [phase, setPhase] = useState<Phase>('idle')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [summary, setSummary] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isRunning = phase !== 'idle' && phase !== 'error'

  async function handleGenerate() {
    if (!instructions.trim() || isRunning) return
    setError(null)
    setProposals([])
    setSummary('')
    setRunId(null)
    setPhase('starting')

    const started = await queueAiChangeRequest({
      documentId: document.id,
      instruction: instructions.trim(),
      model: modelId,
    })
    if (!started.ok) {
      setError(started.error)
      setPhase('error')
      return
    }
    setRunId(started.runId)

    // Stream coarse progress. If this connection drops the run keeps going
    // durably — we just lose the live view and fall back to a hint.
    let navigated = false
    try {
      const res = await fetch(
        `/api/ai-change-request/stream?runId=${encodeURIComponent(started.runId)}`,
      )
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl: number
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line) continue
          let evt: ProgressEvent
          try {
            evt = JSON.parse(line) as ProgressEvent
          } catch {
            continue
          }
          if (evt.type === 'error') {
            setError(evt.message)
            setPhase('error')
          } else if (evt.type === 'proposals') {
            setProposals(evt.items)
            setSummary(evt.summary)
            setPhase('proposed')
          } else if (evt.phase === 'loaded') {
            setPhase('loaded')
          } else if (evt.phase === 'generating') {
            setPhase('generating')
          } else if (evt.phase === 'persisted') {
            // The change request now exists — hand off to its detail page,
            // where review/merge resume this same durable run.
            navigated = true
            setPhase('opening')
            const id = evt.changeRequestId
            handleClose()
            router.push(`/changes/${id}`)
            return
          }
        }
      }
      // Stream ended without persisting (e.g. the run errored). If we didn't
      // already surface an error event, show a generic one.
      if (!navigated) {
        setPhase((p) => (p === 'error' ? p : 'error'))
        setError((e) => e ?? 'The run ended before a change request was created.')
      }
    } catch {
      if (!navigated) {
        setError(
          'Lost the live connection — but the edit is still running durably. ' +
            'It will appear under Changes shortly.',
        )
        setPhase('error')
      }
    }
  }

  function handleRetry() {
    setPhase('idle')
    setProposals([])
    setSummary('')
    setError(null)
    setRunId(null)
  }

  function handleClose() {
    setInstructions('')
    setPhase('idle')
    setProposals([])
    setSummary('')
    setRunId(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Branch</h2>
              <p className="text-sm text-muted-foreground">
                Describe the change you want. The AI drafts it as a reviewable
                proposal — you approve and merge.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {phase === 'idle' || phase === 'error' ? (
            <>
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-medium text-foreground">
                    What changes should the AI make?
                  </label>
                  <div className="space-y-1">
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground sm:hidden">
                      Model
                    </span>
                    <ModelPickerPills value={modelId} onChange={setModelId} disabled={isRunning} />
                  </div>
                </div>
                <Textarea
                  placeholder="e.g., Tighten the goals section, add a security paragraph, fix grammar issues..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="bg-background border-border resize-none"
                  disabled={isRunning}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Source of truth
                </label>
                <div className="bg-background border border-border rounded-lg p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {document.content.trim()}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <ProgressView phase={phase} proposals={proposals} summary={summary} runId={runId} />
          )}

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          {isRunning ? (
            <Button variant="ghost" onClick={handleClose}>
              Run in background
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={phase === 'error' ? handleRetry : handleGenerate}
                disabled={!instructions.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {phase === 'error' ? 'Try again' : 'Generate proposal'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const PHASE_STEPS: { key: Phase; label: string }[] = [
  { key: 'starting', label: 'Getting started' },
  { key: 'loaded', label: 'Reading your document' },
  { key: 'generating', label: 'Drafting changes' },
  { key: 'proposed', label: 'Reviewing proposed edits' },
  { key: 'opening', label: 'Opening your change request' },
]

const PHASE_ORDER: Phase[] = ['starting', 'loaded', 'generating', 'proposed', 'opening']

function ProgressView({
  phase,
  proposals,
  summary,
  runId,
}: {
  phase: Phase
  proposals: Proposal[]
  summary: string
  runId: string | null
}) {
  const currentIdx = PHASE_ORDER.indexOf(phase)

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {PHASE_STEPS.map((step) => {
          const idx = PHASE_ORDER.indexOf(step.key)
          const done = idx < currentIdx
          const active = idx === currentIdx
          return (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.15_145)]" />
              ) : active ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40" />
              )}
              <span
                className={
                  done
                    ? 'text-muted-foreground'
                    : active
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground/50'
                }
              >
                {step.label}
                {step.key === 'proposed' && proposals.length > 0 && ` (${proposals.length})`}
              </span>
            </li>
          )
        })}
      </ol>

      {summary && (
        <div className="border border-border bg-background rounded-md p-3 text-sm">
          <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Summary</div>
          <p className="text-foreground/90 whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {proposals.length > 0 && (
        <ul className="space-y-2">
          {proposals.map((p, i) => (
            <li key={i} className="border border-border bg-background rounded-md p-3 text-sm">
              {p.kind === 'replacement' ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Replace className="w-3.5 h-3.5" />
                    <span>Replacement</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs font-mono">
                    <div className="bg-[oklch(0.18_0.04_25)] text-[oklch(0.75_0.12_25)] rounded px-2 py-1 truncate">
                      {p.find}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="bg-[oklch(0.18_0.04_145)] text-[oklch(0.75_0.12_145)] rounded px-2 py-1 truncate">
                      {p.replace}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insertion after {p.afterHeading}</span>
                  </div>
                  <pre className="bg-[oklch(0.18_0.04_145)] text-[oklch(0.75_0.12_145)] rounded px-2 py-1 text-xs font-mono whitespace-pre-wrap">
                    {p.content}
                  </pre>
                </>
              )}
              <div className="mt-2 text-xs text-muted-foreground italic">{p.rationale}</div>
            </li>
          ))}
        </ul>
      )}

      {runId && (
        <p className="text-[11px] text-muted-foreground">
          You can close this anytime — your edit keeps working in the background
          and will appear under Changes when it&apos;s ready.
        </p>
      )}
    </div>
  )
}
