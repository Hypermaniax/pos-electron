import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '@renderer/lib/utils'
import { ToastContext, type ToastVariant } from './toast-context'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

let nextToastId = 1

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, variant: ToastVariant = 'info'): void => {
    const id = nextToastId++
    setItems((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id))
    }, 3000)
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'rounded border px-4 py-2 font-mono text-xs shadow-lg backdrop-blur',
              item.variant === 'success' &&
                'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
              item.variant === 'error' && 'border-red-500/50 bg-red-500/15 text-red-300',
              item.variant === 'info' && 'border-park-border bg-park-card/90 text-park-main'
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
