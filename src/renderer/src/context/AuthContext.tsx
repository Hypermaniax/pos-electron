import type React from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SessionState } from '@shared/types'
import { login as loginRequest, logout as logoutRequest, restore } from '../mock/api'

export type AuthStatus = 'guest' | 'authenticated'

interface AuthContextValue {
  session: SessionState | null
  status: AuthStatus
  error: string | null
  endReason: string | null
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  expireSession: (reason: string) => Promise<void>
  clearEndReason: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<SessionState | null>(() => restore())
  const [error, setError] = useState<string | null>(null)
  const [endReason, setEndReason] = useState<string | null>(null)

  const status: AuthStatus = session ? 'authenticated' : 'guest'

  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      setError(null)
      const result = await loginRequest(username, password)
      if (result.ok) {
        setSession(result.data)
        setEndReason(null)
        return { ok: true }
      }
      setError(result.error.message)
      return { ok: false, error: result.error.message }
    },
    []
  )

  const logout = useCallback(async (): Promise<void> => {
    await logoutRequest()
    setSession(null)
  }, [])

  const expireSession = useCallback(async (reason: string): Promise<void> => {
    await logoutRequest()
    setSession(null)
    setEndReason(reason)
  }, [])

  const clearEndReason = useCallback((): void => setEndReason(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, status, error, endReason, login, logout, expireSession, clearEndReason }),
    [session, status, error, endReason, login, logout, expireSession, clearEndReason]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return context
}
