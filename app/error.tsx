'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Route-level error boundary. Catches errors thrown while rendering a route
 * segment (e.g. a failed database read) and offers a recovery path instead
 * of a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[route-error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="p-3 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        We hit an unexpected error loading this view. This is often transient — try again.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/70 mt-2 font-mono">
          Reference: {error.digest}
        </p>
      )}
      <Button onClick={reset} className="mt-6">
        <RotateCcw className="w-4 h-4 mr-2" />
        Try again
      </Button>
    </div>
  )
}
