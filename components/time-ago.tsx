'use client'

import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'

interface TimeAgoProps {
  date: Date | string | number
  addSuffix?: boolean
}

/**
 * Relative time formatter. Client-only — `Date.now()` is non-deterministic
 * at SSR/prerender, and relative time should reflect the *user's* clock
 * anyway (a New York user reading a comment posted "2 minutes ago" should
 * see 2 minutes from their wall clock, not the server's).
 *
 * Renders an absolute ISO timestamp as the SSR fallback (no hydration
 * mismatch, no layout shift) and swaps to the relative phrase on mount.
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
