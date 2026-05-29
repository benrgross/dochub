'use client'

import { useEffect } from 'react'

/**
 * Top-level error boundary for errors thrown in the root layout itself.
 * Must render its own <html>/<body> because it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#0b0e14',
          color: '#e6e6e6',
          textAlign: 'center',
          padding: '0 1rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: '#9aa0aa', maxWidth: 360, marginTop: 8 }}>
          The application hit an unexpected error. Please reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 24,
            padding: '0.5rem 1.25rem',
            borderRadius: 8,
            border: 'none',
            background: '#3ecf8e',
            color: '#0b0e14',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
