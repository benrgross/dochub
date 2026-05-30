'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface ChangesShellProps {
  list: React.ReactNode
  detail: React.ReactNode
}

/**
 * Master-detail shell for the Change Requests view.
 *
 * - Phones: show only the list when no PR is selected, and only the detail
 *   (with a back link) once one is — a standard mobile master-detail flow.
 * - md and up: list sidebar + detail side-by-side, as on desktop.
 *
 * Route-aware via usePathname so the right pane is full-screen on mobile
 * instead of cramming both into one viewport.
 */
export function ChangesShell({ list, detail }: ChangesShellProps) {
  const pathname = usePathname()
  const onDetail = /^\/changes\/[^/]+/.test(pathname)

  return (
    <div className="h-full md:flex">
      <div
        className={`${onDetail ? 'hidden md:block' : 'block'} h-full w-full md:w-80 md:shrink-0 border-r border-border bg-card overflow-hidden`}
      >
        {list}
      </div>

      <div
        className={`${onDetail ? 'flex' : 'hidden md:flex'} h-full flex-1 min-w-0 flex-col bg-background`}
      >
        {onDetail && (
          <Link
            href="/changes"
            className="md:hidden flex items-center gap-1.5 px-4 py-2.5 border-b border-border text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            All change requests
          </Link>
        )}
        <div className="flex-1 min-h-0">{detail}</div>
      </div>
    </div>
  )
}
