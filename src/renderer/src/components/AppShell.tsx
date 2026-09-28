import type React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOutIcon } from 'lucide-react'
import { can, Permissions } from '../lib/permissions'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { useShift } from '../context/ShiftContext'
import { useIdleLock } from '../hooks/useIdleLock'
import { ModeBadge } from './ModeBadge'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

interface NavItem {
  to: string
  label: string
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Beranda' },
  { to: '/loket', label: 'Loket', permission: Permissions.SessionView },
  { to: '/shift', label: 'Shift', permission: Permissions.ShiftManage },
  { to: '/riwayat', label: 'Riwayat', permission: Permissions.HistoryView },
  { to: '/pengaturan', label: 'Pengaturan', permission: Permissions.SettingsManage }
]

export function AppShell(): React.JSX.Element {
  const { session, logout, expireSession } = useAuth()
  const { config } = useConfig()
  const { shift } = useShift()
  const navigate = useNavigate()

  const timeoutSeconds = config?.sessionTimeoutSeconds ?? 300

  useIdleLock(Boolean(session), timeoutSeconds, () => {
    void expireSession('Sesi berakhir otomatis karena tidak ada aktivitas.').then(() => {
      navigate('/login', { replace: true })
    })
  })

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              P
            </div>
            <div>
              <p className="text-sm font-semibold">POS Parkir</p>
              <p className="text-xs text-muted-foreground">
                {config ? `${config.laneName} · ${config.gateName}` : 'Memuat konfigurasi...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={shift ? 'default' : 'secondary'}>
              {shift ? 'Shift aktif' : 'Shift belum dibuka'}
            </Badge>
            <ModeBadge />
            <div className="text-right">
              <p className="text-sm font-semibold">{session?.operator.name ?? '-'}</p>
              <p className="text-xs text-muted-foreground">{session?.operator.role ?? '-'}</p>
            </div>
            <Button variant="outline" onClick={() => void handleLogout()}>
              <LogOutIcon data-icon="inline-start" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl gap-1 px-6 py-2">
          {NAV_ITEMS.filter((item) => !item.permission || can(session, item.permission as never)).map(
            (item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            )
          )}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        <Outlet />
      </main>

      <footer className="border-t bg-background py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>
            POS Parkir · mode {config?.operationalMode === 'manless' ? 'Manless' : 'Operator'}
          </span>
          <span>Device {config?.deviceId.slice(0, 8) ?? '-'}</span>
        </div>
      </footer>
    </div>
  )
}
