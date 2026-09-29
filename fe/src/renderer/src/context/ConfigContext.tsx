import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppConfig } from '@shared/types'
import { configApi } from '../lib/config-api'
import { resetBaseCache } from '../lib/server-api'

interface ConfigContextValue {
  config: AppConfig | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  update: (patch: Partial<AppConfig>) => Promise<{ ok: boolean; error?: string }>
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void configApi.get().then((result) => {
      if (!active) return
      if (result.ok) {
        setConfig(result.data)
        setError(null)
      } else {
        setError(result.error.message)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    const result = await configApi.get()
    if (result.ok) {
      setConfig(result.data)
      setError(null)
    } else {
      setError(result.error.message)
    }
    setLoading(false)
  }, [])

  const update = useCallback(
    async (patch: Partial<AppConfig>): Promise<{ ok: boolean; error?: string }> => {
      const result = await configApi.update(patch)
      if (result.ok) {
        setConfig(result.data)
        resetBaseCache()
        return { ok: true }
      }
      return { ok: false, error: result.error.message }
    },
    []
  )

  const value = useMemo<ConfigContextValue>(
    () => ({ config, loading, error, reload, update }),
    [config, loading, error, reload, update]
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfig harus dipakai di dalam ConfigProvider')
  return context
}
