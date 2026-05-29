'use client'

import { useState, useTransition } from 'react'
import { HelpCircle } from 'lucide-react'
import { replayTour } from '@/app/_actions/tour'
import { WelcomeTour } from '@/components/tour/welcome-tour'

/**
 * Footer affordance to manually replay the tour. Independent of the
 * server-driven auto-open — clears the cookie so the tour also opens
 * the next time, then triggers the open immediately for this session.
 */
export function TourTrigger() {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          startTransition(() => {
            void replayTour()
          })
        }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
        Tour
      </button>
      {open && <WelcomeTour autoOpen={true} key={String(open)} />}
    </>
  )
}
