'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { ChangeRequestFilter } from '@/app/_data/change-requests'

interface ChangeRequestFilterBarProps {
  filter: ChangeRequestFilter
  query: string
}

const OPTIONS: { value: ChangeRequestFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'ai', label: 'AI' },
]

/**
 * URL-driven filter for the CR list. Writes to ?filter=… and ?q=… so the
 * filtered view is shareable. Because the list is a Suspense boundary in
 * the @list slot, switching filters re-streams the list while the chrome
 * (header, nav, footer) stays mounted and instant.
 */
export function ChangeRequestFilterBar({ filter, query }: ChangeRequestFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [text, setText] = useState(query)

  useEffect(() => setText(query), [query])

  function buildHref(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="px-3 py-2 border-b border-border space-y-2">
      <div className="flex items-center gap-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() =>
              startTransition(() => {
                router.replace(buildHref({ filter: opt.value === 'all' ? null : opt.value }))
              })
            }
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              filter === opt.value
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={text}
          onChange={(e) => {
            const v = e.target.value
            setText(v)
            startTransition(() => {
              router.replace(buildHref({ q: v || null }))
            })
          }}
          placeholder="Filter by title"
          className="w-full bg-secondary border border-transparent focus:border-border rounded-md pl-7 pr-2 py-1.5 text-xs focus:outline-none"
        />
      </div>
    </div>
  )
}
