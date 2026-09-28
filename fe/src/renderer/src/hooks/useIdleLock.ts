import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'focus']

export function useIdleLock(
  enabled: boolean,
  timeoutSeconds: number,
  onIdle: () => void
): void {
  const callbackRef = useRef(onIdle)

  useEffect(() => {
    callbackRef.current = onIdle
  }, [onIdle])

  useEffect(() => {
    if (!enabled) return
    const timeoutMs = Math.max(timeoutSeconds, 60) * 1000
    let timer: number | null = null

    const reset = (): void => {
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => callbackRef.current(), timeoutMs)
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    reset()

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset))
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [enabled, timeoutSeconds])
}
