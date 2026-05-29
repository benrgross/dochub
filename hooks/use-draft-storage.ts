'use client'

import { useCallback, useEffect, useState } from 'react'

interface UseDraftStorageOptions {
  /**
   * Unique storage key per draft surface. Include any IDs that scope the
   * draft (e.g. `comment:cr-${crId}`) so different CRs don't share a buffer.
   */
  key: string
  /** Optional initial value used when nothing is in storage yet. */
  initial?: string
  /** Discard drafts older than this many ms (default 7 days). */
  maxAgeMs?: number
}

interface StoredDraft {
  value: string
  savedAt: number
}

const SCHEMA_VERSION = 'v1'
const DEFAULT_MAX_AGE = 1000 * 60 * 60 * 24 * 7

/**
 * Form-draft storage hook. Persists text to localStorage so a refresh or
 * disconnect doesn't cost the user their typing. The server is still the
 * source of truth; this is just an offline buffer.
 *
 * SSR-safe: we read on mount only (no `window` at render time).
 */
export function useDraftStorage({
  key,
  initial = '',
  maxAgeMs = DEFAULT_MAX_AGE,
}: UseDraftStorageOptions): [string, (next: string) => void, () => void] {
  const storageKey = `dochub:draft:${SCHEMA_VERSION}:${key}`
  const [value, setValue] = useState<string>(initial)

  // Restore on mount (and when the key changes — e.g. switching between PRs).
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        setValue(initial)
        return
      }
      const parsed: StoredDraft = JSON.parse(raw)
      if (Date.now() - parsed.savedAt > maxAgeMs) {
        window.localStorage.removeItem(storageKey)
        setValue(initial)
        return
      }
      setValue(parsed.value)
    } catch {
      setValue(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const update = useCallback(
    (next: string) => {
      setValue(next)
      if (typeof window === 'undefined') return
      try {
        if (next.length === 0) {
          window.localStorage.removeItem(storageKey)
        } else {
          const payload: StoredDraft = { value: next, savedAt: Date.now() }
          window.localStorage.setItem(storageKey, JSON.stringify(payload))
        }
      } catch {
        // Quota exceeded or disabled — degrade silently. The in-memory
        // state still works for this session.
      }
    },
    [storageKey],
  )

  const clear = useCallback(() => {
    setValue('')
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }, [storageKey])

  return [value, update, clear]
}
