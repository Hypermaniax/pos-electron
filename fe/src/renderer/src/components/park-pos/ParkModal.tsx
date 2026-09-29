import type React from 'react'
import { useFKeyBindings } from '@renderer/hooks/useFKeyBindings'

export function ParkModal({
  open,
  onClose,
  icon,
  iconClass,
  title,
  subtitle,
  maxWidth = 'max-w-lg',
  children
}: {
  open: boolean
  onClose: () => void
  icon: string
  iconClass?: string
  title: string
  subtitle?: string
  maxWidth?: string
  children: React.ReactNode
}): React.JSX.Element | null {
  useFKeyBindings({ escape: open ? onClose : undefined })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        className={`flex w-full ${maxWidth} flex-col gap-3 rounded-lg border border-border bg-card p-5 font-mono shadow-2xl`}
        role="dialog"
        aria-modal
      >
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className={`flex items-center gap-2 ${iconClass ?? 'text-cyan-400'}`}>
            <span aria-hidden className="text-[22px]">
              {icon}
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Tutup [ESC]"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-white active:scale-95"
          >
            <span aria-hidden className="text-lg">
              ✕
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
