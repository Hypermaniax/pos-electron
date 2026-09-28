import type React from 'react'
import { Link } from 'react-router-dom'
import { CheckIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { useShift } from '../context/ShiftContext'
import { can, describePermissions, Permissions } from '../lib/permissions'
import { formatCurrency, formatDateTime } from '../lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Separator } from '@renderer/components/ui/separator'
import { cn } from '@renderer/lib/utils'

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

function ActionCard({
  to,
  title,
  description,
  disabled
}: {
  to: string
  title: string
  description: string
  disabled?: boolean
}): React.JSX.Element {
  if (disabled) {
    return (
      <Card className="opacity-60">
        <CardContent className="py-5">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Link to={to} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className={cn('transition-colors hover:border-primary')}>
        <CardContent className="py-5">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export function HomeScreen(): React.JSX.Element {
  const { session } = useAuth()
  const { config } = useConfig()
  const { shift, summary } = useShift()

  const permissions = session ? describePermissions(session.operator.permissions) : []
  const canOperate = can(session, Permissions.SessionView)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="py-6">
          <h1 className="text-lg font-semibold">
            Selamat bekerja, {session?.operator.name ?? 'operator'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anda masuk sebagai {session?.operator.role ?? '-'}. Aplikasi berjalan pada data contoh
            lokal.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          to="/loket"
          title="Buka loket"
          description="Cari tagihan dan proses pembayaran."
          disabled={!canOperate}
        />
        <ActionCard
          to="/shift"
          title="Kelola shift"
          description={shift ? 'Lihat ringkasan dan tutup shift.' : 'Buka shift baru.'}
          disabled={!can(session, Permissions.ShiftManage)}
        />
        <ActionCard
          to="/riwayat"
          title="Riwayat transaksi"
          description="Transaksi pada shift aktif."
          disabled={!can(session, Permissions.HistoryView)}
        />
        <ActionCard
          to="/pengaturan"
          title="Pengaturan"
          description="Konfigurasi perangkat dan loket."
          disabled={!can(session, Permissions.SettingsManage)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Shift</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="flex flex-col">
              <InfoRow label="Status" value={shift ? 'Aktif' : 'Belum dibuka'} />
              <Separator />
              <InfoRow label="Dibuka oleh" value={shift?.openedByName ?? '-'} />
              <Separator />
              <InfoRow label="Waktu buka" value={formatDateTime(shift?.openedAt ?? null)} />
              <Separator />
              <InfoRow
                label="Kas awal"
                value={shift ? formatCurrency(shift.openingCash) : '-'}
              />
            </dl>
            {summary && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Tunai</p>
                  <p className="text-sm font-semibold">
                    {summary.cashCount} · {formatCurrency(summary.cashTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">QR berhasil</p>
                  <p className="text-sm font-semibold">
                    {summary.qrSuccessCount} · {formatCurrency(summary.qrTotal)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Perangkat dan sesi</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col">
              <InfoRow label="Loket" value={config?.laneName ?? '-'} />
              <Separator />
              <InfoRow label="Gerbang" value={config?.gateName ?? '-'} />
              <Separator />
              <InfoRow
                label="Mode"
                value={config?.operationalMode === 'manless' ? 'Manless' : 'Operator'}
              />
              <Separator />
              <InfoRow label="Berlaku sampai" value={formatDateTime(session?.expiresAt ?? null)} />
              <Separator />
              <InfoRow
                label="Batas tidak aktif"
                value={config ? `${config.sessionTimeoutSeconds / 60} menit` : '-'}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hak akses</CardTitle>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada hak akses yang diberikan.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {permissions.map((permission) => (
                <li key={permission} className="flex items-center gap-2 text-sm">
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" />
                  </span>
                  {permission}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
