import type React from 'react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  Bike,
  CarFront,
  ChartColumn,
  CloudDownload,
  Cpu,
  CreditCard,
  IdCard,
  LayoutDashboard,
  Megaphone,
  Monitor,
  ReceiptText,
  RefreshCw,
  Settings,
  Truck,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  Zap
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PaymentTransaction } from '@shared/types'
import { listTransactions } from '../lib/server-api'
import { useConfig } from '../context/ConfigContext'
import { useShift } from '../context/ShiftContext'
import { useToast } from '../hooks/useToast'
import { formatCurrency } from '../lib/format'
import { methodLabel } from '../mock/store'
import { cn } from '@renderer/lib/utils'

interface DashboardTopNavItem {
  label: string
  to: string
  icon: LucideIcon
}

// Ubah teks & rute tombol navigasi atas di sini.
// Tambah halaman baru = tambah satu baris { label, to, icon }.
const DASHBOARD_TOP_NAV: DashboardTopNavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Loket Bayar', to: '/loket', icon: Banknote },
  { label: 'Perangkat', to: '/perangkat', icon: Cpu },
  { label: 'Kiosk', to: '/kiosk', icon: Monitor },
  { label: 'Shift', to: '/shift', icon: IdCard },
  { label: 'Riwayat', to: '/riwayat', icon: ReceiptText },
  { label: 'Personel & Member', to: '/personel', icon: Users },
  { label: 'Karyawan', to: '/karyawan', icon: UserPlus },
  { label: 'Member', to: '/member', icon: CreditCard },
  { label: 'Pembayaran', to: '/payment', icon: Wallet },
  { label: 'Pengaturan', to: '/pengaturan', icon: Settings }
]

function VehicleIcon({ type, className }: { type: string; className?: string }): React.JSX.Element {
  const t = type.toLowerCase()
  if (t.includes('motor')) return <Bike className={className} aria-hidden />
  if (t.includes('truk') || t.includes('box') || t.includes('bus')) {
    return <Truck className={className} aria-hidden />
  }
  return <CarFront className={className} aria-hidden />
}

function statusBadge(status: PaymentTransaction['status']): { label: string; classes: string } {
  switch (status) {
    case 'PAID':
      return { label: 'LUNAS', classes: 'bg-[#22c55e]/20 text-[#22c55e]' }
    case 'PENDING_QR':
      return { label: 'TUNGGU QR', classes: 'bg-[#f59e0b]/20 text-[#f59e0b]' }
    case 'PENDING_EMONEY':
      return { label: 'PROSES E-MONEY', classes: 'bg-[#f59e0b]/20 text-[#f59e0b]' }
    case 'FAILED':
      return { label: 'GAGAL', classes: 'bg-[#ef4444]/20 text-[#ef4444]' }
    case 'EXPIRED':
      return { label: 'KEDALUWARSA', classes: 'bg-[#ef4444]/20 text-[#ef4444]' }
    case 'CANCELLED':
      return { label: 'BATAL', classes: 'bg-[#a1a1aa]/20 text-[#a1a1aa]' }
    default:
      return { label: 'BELUM BAYAR', classes: 'bg-[#a1a1aa]/20 text-[#a1a1aa]' }
  }
}

function methodBadgeClasses(method: PaymentTransaction['method']): string {
  switch (method) {
    case 'cash':
      return 'text-[#ffb690]'
    case 'qr':
      return 'text-[#4fc1ff]'
    default:
      return 'text-[#60a5fa]'
  }
}

function timeOfDay(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function DashboardScreen(): React.JSX.Element {
  const { shift, summary, refresh } = useShift()
  const { config } = useConfig()
  const toast = useToast()
  const navigate = useNavigate()

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const loadTransactions = async (): Promise<PaymentTransaction[]> => {
    const rows = await listTransactions(shift?.id ?? null)
    setTransactions(rows)
    setLoaded(true)
    return rows
  }

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await refresh()
      await loadTransactions()
      toast('Data operasional dimuat ulang.', 'success')
    } finally {
      setRefreshing(false)
    }
  }

  const handleDownload = async (): Promise<void> => {
    setDownloading(true)
    try {
      const rows = loaded ? transactions : await loadTransactions()
      const header = 'waktu,tiket,plat,jenis,metode,total,status\n'
      const body = rows
        .map((tx) =>
          [tx.createdAt, tx.ticketNumber, tx.plateNumber, tx.vehicleType, tx.method, tx.amount, tx.status].join(',')
        )
        .join('\n')
      const url = URL.createObjectURL(new Blob([header + body], { type: 'text/csv' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `laporan-shift-${shift?.id ?? 'terkini'}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast('Laporan shift diunduh sebagai CSV.', 'success')
    } finally {
      setDownloading(false)
    }
  }

  const paidRows = transactions.filter((tx) => tx.status === 'PAID')
  const emoneyPaid = paidRows.filter((tx) => tx.method === 'emoney')
  const emoneyCount = emoneyPaid.length
  const emoneyTotal = emoneyPaid.reduce((total, tx) => total + tx.amount, 0)

  const txTotal = (summary?.cashCount ?? 0) + (summary?.qrSuccessCount ?? 0) + emoneyCount
  const omzet = (summary?.cashTotal ?? 0) + (summary?.qrTotal ?? 0) + emoneyTotal
  const cashShare = omzet > 0 ? Math.round(((summary?.cashTotal ?? 0) / omzet) * 100) : 0
  const qrShare = omzet > 0 ? Math.round(((summary?.qrTotal ?? 0) / omzet) * 100) : 0
  const emoneyShare = Math.max(0, 100 - cashShare - qrShare)
  const latest = transactions.slice(0, 5)
  const hubLabel = (config?.deviceId ?? 'HUB-WEST-GATEWAY-01').toUpperCase()

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Top Action & Context Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#1e1e1e] p-6 shadow-sm md:flex-row md:items-end">
        <div className="flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-[#1f1f22] px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-[#4fc1ff]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#4fc1ff]" />
              Telemetry &amp; Operational Telemetry
            </span>
            <span className="text-xs text-[#a1a1aa]">| {hubLabel}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Ringkasan &amp; Status Operasional Loket
          </h1>
          <p className="text-sm leading-relaxed text-[#d4d4d4]">
            Ikhtisar okupansi lot, arus kendaraan masuk/keluar, pendapatan shift berjalan, dan pemantauan gate live.
          </p>
          <p className="font-mono text-[11px] text-[#a1a1aa]">
            {shift
              ? `Shift aktif: ${shift.id} • ${shift.openedByName} • buka ${timeOfDay(shift.openedAt)}`
              : 'Tidak ada shift aktif. Buka shift di menu Shift.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#1f1f22] px-4 py-2.5 text-sm text-white shadow-sm transition-all hover:bg-[#2a2a2d] active:translate-y-0.5 disabled:opacity-60"
          >
            <CloudDownload className="size-[18px] text-[#a1a1aa]" aria-hidden />
            <span>{downloading ? 'Mengunduh...' : 'Unduh Laporan Shift'}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#f97316] px-5 py-2.5 text-sm text-white shadow-md transition-all hover:bg-[#ea580c] active:translate-y-0.5 disabled:opacity-75"
          >
            <RefreshCw className={cn('size-[18px]', refreshing && 'animate-spin')} aria-hidden />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Top page navigation — ubah teks & rute di DASHBOARD_TOP_NAV di atas */}
      <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center gap-2">
        {DASHBOARD_TOP_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all active:translate-y-0.5',
                isActive
                  ? 'bg-[#264f78] font-bold text-white shadow-sm'
                  : 'bg-[#1f1f22] font-medium text-[#a1a1aa] hover:bg-[#2a2a2d] hover:text-white'
              )
            }
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* 4 Key Telemetry Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1: Okupansi Realtime (telemetri perangkat, tanpa API) */}
        <div className="flex flex-col justify-between rounded-xl bg-[#1e1e1e] p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Okupansi Parkir Real-Time</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl leading-none text-white">482</span>
                <span className="text-sm text-[#a1a1aa]">/ 600 Lot</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#f59e0b]">
              <CarFront className="size-[22px]" aria-hidden />
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#d4d4d4]">Kapasitas Lapangan</span>
              <span className="font-semibold text-[#f59e0b]">80.3% Terisi</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded bg-[#1f1f22]">
              <div className="h-full bg-[#22c55e]" style={{ width: '55%' }} />
              <div className="h-full bg-[#f59e0b]" style={{ width: '25.3%' }} />
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-[#a1a1aa]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#22c55e]" />Motor: <strong className="text-white">310</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#f59e0b]" />Mobil: <strong className="text-white">172</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Transaksi Shift (data nyata) */}
        <div className="flex flex-col justify-between rounded-xl bg-[#1e1e1e] p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Total Transaksi (Shift Berjalan)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl leading-none text-white">{txTotal.toLocaleString('id-ID')}</span>
                <span className="rounded bg-[#1f1f22] px-1.5 py-0.5 text-xs font-semibold text-[#22c55e]">LIVE</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#4fc1ff]">
              <ArrowLeftRight className="size-[22px]" aria-hidden />
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#d4d4d4]">Cash / QRIS</span>
              <span className="font-mono text-[#4fc1ff]">
                {summary?.cashCount ?? 0} CASH / {(summary?.qrSuccessCount ?? 0) + emoneyCount} NON-TUNAI
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded bg-[#1f1f22]">
              <div
                className="h-full bg-[#4fc1ff]"
                style={{ width: `${txTotal > 0 ? Math.round(((summary?.cashCount ?? 0) / txTotal) * 100) : 0}%` }}
              />
              <div
                className="h-full bg-[#569cd6]"
                style={{ width: `${txTotal > 0 ? Math.round((((summary?.qrSuccessCount ?? 0) + emoneyCount) / txTotal) * 100) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-[#a1a1aa]">
              <span>Batal: <span className="font-medium text-white">{summary?.cancelledCount ?? 0}</span></span>
              <span className="text-[#22c55e]">Aliran Lancar</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Akumulasi Omzet (data nyata) */}
        <div className="flex flex-col justify-between rounded-xl bg-[#1e1e1e] p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Akumulasi Omzet Hari Ini</span>
              <div className="mt-1 flex items-baseline">
                <span className="text-xl font-bold leading-none tracking-tight text-white">{formatCurrency(omzet)}</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#ffb690]">
              <Banknote className="size-[22px]" aria-hidden />
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-1.5">
            <div className="flex h-2 w-full overflow-hidden rounded bg-[#1f1f22]">
              <div className="h-full bg-[#22c55e]" style={{ width: `${cashShare}%` }} title={`Tunai ${cashShare}%`} />
              <div className="h-full bg-[#4fc1ff]" style={{ width: `${qrShare}%` }} title={`QRIS ${qrShare}%`} />
              <div className="h-full bg-[#60a5fa]" style={{ width: `${emoneyShare}%` }} title={`E-Money ${emoneyShare}%`} />
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1 text-center text-xs">
              <div className="rounded bg-[#1f1f22] py-0.5">
                <span className="block text-[10px] text-[#a1a1aa]">CASH</span>
                <span className="font-semibold text-[#22c55e]">{cashShare}%</span>
              </div>
              <div className="rounded bg-[#1f1f22] py-0.5">
                <span className="block text-[10px] text-[#a1a1aa]">QRIS</span>
                <span className="font-semibold text-[#4fc1ff]">{qrShare}%</span>
              </div>
              <div className="rounded bg-[#1f1f22] py-0.5">
                <span className="block text-[10px] text-[#a1a1aa]">E-MONEY</span>
                <span className="font-semibold text-[#60a5fa]">{emoneyShare}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4: Status Gerbang (telemetri perangkat, tanpa API) */}
        <div className="flex flex-col justify-between rounded-xl bg-[#1e1e1e] p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Status Gerbang Loket</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl leading-none text-[#22c55e]">5</span>
                <span className="text-sm text-white">/ 6 Ready</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#f59e0b]">
              <Warehouse className="size-[22px]" aria-hidden />
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between rounded bg-[#1f1f22] px-2 py-1 text-xs">
              <span className="flex items-center gap-1.5 text-[#d4d4d4]">
                <span className="size-1.5 animate-ping rounded-full bg-[#f59e0b]" />
                Gate Timur 02
              </span>
              <span className="font-mono font-bold text-[#f59e0b]">128ms LAT</span>
            </div>
            <div className="flex items-center justify-between pt-0.5 text-xs text-[#a1a1aa]">
              <span className="flex items-center gap-1 text-[#22c55e]">
                <span className="size-1.5 rounded-full bg-[#22c55e]" /> Gate Barat In/Out OK
              </span>
              <span>Palang Auto Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Operational Grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Column */}
        <div className="flex flex-col gap-4 xl:col-span-8">
          {/* Throughput Chart */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-6 shadow-sm">
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <ChartColumn className="size-5 text-[#4fc1ff]" aria-hidden />
                  <h2 className="text-base font-bold text-white">Arus Kendaraan Masuk &amp; Keluar Per Jam</h2>
                </div>
                <p className="text-xs text-[#a1a1aa]">Throughput periodik operasional loket hari ini (06:00 - 15:00 WIB)</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-[#1f1f22] px-4 py-1 text-xs">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="size-2.5 rounded-sm bg-[#4fc1ff]" /> Masuk (In)
                </span>
                <span className="flex items-center gap-1.5 text-white">
                  <span className="size-2.5 rounded-sm bg-[#f97316]" /> Keluar (Out)
                </span>
              </div>
            </div>
            <div className="relative mt-2 flex h-48 w-full flex-col justify-end">
              <svg className="h-40 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 900 160" aria-hidden>
                <defs>
                  <linearGradient id="gradIn" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#4fc1ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#4fc1ff" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="gradOut" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line stroke="#27272a" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="900" y1="30" y2="30" />
                <line stroke="#27272a" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="900" y1="80" y2="80" />
                <line stroke="#27272a" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="900" y1="130" y2="130" />
                <polygon fill="url(#gradIn)" points="0,150 0,135 90,110 180,60 270,30 360,75 450,45 540,25 630,70 720,40 810,95 900,105 900,150" />
                <polyline fill="none" points="0,135 90,110 180,60 270,30 360,75 450,45 540,25 630,70 720,40 810,95 900,105" stroke="#4fc1ff" strokeLinecap="round" strokeWidth="2.5" />
                <polygon fill="url(#gradOut)" points="0,150 0,145 90,140 180,120 270,90 360,100 450,80 540,55 630,45 720,35 810,65 900,70 900,150" />
                <polyline fill="none" points="0,145 90,140 180,120 270,90 360,100 450,80 540,55 630,45 720,35 810,65 900,70" stroke="#f97316" strokeLinecap="round" strokeWidth="2.5" />
                <circle className="animate-pulse" cx="270" cy="30" fill="#4fc1ff" r="4" />
                <circle cx="540" cy="25" fill="#4fc1ff" r="4" />
                <circle cx="720" cy="35" fill="#f97316" r="4" />
              </svg>
              <div className="flex w-full justify-between pt-2 text-xs text-[#a1a1aa]">
                {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((hour) => (
                  <span key={hour}>{hour}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs sm:grid-cols-4">
              {[
                { label: 'WAKTU SIBUK (PEAK)', value: '11:00 - 12:30 WIB', tone: 'text-white' },
                { label: 'VOLUME TERBESAR', value: '184 KENDARAAN/JAM', tone: 'text-[#4fc1ff]' },
                { label: 'KECEPATAN PALANG', value: '1.8 DETIK / TAP', tone: 'text-[#22c55e]' },
                { label: 'KENDARAAN MENGINAP', value: '14 UNIT AKTIF', tone: 'text-[#f59e0b]' }
              ].map((item) => (
                <div key={item.label} className="flex flex-col rounded-lg bg-[#1f1f22] p-2.5">
                  <span className="text-[11px] text-[#a1a1aa]">{item.label}</span>
                  <span className={cn('mt-0.5 font-bold', item.tone)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Transactions Table (data nyata) */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-5 text-[#22c55e]" aria-hidden />
                <h2 className="text-base font-bold text-white">5 Transaksi Terakhir Selesai</h2>
              </div>
              <span className="rounded bg-[#1f1f22] px-2 py-0.5 text-xs text-[#a1a1aa]">
                {loaded ? 'Auto-Update Live Feed' : 'Tekan Refresh Data'}
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              {!loaded ? (
                <p className="py-8 text-center font-mono text-xs text-[#a1a1aa]">
                  Belum dimuat. Klik &quot;Refresh Data&quot; untuk mengambil transaksi shift berjalan.
                </p>
              ) : latest.length === 0 ? (
                <p className="py-8 text-center font-mono text-xs text-[#a1a1aa]">
                  Belum ada transaksi pada shift ini.
                </p>
              ) : (
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead>
                    <tr className="bg-[#0a0a0a] text-xs text-[#a1a1aa]">
                      <th className="rounded-l px-4 py-2.5">WAKTU</th>
                      <th className="px-4 py-2.5">PLAT NOMOR</th>
                      <th className="px-4 py-2.5">GATE POS</th>
                      <th className="px-4 py-2.5">JENIS</th>
                      <th className="px-4 py-2.5 text-right">TOTAL TARIF</th>
                      <th className="px-4 py-2.5 text-center">METODE</th>
                      <th className="rounded-r px-4 py-2.5 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((tx, index) => {
                      const badge = statusBadge(tx.status)
                      return (
                        <tr
                          key={tx.id}
                          className={cn(
                            'transition-colors hover:bg-[#264f78]/40',
                            index % 2 === 0 ? 'bg-[#18181b]' : 'bg-[#1e1e1e]'
                          )}
                        >
                          <td className="px-4 py-2.5 font-mono text-[#d4d4d4]">{timeOfDay(tx.createdAt)}</td>
                          <td className="px-4 py-2.5 text-sm font-bold tracking-wider text-white">{tx.plateNumber}</td>
                          <td className="px-4 py-2.5 font-mono text-[#4fc1ff]">
                            {shift?.laneName ?? config?.laneName ?? '-'}
                          </td>
                          <td className="px-4 py-2.5 text-[#d4d4d4]">
                            <span className="flex items-center gap-1.5">
                              <VehicleIcon type={tx.vehicleType} className="size-4 text-[#a1a1aa]" />
                              {tx.vehicleType}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-white">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn('rounded bg-[#1f1f22] px-2 py-0.5 text-xs font-bold', methodBadgeClasses(tx.method))}>
                              {methodLabel(tx.method).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn('rounded px-2 py-0.5 text-xs font-bold', badge.classes)}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          {/* Status Jalur & Device (telemetri perangkat, tanpa API) */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-[#7bd0ff]" aria-hidden />
                <h2 className="text-base font-bold text-white">Status Jalur &amp; Device</h2>
              </div>
              <span className="size-2.5 rounded-full bg-[#22c55e]" />
            </div>
            <p className="-mt-1 text-xs text-[#a1a1aa]">
              Kondisi komunikasi serial COM, kamera OCR/ANPR, barrier gate controller, dan central sync link.
            </p>
            <div className="mt-1 flex flex-col gap-2">
              {[
                { name: 'Exit Lane 01 (Utama)', detail: 'PRINTER: OK • GATE: OK • COM3', dot: 'bg-[#22c55e]', pill: 'ONLINE', pillTone: 'text-[#22c55e]' },
                { name: 'Exit Lane 02 (Otomatis)', detail: 'ANPR CAM: DIRTY LENS / BLUR', dot: 'bg-[#f59e0b] animate-ping', pill: 'WARNING', pillTone: 'text-[#f59e0b]' },
                { name: 'Entry Lane 01 (Manless)', detail: 'DISPENSER: OK • ROLLS: 88%', dot: 'bg-[#22c55e]', pill: 'ONLINE', pillTone: 'text-[#22c55e]' },
                { name: 'Entry Lane 02 (Manless)', detail: 'DISPENSER: OK • ROLLS: 94%', dot: 'bg-[#22c55e]', pill: 'ONLINE', pillTone: 'text-[#22c55e]' },
                { name: 'Central Server Sync', detail: 'SYNC-DELAY: 12ms • HTTPS SSL', dot: 'bg-[#22c55e]', pill: 'CONNECTED', pillTone: 'text-[#4fc1ff]' }
              ].map((lane) => (
                <div key={lane.name} className="flex items-center justify-between rounded-lg bg-[#1f1f22] p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', lane.dot)} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{lane.name}</span>
                      <span className="font-mono text-[11px] text-[#a1a1aa]">{lane.detail}</span>
                    </div>
                  </div>
                  <span className={cn('rounded bg-[#1e1e1e] px-2 py-0.5 text-xs font-bold', lane.pillTone)}>
                    {lane.pill}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Quick Actions */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-[#f97316]" aria-hidden />
              <h2 className="text-base font-bold text-white">Quick Actions Supervisor</h2>
            </div>
            <div className="mt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/shift')}
                className="group flex w-full cursor-pointer items-center justify-between rounded-lg bg-[#1f1f22] p-3 text-left text-white transition-colors hover:bg-[#264f78]/60"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#18181b] p-2 text-[#4fc1ff] transition-transform group-hover:scale-105">
                    <IdCard className="size-[18px]" aria-hidden />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Buka Sesi Shift Baru</span>
                    <span className="text-xs text-[#a1a1aa]">Tutup shift berjalan &amp; serah terima</span>
                  </div>
                </div>
                <span className="text-lg text-[#a1a1aa] transition-colors group-hover:text-white">›</span>
              </button>
              <button
                type="button"
                onClick={() => toast('Perintah audit laci kasir dikirim ke perangkat.', 'info')}
                className="group flex w-full cursor-pointer items-center justify-between rounded-lg bg-[#1f1f22] p-3 text-left text-white transition-colors hover:bg-[#264f78]/60"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#18181b] p-2 text-[#ffb690] transition-transform group-hover:scale-105">
                    <Banknote className="size-[18px]" aria-hidden />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Cek Kas Fisik Laci</span>
                    <span className="text-xs text-[#a1a1aa]">Buka laci kasir tunai (Audit Cash)</span>
                  </div>
                </div>
                <span className="text-lg text-[#a1a1aa] transition-colors group-hover:text-white">›</span>
              </button>
              <button
                type="button"
                onClick={() => toast('Broadcast VMS / pengumuman gate dikirim.', 'info')}
                className="group flex w-full cursor-pointer items-center justify-between rounded-lg bg-[#1f1f22] p-3 text-left text-white transition-colors hover:bg-[#264f78]/60"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#18181b] p-2 text-[#f59e0b] transition-transform group-hover:scale-105">
                    <Megaphone className="size-[18px]" aria-hidden />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Broadcast Pengumuman</span>
                    <span className="text-xs text-[#a1a1aa]">Kirim teks VMS atau peringatan audio</span>
                  </div>
                </div>
                <span className="text-lg text-[#a1a1aa] transition-colors group-hover:text-white">›</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
