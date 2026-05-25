import { Suspense } from 'react'
import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { Nav } from '@/components/chrome/nav'
import {
  PersonaPickerServer,
  PersonaPickerSkeleton,
} from '@/components/chrome/persona-picker-server'
import { NewChangeRequestModal } from '@/components/new-change-request-modal'
import { AIBranchTrigger } from '@/components/ai-branch-trigger'
import { getPinnedDocument } from '@/app/_data/documents'

/**
 * App chrome wraps every tab. The pinned-doc fetch is cached so this layout
 * is largely static. The only dynamic piece (the cookie-backed persona
 * picker) lives in its own Suspense boundary so PPR can ship the chrome
 * from the CDN and stream the picker.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const doc = await getPinnedDocument()

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-6">
          <Link href="/document" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.65_0.15_145)] flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-[oklch(0.12_0.01_240)]" />
            </div>
            <span className="text-lg font-semibold text-foreground">DocHub</span>
          </Link>
          {doc && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{doc.title}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Suspense fallback={<PersonaPickerSkeleton />}>
            <PersonaPickerServer />
          </Suspense>
          {doc && (
            <>
              <AIBranchTrigger document={doc} />
              <NewChangeRequestModal document={doc} />
            </>
          )}
        </div>
      </header>

      <Suspense fallback={<NavSkeleton />}>
        <Nav />
      </Suspense>

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>

      <footer className="px-4 py-2 border-t border-border bg-card/50 text-xs text-muted-foreground flex items-center justify-between">
        <span>Built for the Vercel SA take-home demo</span>
        <span>Source control for documents</span>
      </footer>
    </div>
  )
}

function NavSkeleton() {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card/50">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-7 w-32 rounded-md bg-secondary/40 animate-pulse" />
      ))}
    </div>
  )
}
