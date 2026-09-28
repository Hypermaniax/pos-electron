import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Shift, ShiftSummary } from '@shared/types'
import { closeShift, getActiveShift, getShiftSummary, openShift } from '../mock/api'
import { useAuth } from './AuthContext'
import { useConfig } from './ConfigContext'

interface ShiftContextValue {
  shift: Shift | null
  summary: ShiftSummary | null
  loading: boolean
  refresh: () => Promise<void>
  openShift: (openingCash: number) => Promise<{ ok: boolean; error?: string }>
  closeShift: () => Promise<{ ok: boolean; error?: string }>
}

const ShiftContext = createContext<ShiftContextValue | null>(null)

export function ShiftProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { session } = useAuth()
  const { config } = useConfig()
  const [shift, setShift] = useState<Shift | null>(null)
  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    const current = await getActiveShift()
    if (!current) {
      setShift(null)
      setSummary(null)
    } else {
      setShift(current)
      setSummary(await getShiftSummary(current.id))
    }
    setLoading(false)
  }, [])

  const operatorId = session?.operator.id ?? null

  useEffect(() => {
    let active = true
    void getActiveShift().then(async (current) => {
      if (!active) return
      if (!current) {
        setShift(null)
        setSummary(null)
        setLoading(false)
        return
      }
      const currentSummary = await getShiftSummary(current.id)
      if (!active) return
      setShift(current)
      setSummary(currentSummary)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [operatorId])

  const open = useCallback(
    async (openingCash: number): Promise<{ ok: boolean; error?: string }> => {
      if (!session || !config) return { ok: false, error: 'Sesi atau konfigurasi belum siap.' }
      const result = await openShift(
        openingCash,
        session.operator,
        config.deviceId,
        config.laneName
      )
      if (!result.ok) return { ok: false, error: result.error.message }
      await refresh()
      return { ok: true }
    },
    [session, config, refresh]
  )

  const close = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!shift) return { ok: false, error: 'Tidak ada shift aktif.' }
    const result = await closeShift(shift.id)
    if (!result.ok) return { ok: false, error: result.error.message }
    await refresh()
    return { ok: true }
  }, [shift, refresh])

  const value = useMemo<ShiftContextValue>(
    () => ({ shift, summary, loading, refresh, openShift: open, closeShift: close }),
    [shift, summary, loading, refresh, open, close]
  )

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
}

export function useShift(): ShiftContextValue {
  const context = useContext(ShiftContext)
  if (!context) throw new Error('useShift harus dipakai di dalam ShiftProvider')
  return context
}
