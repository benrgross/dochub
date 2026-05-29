'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitBranch,
  GitMerge,
  GitPullRequest,
  History,
  Sparkles,
  UserCircle2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dismissTour } from '@/app/_actions/tour'

interface WelcomeTourProps {
  /** When true, the tour opens on mount. Server passes this based on cookie. */
  autoOpen: boolean
}

const STEPS = [
  {
    title: 'Welcome to DocHub',
    icon: GitBranch,
    body: (
      <>
        <p>
          DocHub gives your team a <strong className="text-foreground">GitHub-style merge workflow</strong> for
          long-lived shared documents — PRDs, runbooks, policies, security questionnaires.
        </p>
        <p>
          Every edit, human or AI, opens a <em>Change Request</em> with a diff, threaded
          comments, and a one-click merge.
        </p>
      </>
    ),
  },
  {
    title: 'Pin a source of truth',
    icon: FileText,
    body: (
      <>
        <p>
          Start by uploading a markdown document and pinning it as the source of truth.
          Drag-and-drop is fine. Only one document is pinned at a time.
        </p>
        <p className="text-muted-foreground text-xs">
          Try the <strong>Upload</strong> page from the redirect, or replace the pinned doc later
          from the same screen.
        </p>
      </>
    ),
  },
  {
    title: 'Let the AI propose edits',
    icon: Bot,
    body: (
      <>
        <p>
          Click <strong className="text-foreground">AI Branch</strong> in the header. Pick a model
          (Claude or GPT), describe the change in plain English, and watch tool calls stream in.
        </p>
        <p>
          Each proposal is a structured edit (replacement or insertion) with a one-line rationale.
          You stay in the loop — nothing merges automatically.
        </p>
      </>
    ),
  },
  {
    title: 'Review the diff like a PR',
    icon: GitPullRequest,
    body: (
      <>
        <p>
          Every Change Request opens with a unified or split diff. Comment on it, approve it,
          merge it. The source doc updates in the same request.
        </p>
        <p className="text-muted-foreground text-xs">
          Filter PRs by status or search by title from the sidebar. AI-authored PRs are tagged
          with a bot icon so reviewers know to scrutinize.
        </p>
      </>
    ),
  },
  {
    title: 'Switch personas',
    icon: UserCircle2,
    body: (
      <>
        <p>
          The persona picker in the header lets you act as different teammates — useful for
          demoing the multi-user comment + approval flow on a single browser.
        </p>
        <p className="text-muted-foreground text-xs">
          In production this slot becomes real auth (Clerk via the Vercel Marketplace).
        </p>
      </>
    ),
  },
  {
    title: "You're ready",
    icon: Sparkles,
    body: (
      <>
        <p>
          Pin a doc, branch with AI, merge with a click. Every merge lands in the{' '}
          <strong className="text-foreground">History</strong> tab as a commit.
        </p>
        <p className="text-muted-foreground text-xs">
          You can replay this tour anytime from the footer.
        </p>
      </>
    ),
  },
] as const

export function WelcomeTour({ autoOpen }: WelcomeTourProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (autoOpen) setIsOpen(true)
  }, [autoOpen])

  if (!isOpen) return null

  const last = step === STEPS.length - 1
  const first = step === 0
  const { title, body, icon: Icon } = STEPS[step]

  function handleClose() {
    setIsOpen(false)
    startTransition(() => {
      void dismissTour()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
            <span>
              Tour · {step + 1} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/15 border border-primary/30">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground pt-1">{title}</h2>
          </div>
          <div className="space-y-3 text-sm text-foreground/90 leading-6 pl-12">{body}</div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-5 pb-3">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border bg-secondary/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={first}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Skip
          </Button>
          {last ? (
            <Button size="sm" onClick={handleClose} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <GitMerge className="w-4 h-4 mr-1.5" />
              Get started
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Re-export `History` so step icons land in the bundle (referenced by name above). */
export { History }
