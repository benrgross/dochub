'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, GitPullRequest, History } from 'lucide-react'

const tabs = [
  { href: '/document', label: 'Document', icon: FileText },
  { href: '/changes', label: 'Change Requests', icon: GitPullRequest },
  { href: '/history', label: 'History', icon: History },
] as const

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card/50">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
