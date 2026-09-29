import { useEffect, useRef } from 'react'

export type FKeyAction = () => void

export type FKeyBindings = Partial<
  Record<
    | 'f1'
    | 'f2'
    | 'f3'
    | 'f4'
    | 'f5'
    | 'f6'
    | 'f7'
    | 'f8'
    | 'f9'
    | 'f10'
    | 'f11'
    | 'f12'
    | 'enter'
    | 'escape',
    FKeyAction
  >
>

const KEY_ALIASES: Record<string, keyof FKeyBindings> = {
  F1: 'f1',
  F2: 'f2',
  F3: 'f3',
  F4: 'f4',
  F5: 'f5',
  F6: 'f6',
  F7: 'f7',
  F8: 'f8',
  F9: 'f9',
  F10: 'f10',
  F11: 'f11',
  F12: 'f12',
  Enter: 'enter',
  Escape: 'escape',
  Esc: 'escape'
}

export function useFKeyBindings(bindings: FKeyBindings): void {
  const ref = useRef(bindings)
  useEffect(() => {
    ref.current = bindings
  })

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const key = KEY_ALIASES[event.key]
      if (!key) return
      const action = ref.current[key]
      if (!action) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
