import type React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowDownToLineIcon,
  ClockIcon,
  CreditCardIcon,
  HistoryIcon,
  HouseIcon,
  LogOutIcon,
  SettingsIcon,
  TicketIcon,
  UsersIcon
} from 'lucide-react'
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
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Beranda', icon: HouseIcon },
  { to: '/loket', label: 'Loket Bayar', icon: CreditCardIcon, permission: Permissions.SessionView },
  { to: '/masuk', label: 'Gate Masuk', icon: TicketIcon, permission: Permissions.SessionView },
  { to: '/shift', label: 'Shift', icon: ArrowDownToLineIcon, permission: Permissions.ShiftManage },
  { to: '/riwayat', label: 'Riwayat', icon: HistoryIcon, permission: Permissions.HistoryView },
  {
    to: '/pengaturan',
    label: 'Pengaturan',
    icon: SettingsIcon,
    permission: Permissions.SettingsManage
  },
  {
    to: '/personel',
    label: 'Personel & Member',
    icon: UsersIcon,
    permission: Permissions.PersonelView
  }
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

  const items2 = NAV_ITEMS.filter((item) => !item.permission || can(session, item.permission as never))
  const isAdmin = session?.operator.role === 'Admin'
  if (!isAdmin)
    return (
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 flex h-14 flex-wrap items-center justify-between gap-2 border-b bg-park-secondary px-3 py-2 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {items2.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium transition-all active:scale-95',
                    isActive
                      ? 'border-primary/40 bg-primary text-primary-foreground'
                      : 'border-park-border bg-park-tertiary text-park-main hover:bg-park-card hover:text-white'
                  )
                }
              >
                <item.icon className="size-3.5" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ModeBadge />
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              <LogOutIcon data-icon="inline-start" className="size-3.5" />
              Keluar
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 p-3">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    )

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            SP
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-heading text-base font-bold tracking-tight">
              Summit POS
            </p>
            <p className="truncate text-xs text-muted-foreground">POS Parkir Operator</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {items2.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t px-5 py-4 text-xs text-muted-foreground">
          <span>
            Mode {config?.operationalMode === 'manless' ? 'Manless' : 'Operator'} · Device{' '}
            {config?.deviceId.slice(0, 8) ?? '-'}
          </span>
          <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
            <LogOutIcon data-icon="inline-start" />
            Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b px-6">
          <div className="flex min-w-0 items-center gap-3">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {config ? `${config.gateName} · ${config.laneName}` : 'Memuat konfigurasi...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={shift ? 'default' : 'secondary'}
              className={cn(!shift && 'text-muted-foreground')}
            >
              <ClockIcon className="size-3" />
              {shift ? 'Shift aktif' : 'Shift belum dibuka'}
            </Badge>
            <ModeBadge />
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">{session?.operator.name ?? '-'}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {session?.operator.role ?? '-'}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
