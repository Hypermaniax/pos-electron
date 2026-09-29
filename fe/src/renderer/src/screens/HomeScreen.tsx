import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BarChart3Icon,
  CarIcon,
  ChevronRightIcon,
  DoorOpenIcon,
  DownloadIcon,
  GaugeIcon,
  MegaphoneIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SquareArrowOutUpRightIcon,
  TicketIcon,
  WalletIcon,
  WavesIcon,
  ZapIcon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useShift } from '../context/ShiftContext'
import { useToast } from '@renderer/hooks/useToast'
import { listSessions, listTransactions, pingServer } from '../lib/server-api'
import type { ParkingSession, PaymentTransaction } from '@shared/types'
import { can, Permissions } from '../lib/permissions'
import { formatCurrency, formatDuration, formatTime } from '../lib/format'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

function MetricCard({
  label,
  icon,
  iconClass,
  children
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  children: React.ReactNode
}): React.JSX.Element {
  const Icon = icon
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {children}
        </div>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded border border-border bg-background',
            iconClass
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  )
}

function LaneRow({
  ok,
  title,
  detail,
  chip,
  chipClass,
  warn
}: {
  ok: boolean
  title: string
  detail: string
  chip: string
  chipClass: string
  warn?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded border border-border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            ok ? 'bg-emerald-500' : warn ? 'animate-ping bg-amber-500' : 'bg-amber-500'
          )}
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-semibold text-foreground">{title}</span>
          <span
            className={cn(
              'truncate font-mono text-[10px]',
              warn ? 'text-amber-400' : 'text-muted-foreground'
            )}
          >
            {detail}
          </span>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold',
          chipClass
        )}
      >
        {chip}
      </span>
    </div>
  )
}

function QuickAction({
  to,
  icon: Icon,
  iconClass,
  title,
  description,
  onClick
}: {
  to?: string
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  title: string
  description: string
  onClick?: () => void
}): React.JSX.Element {
  const inner = (
    <div className="flex w-full items-center justify-between rounded border border-border bg-background p-3 text-left transition-colors hover:border-border/80 hover:bg-card">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex items-center justify-center rounded border border-border bg-card p-2',
            iconClass
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-semibold text-foreground">{title}</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {description}
          </span>
        </div>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </div>
  )
  if (to)
    return (
      <Link to={to} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        {inner}
      </Link>
    )
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {inner}
    </button>
  )
}

export function HomeScreen(): React.JSX.Element {
  const { session } = useAuth()
  const { shift, summary } = useShift()
  const toast = useToast()

  const [sessions, setSessions] = useState<ParkingSession[]>([])
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [latency, setLatency] = useState<number | null>(null)
  const [hourly, setHourly] = useState<Array<[string, { in: number; out: number }]>>([])
  const [busy, setBusy] = useState(false)
  const [downloadLabel, setDownloadLabel] = useState('Unduh Laporan Shift')

  const canOperate = can(session, Permissions.SessionView)
  const canShift = can(session, Permissions.ShiftManage)

  const shiftId = shift?.id ?? null

  const refresh = useCallback(async (): Promise<void> => {
    const startedAt = performance.now()
    const [sessionsResult, txResult, pingResult] = await Promise.all([
      listSessions(100),
      listTransactions(shiftId),
      pingServer()
    ])
    const nextSessions = sessionsResult.ok ? sessionsResult.data : []
    const nextTransactions = txResult
    const nextLatency = pingResult.ok ? Math.round(performance.now() - startedAt) : null

    const buckets = new Map<string, { in: number; out: number }>()
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 3600_000)
      const key = `${String(d.getHours()).padStart(2, '0')}:00`
      buckets.set(key, { in: 0, out: 0 })
    }
    const keyFor = (iso: string): string =>
      `${String(new Date(iso).getHours()).padStart(2, '0')}:00`
    for (const item of nextSessions) {
      const bucket = buckets.get(keyFor(item.entryTime))
      if (bucket) bucket.in += 1
    }
    for (const item of nextTransactions) {
      const bucket = buckets.get(keyFor(item.paidAt ?? item.createdAt))
      if (bucket) bucket.out += 1
    }

    setSessions(nextSessions)
    setTransactions(nextTransactions)
    setLatency(nextLatency)
    setHourly([...buckets.entries()])
    setBusy(false)
  }, [shiftId])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) return refresh()
    })
    return () => {
      active = false
    }
  }, [refresh])

  const occupancy = useMemo(() => {
    const unpaid = sessions.filter((item) => item.paymentStatus !== 'PAID')
    const motor = sessions.filter((item) => item.vehicleType === 'Motor').length
    const mobil = sessions.filter((item) => item.vehicleType === 'Mobil').length
    const truk = sessions.filter((item) => item.vehicleType === 'Truk').length
    const bus = sessions.filter((item) => item.vehicleType === 'Bus').length
    return {
      total: unpaid.length,
      motor,
      mobil,
      truk,
      bus
    }
  }, [sessions])

  const methodSplit = useMemo(() => {
    if (transactions.length === 0)
      return { cash: 0, qris: 0, emoney: 0, cashPct: '0%', qrisPct: '0%', emoneyPct: '0%' }
    const total = transactions.length
    const cash = transactions.filter((item) => item.method === 'cash').length
    const qris = transactions.filter((item) => item.method === 'qr').length
    const emoney = transactions.filter((item) => item.method === 'emoney').length
    const pct = (count: number): string => `${Math.round((count / total) * 100)}%`
    return { cash, qris, emoney, cashPct: pct(cash), qrisPct: pct(qris), emoneyPct: pct(emoney) }
  }, [transactions])

  const lastFive = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt))
        .slice(0, 5),
    [transactions]
  )

  const durationFor = (item: PaymentTransaction): number => {
    if (!item.paidAt) return 0
    return Math.max(
      0,
      Math.round((new Date(item.paidAt).getTime() - new Date(item.createdAt).getTime()) / 60_000)
    )
  }

  const downloadReport = useCallback((): void => {
    if (!shift) {
      toast('Belum ada shift aktif untuk diunduh.', 'info')
      return
    }
    const lines: string[] = [
      'WAKTU,PLAT NOMOR,JENIS,METODE,TOTAL,STATUS',
      ...lastFive.map((item) =>
        [
          formatTime(item.paidAt ?? item.createdAt),
          item.plateNumber,
          item.vehicleType,
          item.method,
          item.amount,
          item.status
        ].join(',')
      )
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-shift-${shift.id.slice(0, 8)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setDownloadLabel('Laporan Terunduh')
    setTimeout(() => setDownloadLabel('Unduh Laporan Shift'), 1500)
    toast('Laporan shift diunduh (.csv).', 'success')
  }, [shift, lastFive, toast])

  const publishAnnouncement = useCallback((): void => {
    toast('Fitur broadcast VMS bel    um tersedia di backend.', 'info')
  }, [toast])

  const checkCashDrawer = useCallback((): void => {
    toast('Fitur audit kas fisik belum tersedia di backend.', 'info')
  }, [toast])

  const maxBucket = Math.max(1, ...hourly.map(([, value]) => value.in + value.out))

  return (
    <div className="flex min-h-[calc(100%-56px)] flex-col gap-3 font-mono">
      {/* ── Header Action & Context ── */}
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-cyan-400">
              <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
              TELEMETRY &amp; OPERATIONAL STATUS
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              | {session?.operator.username.toUpperCase() ?? 'GUEST'}
            </span>
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Ringkasan &amp; Status Operasional Loket
          </h1>
          <p className="font-sans text-xs text-muted-foreground">
            Ikhtisar okupansi lot, arus kendaraan masuk/keluar, pendapatan shift berjalan, dan
            pemantauan gate live.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            className="border-border bg-background font-mono text-xs hover:bg-muted/50"
            onClick={downloadReport}
          >
            <DownloadIcon className="size-4 text-muted-foreground" />
            {downloadLabel}
          </Button>
          <Button
            className="bg-orange-500 font-mono text-xs font-bold text-white shadow-md hover:bg-orange-600"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCwIcon className={cn('size-4', busy && 'animate-spin')} />
            {busy ? 'Menyegarkan...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* ── 4 Key Metric Cards ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Okupansi Parkir Real-Time" icon={CarIcon} iconClass="text-amber-400">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-bold leading-none text-foreground">
              {occupancy.total}
            </span>
            <span className="font-mono text-xs text-muted-foreground">unit di dalam</span>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">Kapasitas Lot</span>
              <span className="font-semibold text-amber-400">Kapasitas belum dikonfigurasi</span>
            </div>
            <div className="flex h-2 w-full items-end justify-between font-mono text-[10px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Motor: <strong className="text-foreground">{occupancy.motor}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Mobil: <strong className="text-foreground">{occupancy.mobil}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-cyan-400" />
                Truk/Bus:{' '}
                <strong className="text-foreground">{occupancy.truk + occupancy.bus}</strong>
              </span>
            </div>
          </div>
        </MetricCard>

        <MetricCard
          label="Total Transaksi (Shift Ini)"
          icon={ArrowRightIcon}
          iconClass="text-cyan-400"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-bold leading-none text-foreground">
              {transactions.length}
            </span>
            <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
              {shift ? 'SHIFT AKTIF' : 'TANPA SHIFT'}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">Flow Masuk / Keluar</span>
              <span className="font-bold text-cyan-400">
                {sessions.length} IN / {transactions.length} OUT
              </span>
            </div>
            <div
              className="flex h-2 w-full overflow-hidden rounded border border-border bg-background"
              title={`Masuk ${sessions.length} · Keluar ${transactions.length}`}
            >
              <div
                className="h-full bg-cyan-400"
                style={{
                  width: `${(sessions.length / Math.max(1, sessions.length + transactions.length)) * 100}%`
                }}
              />
              <div
                className="h-full bg-orange-500"
                style={{
                  width: `${(transactions.length / Math.max(1, sessions.length + transactions.length)) * 100}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-muted-foreground">
              <span>
                Durasi rata-rata:{''}
                <span className="font-medium text-foreground">
                  {formatDuration(
                    Math.round(
                      transactions.reduce((acc, item) => acc + durationFor(item), 0) /
                        Math.max(1, transactions.length)
                    )
                  )}
                </span>
              </span>
              <span className="text-emerald-400">Data Live</span>
            </div>
          </div>
        </MetricCard>

        <MetricCard label="Akumulasi Omzet Shift" icon={WalletIcon} iconClass="text-orange-400">
          <div className="flex items-baseline">
            <span className="font-heading text-xl font-bold leading-none tracking-tight text-foreground">
              {shift && summary ? formatCurrency(summary.cashTotal + summary.qrTotal) : 'Rp -'}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div
              className="flex h-2 w-full overflow-hidden rounded border border-border bg-background"
              title={`Tunai ${methodSplit.cashPct} · QRIS ${methodSplit.qrisPct} · E-Money ${methodSplit.emoneyPct}`}
            >
              <div className="h-full bg-emerald-500" style={{ width: methodSplit.cashPct }} />
              <div className="h-full bg-cyan-400" style={{ width: methodSplit.qrisPct }} />
              <div className="h-full bg-blue-300" style={{ width: methodSplit.emoneyPct }} />
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[10px]">
              <div className="rounded border border-border bg-background py-0.5">
                <span className="block text-muted-foreground">CASH</span>
                <span className="font-semibold text-emerald-400">{methodSplit.cashPct}</span>
              </div>
              <div className="rounded border border-border bg-background py-0.5">
                <span className="block text-muted-foreground">QRIS</span>
                <span className="font-semibold text-cyan-400">{methodSplit.qrisPct}</span>
              </div>
              <div className="rounded border border-border bg-background py-0.5">
                <span className="block text-muted-foreground">E-MONEY</span>
                <span className="font-semibold text-blue-300">{methodSplit.emoneyPct}</span>
              </div>
            </div>
          </div>
        </MetricCard>

        <MetricCard label="Status Gerbang & Server" icon={DoorOpenIcon} iconClass="text-amber-400">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'font-heading text-3xl font-bold leading-none',
                latency !== null ? 'text-emerald-400' : 'text-amber-400'
              )}
            >
              {latency !== null ? '1' : '0'}
            </span>
            <span className="font-mono text-xs text-foreground">/ 1 Server Terjangkau</span>
          </div>
          <div className="mt-3 flex flex-col gap-1 font-mono text-[11px]">
            <div className="flex items-center justify-between rounded border border-border bg-background px-2 py-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    latency !== null ? 'bg-emerald-500' : 'animate-ping bg-amber-500'
                  )}
                />
                Central Server Sync
              </span>
              <span
                className={cn('font-bold', latency !== null ? 'text-cyan-400' : 'text-amber-400')}
              >
                {latency !== null ? `${latency}ms RTT` : 'TERPUTUS'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5 text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Loket Ini OK
              </span>
              <span>{latency !== null ? 'Link SSL Aktif' : 'Mencoba ulang...'}</span>
            </div>
          </div>
        </MetricCard>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="flex flex-col gap-3 xl:col-span-8">
          {/* ── Chart Arus Per Jam ── */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <GaugeIcon className="size-5 text-cyan-400" />
                  <h2 className="font-heading text-sm font-bold text-foreground">
                    Arus Kendaraan Masuk &amp; Keluar Per Jam
                  </h2>
                </div>
                <p className="font-sans text-[11px] text-muted-foreground">
                  Throughput periodik operasional loket hari ini (6 jam terakhir)
                </p>
              </div>
              <div className="flex items-center gap-3 rounded border border-border bg-background px-3 py-1 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-sm bg-cyan-400" /> Masuk (In)
                </span>
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-sm bg-orange-500" /> Keluar (Out)
                </span>
              </div>
            </div>

            <div className="relative mt-2 flex w-full flex-col justify-end h-44">
              <div className="flex h-40 w-full items-end gap-2">
                {hourly.map(([key, value]) => (
                  <div key={key} className="flex h-full flex-1 flex-col justify-end gap-0.5">
                    <div
                      className="flex w-full flex-col justify-end gap-0.5"
                      style={{ minHeight: 4 }}
                    >
                      <div
                        className="w-full rounded-t bg-emerald-500/80"
                        style={{
                          height: `${(value.in / maxBucket) * 100}%`,
                          minHeight: value.in > 0 ? 4 : 0
                        }}
                        title={`Masuk ${value.in}`}
                      />
                      <div
                        className="w-full rounded-t bg-orange-500/80"
                        style={{
                          height: `${(value.out / maxBucket) * 100}%`,
                          minHeight: value.out > 0 ? 4 : 0
                        }}
                        title={`Keluar ${value.out}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex w-full justify-between pt-2 font-mono text-[11px] text-muted-foreground">
                {hourly.map(([key]) => (
                  <span key={key}>{key}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] sm:grid-cols-4">
              <div className="flex flex-col rounded border border-border bg-background p-2">
                <span className="text-muted-foreground">TOTAL MASUK</span>
                <span className="mt-0.5 font-bold text-cyan-400">{sessions.length} KENDARAAN</span>
              </div>
              <div className="flex flex-col rounded border border-border bg-background p-2">
                <span className="text-muted-foreground">TOTAL KELUAR</span>
                <span className="mt-0.5 font-bold text-orange-400">
                  {transactions.length} TRANSAKSI
                </span>
              </div>
              <div className="flex flex-col rounded border border-border bg-background p-2">
                <span className="text-muted-foreground">OMZET CASH</span>
                <span className="mt-0.5 font-bold text-emerald-400">
                  {formatCurrency(summary?.cashTotal ?? 0)}
                </span>
              </div>
              <div className="flex flex-col rounded border border-border bg-background p-2">
                <span className="text-muted-foreground">OMZET QRIS</span>
                <span className="mt-0.5 font-bold text-cyan-400">
                  {formatCurrency(summary?.qrTotal ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* ── 5 Transaksi Terakhir ── */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="size-5 text-emerald-400" />
                <h2 className="font-heading text-sm font-bold text-foreground">
                  {lastFive.length > 0
                    ? `${lastFive.length} Transaksi Terakhir Selesai`
                    : 'Transaksi Terakhir'}
                </h2>
              </div>
              <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                Auto-Update Live Feed
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[860px] whitespace-nowrap text-left font-mono text-xs">
                <thead>
                  <tr className="rounded bg-black/40 text-muted-foreground">
                    <th className="rounded-l px-3 py-2.5">WAKTU</th>
                    <th className="px-3 py-2.5">PLAT NOMOR</th>
                    <th className="px-3 py-2.5">GATE POS</th>
                    <th className="px-3 py-2.5">JENIS</th>
                    <th className="px-3 py-2.5">DURASI</th>
                    <th className="px-3 py-2.5 text-right">TOTAL TARIF</th>
                    <th className="px-3 py-2.5 text-center">METODE</th>
                    <th className="rounded-r px-3 py-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {lastFive.map((item, index) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-border/60 transition-colors last:border-0 hover:bg-cyan-500/5',
                        index % 2 === 0 ? 'bg-card' : 'bg-background/60'
                      )}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatTime(item.paidAt ?? item.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-bold tracking-wider text-foreground">
                        {item.plateNumber}
                      </td>
                      <td className="px-3 py-2.5 text-cyan-400">EXIT-01</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CarIcon className="size-3.5 text-muted-foreground" />
                          {item.vehicleType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDuration(durationFor(item))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-foreground">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="rounded border border-border bg-background px-2 py-0.5 font-bold text-cyan-400">
                          {item.method}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 font-bold',
                            item.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          )}
                        >
                          {item.status === 'PAID' ? 'LUNAS' : item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {lastFive.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-muted-foreground">
                        Belum ada transaksi shift ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="flex flex-col gap-3 xl:col-span-4">
          {/* Status Jalur & Device */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WavesIcon className="size-5 text-blue-300" />
                <h2 className="font-heading text-sm font-bold text-foreground">
                  Status Jalur &amp; Device
                </h2>
              </div>
              <span
                className={cn(
                  'size-2.5 rounded-full',
                  latency !== null ? 'bg-emerald-500' : 'animate-ping bg-amber-500'
                )}
              />
            </div>
            <p className="-mt-1 font-sans text-[11px] text-muted-foreground">
              Kondisi komunikasi serial COM, kamera OCR/ANPR, barrier gate controller, dan central
              sync link.
            </p>
            <div className="mt-1 flex flex-col gap-1.5">
              <LaneRow
                ok
                title="Exit Lane 01 (Utama · Loket Ini)"
                detail="PRINTER: OK • GATE: OK • COM3"
                chip="ONLINE"
                chipClass="text-emerald-400"
              />
              <LaneRow
                ok={false}
                warn
                title="Exit Lane 02 (Otomatis)"
                detail="ANPR CAM: menunggu integrasi perangkat"
                chip="WARNING"
                chipClass="text-amber-400"
              />
              <LaneRow
                ok={false}
                warn
                title="Entry Lane 01 (Manless)"
                detail="DISPENSER: menunggu integrasi perangkat"
                chip="PENDING"
                chipClass="text-amber-400"
              />
              <LaneRow
                ok={false}
                warn
                title="Entry Lane 02 (Manless)"
                detail="DISPENSER: menunggu integrasi perangkat"
                chip="PENDING"
                chipClass="text-amber-400"
              />
              <LaneRow
                ok={latency !== null}
                title="Central Server Sync"
                detail={
                  latency !== null
                    ? `SYNC-DELAY: ${latency}ms • HTTPS SSL`
                    : 'PROBE: gagal menjangkau server'
                }
                chip={latency !== null ? 'CONNECTED' : 'RETRY'}
                chipClass={latency !== null ? 'text-cyan-400' : 'text-amber-400'}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ZapIcon className="size-5 text-orange-400" />
              <h2 className="font-heading text-sm font-bold text-foreground">Quick Actions</h2>
            </div>
            <div className="mt-1 flex flex-col gap-2">
              <QuickAction
                icon={TicketIcon}
                iconClass="text-cyan-400"
                title="Buka Loket Bayar"
                description="Cari tagihan dan proses pembayaran."
                to={canOperate ? '/loket' : undefined}
              />
              <QuickAction
                icon={BarChart3Icon}
                iconClass="text-orange-400"
                title="Kelola Shift"
                description={
                  shift
                    ? 'Tutup shift berjalan & serah terima.'
                    : 'Buka sesi shift baru & kas awal.'
                }
                to={canShift ? '/shift' : undefined}
              />
              <QuickAction
                icon={MegaphoneIcon}
                iconClass="text-amber-400"
                title="Broadcast Pengumuman"
                description="Kirim teks VMS atau peringatan audio."
                onClick={publishAnnouncement}
              />
              <QuickAction
                icon={WalletIcon}
                iconClass="text-amber-400"
                title="Cek Kas Fisik Laci"
                description="Buka laci kasir tunai (Audit Cash)."
                onClick={checkCashDrawer}
              />
              {lastFive.length > 0 && (
                <QuickAction
                  icon={SquareArrowOutUpRightIcon}
                  iconClass="text-emerald-400"
                  title="Riwayat lengkap"
                  description="Transaksi pada shift aktif."
                  to={can(session, Permissions.HistoryView) ? '/riwayat' : undefined}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
