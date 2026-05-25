'use client'

import { useRef, useTransition } from 'react'
import { ChevronDown, UserCircle2 } from 'lucide-react'
import { PERSONAS } from '@/lib/personas'
import { setCurrentUser } from '@/app/_actions/user'

interface PersonaPickerProps {
  current: string
}

/**
 * Small persona switcher in the header. Backed by a cookie via Server Action;
 * stub for real Clerk auth in v2.
 */
export function PersonaPicker({ current }: PersonaPickerProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form ref={formRef} action={setCurrentUser} className="relative">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-md pl-2 pr-1.5 py-1 cursor-pointer transition-colors">
        <UserCircle2 className="w-3.5 h-3.5" />
        <span className="text-foreground">{current}</span>
        <select
          name="user"
          defaultValue={current}
          disabled={isPending}
          onChange={(e) => {
            const fd = new FormData()
            fd.set('user', e.target.value)
            startTransition(() => setCurrentUser(fd))
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Switch persona"
        >
          {PERSONAS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3" />
      </label>
    </form>
  )
}
