import type React from 'react'
import { cn } from '@renderer/lib/utils'

export type KbdColor = 'default' | 'accent' | 'cash' | 'success' | 'warning' | 'danger'

export function Kbd({
  label,
  color = 'default'
}: {
  label: string
  color?: KbdColor
}): React.JSX.Element {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-7 items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold',
        color === 'default' && 'border-border bg-card text-foreground',
        color === 'accent' && 'border-border bg-background text-cyan-400',
        color === 'cash' && 'border-border bg-background text-foreground',
        color === 'success' && 'border-emerald-500/50 bg-emerald-500 text-black',
        color === 'warning' && 'border-amber-500/50 bg-amber-500 text-black',
        color === 'danger' && 'border-border bg-card text-red-400'
      )}
    >
      {label}
    </kbd>
  )
}

export type DockVariant = 'default' | 'active' | 'success' | 'warning' | 'danger'

export function DockButton({
  kbd,
  label,
  onClick,
  variant = 'default',
  disabled
}: {
  kbd: string
  label: string
  onClick: () => void
  variant?: DockVariant
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'default' &&
          'border-border bg-card/60 text-foreground hover:bg-card hover:text-white',
        variant === 'active' && 'border-primary/40 bg-primary text-primary-foreground',
        variant === 'success' &&
          'border-emerald-500/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black',
        variant === 'warning' &&
          'border-amber-500/50 bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black',
        variant === 'danger' &&
          'border-border bg-card/60 text-red-400 hover:border-red-500/50 hover:bg-red-500/20'
      )}
    >
      <Kbd label={kbd} color={variant === 'active' ? 'cash' : variant} />
      <span className="font-medium">{label}</span>
    </button>
  )
}

export function MatrixBox({
  label,
  value,
  highlight
}: {
  label: string
  value: string
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded border p-2 font-mono',
        highlight ? 'border-primary/50 bg-primary/15' : 'border-border/70 bg-background'
      )}
    >
      <span
        className={cn(
          'block text-[10px]',
          highlight ? 'font-semibold text-primary' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'mt-0.5 block truncate',
          highlight ? 'font-bold text-foreground' : 'font-medium text-foreground/90'
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}

export function DetailLine({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-xs font-mono">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground/90">{value}</span>
    </div>
  )
}

export function SectionHeader({
  icon,
  title,
  right
}: {
  icon: string
  title: string
  right?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground font-mono">
        <span aria-hidden className="text-cyan-400">
          {icon}
        </span>{' '}
        {title}
      </span>
      {right}
    </div>
  )
}
