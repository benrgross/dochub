'use client'

import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'

interface TimeAgoProps {
  date: Date | string | number
  addSuffix?: boolean
}

/**
 * Relative time formatter. Client-only — `Date.now()` is non-deterministic
 * at SSR/prerender, and relative time should reflect the user's clock.
 *
 * SSR renders an absolute ISO timestamp (no hydration mismatch, no layout
 * shift); the relative phrase replaces it on mount and refreshes every
 * minute.
 */
export function TimeAgo({ date, addSuffix = true }: TimeAgoProps) {
  const d = date instanceof Date ? date : new Date(date)
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const update = () => setLabel(formatDistanceToNow(d, { addSuffix }))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [d, addSuffix])

  return (
    <time dateTime={d.toISOString()} suppressHydrationWarning>
      {label ?? d.toLocaleString()}
    </time>
  )
}
