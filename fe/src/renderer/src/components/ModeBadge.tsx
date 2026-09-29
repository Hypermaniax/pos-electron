import type React from 'react'
import { useEffect, useState } from 'react'
import { Badge } from '@renderer/components/ui/badge'
import { configApi } from '../lib/config-api'
import { pingServer } from '../lib/server-api'

type ConnState = 'checking' | 'online' | 'offline'

export function ModeBadge(): React.JSX.Element {
  const [state, setState] = useState<ConnState>('checking')
  const [url, setUrl] = useState('')

  useEffect(() => {
    let active = true
    void configApi.get().then((result) => {
      if (active && result.ok) setUrl(result.data.siteServerUrl)
    })
    const check = (): void => {
      void pingServer().then((result) => {
        if (!active) return
        setState(result.ok ? 'online' : 'offline')
      })
    }
    check()
    const timer = setInterval(check, 15_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  if (state === 'online') {
    return (
      <Badge variant="secondary" title={`Terhubung ke Site Server (${url})`}>
        <span className="size-2 rounded-full bg-emerald-500" />
        Site Server
      </Badge>
    )
  }
  if (state === 'offline') {
    return (
      <Badge variant="secondary" title={`Tidak dapat terhubung ke ${url || 'Site Server'}`}>
        <span className="size-2 rounded-full bg-destructive" />
        Site Server · Terputus
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" title="Memeriksa koneksi ke Site Server...">
      <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
      Memeriksa...
    </Badge>
  )
}
