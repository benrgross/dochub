'use client'

import { useId } from 'react'
import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { MODELS, type ModelOption } from '@/lib/models'

interface ModelPickerProps {
  /** Currently selected model slug (e.g. "anthropic/claude-sonnet-4.6"). */
  value: string
  /** Called with the newly selected model slug. */
  onChange: (id: string) => void
  /** Optional override of the model list (e.g. to expose extra models in admin UIs). */
  options?: readonly ModelOption[]
  /** Hide the descriptive hint row (compact mode for tight headers). */
  compact?: boolean
  /** Disable the entire picker. */
  disabled?: boolean
  /** Optional label rendered above the picker. */
  label?: string
}

/**
 * Reusable model picker for AI features. Decoupled from any specific
 * feature — the caller owns `value` / `onChange` state, and can override
 * `options` to expose a different model subset (e.g. admin UI).
 */
export function ModelPicker({
  value,
  onChange,
  options = MODELS,
  compact = false,
  disabled = false,
  label,
}: ModelPickerProps) {
  const labelId = useId()
  const selected = options.find((m) => m.id === value) ?? options[0]

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          id={labelId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <div
          className={`flex items-center gap-2 rounded-md border border-border bg-background ${
            compact ? 'px-2 py-1.5' : 'px-3 py-2.5'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-foreground/30'} transition-colors`}
        >
          <ProviderBadge provider={selected.provider} />
          <div className="flex-1 min-w-0">
            <div
              className={`font-medium text-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`}
            >
              {selected.label}
            </div>
            {!compact && (
              <div className="text-xs text-muted-foreground truncate">{selected.hint}</div>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />

          <select
            aria-labelledby={label ? labelId : undefined}
            aria-label={label ? undefined : 'Model'}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {options.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.hint}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact horizontal selector. Renders all options as pill buttons. Good
 * when you have 2–3 models and want them visible at a glance.
 */
export function ModelPickerPills({
  value,
  onChange,
  options = MODELS,
  disabled = false,
}: Omit<ModelPickerProps, 'compact' | 'label'>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((m) => {
        const isActive = m.id === value
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            disabled={disabled}
            className={`group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
            aria-pressed={isActive}
          >
            <ProviderBadge provider={m.provider} size="xs" />
            <span className="font-medium">{m.label}</span>
            {isActive && <Check className="w-3 h-3 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

function ProviderBadge({
  provider,
  size = 'sm',
}: {
  provider: ModelOption['provider']
  size?: 'xs' | 'sm'
}) {
  const dim = size === 'xs' ? 'w-4 h-4' : 'w-5 h-5'
  const text = size === 'xs' ? 'text-[9px]' : 'text-[10px]'

  if (provider === 'anthropic') {
    return (
      <div
        className={`${dim} rounded flex items-center justify-center bg-orange-500/15 border border-orange-500/30 shrink-0`}
        title="Anthropic"
      >
        <span className={`${text} font-bold text-orange-400`}>A</span>
      </div>
    )
  }
  return (
    <div
      className={`${dim} rounded flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 shrink-0`}
      title="OpenAI"
    >
      <Sparkles className={size === 'xs' ? 'w-2.5 h-2.5 text-emerald-400' : 'w-3 h-3 text-emerald-400'} />
    </div>
  )
}
