import type React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Banknote,
  BellRing,
  CircleCheck,
  CirclePause,
  CreditCard,
  Download,
  Gauge,
  Lightbulb,
  Nfc,
  QrCode,
  ReceiptText,
  RefreshCw,
  SlidersHorizontal,
  TriangleAlert,
  Wallet
} from 'lucide-react'
import { pingServer } from '../lib/server-api'
import { useToast } from '../hooks/useToast'
import { cn } from '@renderer/lib/utils'

type ChannelId = 'cash' | 'qris' | 'emoney' | 'edc'

interface Incident {
  id: number
  tag: string
  tone: 'warn' | 'info' | 'ok' | 'muted'
  time: string
  title: string
  body: string
  highlight?: string
  recommendation?: string
}

const CHANNEL_META: Record<ChannelId, { name: string; desc: string; chip: string }> = {
  cash: { name: 'Uang Tunai (Cash)', desc: 'Transaksional fisik langsung di bilik booth keluar', chip: 'TUNAI' },
  qris: { name: 'QRIS Dinamis Multi-Acquirer', desc: 'ASPI QRIS CPM & MPM, settlement langsung ke rekening pengelola', chip: 'QRIS' },
  emoney: { name: 'Kartu Uang Elektronik (SAM Box)', desc: 'Mandiri e-Money, Flazz BCA, BNI TapCash, BRIZZI', chip: 'E-MONEY' },
  edc: { name: 'EDC / Kartu Debit Perbankan', desc: 'Jalur sekunder manual jika sistem QRIS / TapCash mengalami blackout', chip: 'DEBIT' }
}

const SAM_SLOTS = ['MANDIRI', 'BCA FLAZZ', 'BNI TAPCASH', 'BRIZZI']

const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 1,
    tag: 'DEGRADASI PROVIDER',
    tone: 'warn',
    time: '14:32 WIB',
    title: 'Kendala Provider OVO / Grab',
    body: 'Tingkat kegagalan QRIS penerbit OVO meningkat ke 28% akibat lonjakan latensi payment gateway pihak ketiga.',
    recommendation: 'Arahkan pengunjung membayar via Tunai, GoPay, atau E-Money Tap langsung di gate.'
  },
  {
    id: 2,
    tag: 'MAINTENANCE SELESAI',
    tone: 'info',
    time: '13:15 WIB',
    title: 'Reader SAM BCA Flazz Pulih Normal',
    body: 'Reader SAM Module Slot 2 telah selesai melakukan re-keying session. Rata-rata response time kartu Flazz kembali stabil pada 1.2 detik.'
  },
  {
    id: 3,
    tag: 'SINKRONISASI HOST',
    tone: 'ok',
    time: '11:00 WIB',
    title: 'Mandiri e-Money Host OK',
    body: 'Koneksi host offline sync 100% tersinkronisasi. 1.284 transaksi kliring batch pagi berhasil diunggah tanpa anomali data.'
  },
  {
    id: 4,
    tag: 'HISTORI TERSENTEL',
    tone: 'muted',
    time: '08:45 WIB',
    title: 'QRIS Timeout Resolved',
    body: 'Spike latensi gateway Telkomsel backbone telah kembali normal (<40ms). Tidak ada antrean tiket tertahan di Booth 1 & Booth 2.'
  }
]

const TONE_CLASSES: Record<Incident['tone'], { border: string; badge: string }> = {
  warn: { border: 'border-[#f59e0b]', badge: 'bg-[#f59e0b]/20 text-[#f59e0b]' },
  info: { border: 'border-[#38bdf8]', badge: 'bg-[#38bdf8]/20 text-[#38bdf8]' },
  ok: { border: 'border-[#22c55e]', badge: 'bg-[#22c55e]/20 text-[#22c55e]' },
  muted: { border: 'border-[#27272a]', badge: 'bg-[#1f1f22] text-[#a1a1aa]' }
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors', on ? 'bg-[#f97316]' : 'bg-[#1f1f22]')}
    >
      <span className={cn('pointer-events-none absolute left-[2px] top-[2px] inline-block size-5 rounded-full bg-white shadow transition-all', on && 'translate-x-full')} />
    </button>
  )
}

export function PaymentScreen(): React.JSX.Element {
  const toast = useToast()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Record<ChannelId, boolean>>({ cash: true, qris: true, emoney: true, edc: false })
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [broadcastSent, setBroadcastSent] = useState(false)

  const activeCount = (Object.keys(channels) as ChannelId[]).filter((c) => channels[c]).length

  const toggle = (id: ChannelId): void => {
    setChannels((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      toast(`Kanal ${CHANNEL_META[id].name} ${next[id] ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}.`, next[id] ? 'success' : 'info')
      return next
    })
  }

  const handleSync = async (): Promise<void> => {
    if (syncing) return
    setSyncing(true)
    try {
      const result = await pingServer()
      if (result.ok) {
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        setLastSync(`${time} • v${result.data.version} • DB ${result.data.db}`)
        toast(`Gateway tersinkron: ${result.data.status} (v${result.data.version}).`, 'success')
      } else {
        toast(`Sinkronisasi gagal: ${result.error.message}`, 'error')
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleBroadcast = (): void => {
    if (broadcastSent) return
    setBroadcastSent(true)
    toast('Pesan kendala disinkronkan ke layar operator booth.', 'success')
    window.setTimeout(() => setBroadcastSent(false), 2500)
  }

  const handleExport = (): void => {
    const header = 'waktu,tag,judul,detail\n'
    const body = INITIAL_INCIDENTS.map((i) => `"${i.time}","${i.tag}","${i.title}","${i.body}"`).join('\n')
    const url = URL.createObjectURL(new Blob([header + body], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'incident-feed.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast('Incident feed diunduh sebagai CSV.', 'success')
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#1e1e1e] p-5 shadow-md lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[#1f1f22] px-2 py-0.5 text-xs uppercase tracking-wider text-[#f97316]">
              Payment Gateway &amp; System Resilience
            </span>
            <span className="flex items-center gap-1.5 rounded bg-[#22c55e]/10 px-2 py-0.5 text-xs text-[#22c55e]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" />
              CLUSTER NODE #03 ONLINE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Aktivasi Fitur Pembayaran &amp; Health Feed</h1>
          <p className="max-w-3xl text-sm text-[#a1a1aa]">
            Pengelolaan kanal pembayaran loket (Tunai, QRIS, E-Money) serta pemantauan live incident dan kendala provider perbankan/e-wallet.
          </p>
          {lastSync && <p className="font-mono text-[11px] text-[#4fc1ff]">Sinkron terakhir: {lastSync}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/riwayat')}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#1f1f22] px-5 py-2.5 text-sm text-[#d4d4d4] transition-colors hover:bg-[#264f78] hover:text-white"
          >
            <ReceiptText className="size-[18px]" aria-hidden />
            Audit Log Transaksi
          </button>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#f97316] px-5 py-2.5 text-sm text-white shadow-sm transition-colors hover:bg-[#ea580c] disabled:opacity-70"
          >
            <RefreshCw className={cn('size-[18px]', syncing && 'animate-spin')} aria-hidden />
            Sinkronkan Status Gateway
          </button>
        </div>
      </div>

      {/* KPI cards (telemetri mock, tanpa API) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Kanal Aktif</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl text-white">{activeCount}</span>
                <span className="text-sm text-[#22c55e]">/ 4 Konfigurasi</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#4fc1ff]">
              <Wallet className="size-6" aria-hidden />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 pt-1">
            {(Object.keys(CHANNEL_META) as ChannelId[]).map((c) => (
              <span key={c} className={cn('rounded bg-[#1f1f22] px-2 py-0.5 text-xs', channels[c] ? 'text-white' : 'text-[#a1a1aa]/50 line-through')}>
                {CHANNEL_META[c].chip}
              </span>
            ))}
          </div>
        </div>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Tingkat Keberhasilan</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl text-[#22c55e]">99.4%</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#22c55e]">
              <BadgeCheck className="size-6" aria-hidden />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-1 text-xs text-[#a1a1aa]">
            <span>3.420 Sukses</span>
            <span className="font-medium text-[#ef4444]">21 Gagal Hari Ini</span>
          </div>
        </div>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Rata-rata Settlement</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl text-[#4fc1ff]">2.1s</span>
                <span className="text-xs text-[#a1a1aa]">Avg Response</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#4fc1ff]">
              <Gauge className="size-6" aria-hidden />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-1 text-xs">
            <span className="text-[#a1a1aa]">Benchmark Loket: &lt; 3.0s</span>
            <span className="text-[#22c55e]">ULTRA LOW LATENCY</span>
          </div>
        </div>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-[#a1a1aa]">Status Incident Provider</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl text-[#f59e0b]">1</span>
                <span className="text-xs text-[#f59e0b]">Gangguan Aktif</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#1f1f22] p-2 text-[#f59e0b]">
              <TriangleAlert className="size-6" aria-hidden />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 truncate pt-1 text-xs text-[#f59e0b]">
            <span className="size-2 shrink-0 rounded-full bg-[#f59e0b]" />
            <span className="truncate">OVO Degradasi QRIS Issuer</span>
          </div>
        </div>
      </div>

      {/* Main 2-column */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: channels */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-5 text-[#4fc1ff]" aria-hidden />
              <h2 className="text-lg font-bold text-white">Pengaturan Kanal Pembayaran</h2>
            </div>
            <span className="text-xs text-[#a1a1aa]">MODEM &amp; GATEWAY CONTROLLER</span>
          </div>

          {/* Cash */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#1f1f22] text-[#22c55e]">
                  <Banknote className="size-[22px]" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">Uang Tunai (Cash)</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-xs', channels.cash ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#1f1f22] text-[#a1a1aa]')}>
                      {channels.cash ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <span className="text-xs text-[#a1a1aa]">Transaksional fisik langsung di bilik booth keluar</span>
                </div>
              </div>
              <Toggle on={channels.cash} onClick={() => toggle('cash')} label="Aktifkan kanal tunai" />
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#1f1f22] p-4 text-xs md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-[#a1a1aa]">Kalkulator Kembalian</span>
                <span className="flex items-center gap-1 font-medium text-white">
                  <CircleCheck className="size-4 text-[#22c55e]" aria-hidden /> Otomatis via Layar POS
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#a1a1aa]">Maksimal Kas di Laci Kasir</span>
                <span className="font-mono font-medium text-white">Rp 5.000.000 (Setor Wajib)</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[#a1a1aa]">Printer Struk Fisik: <span className="text-[#22c55e]">EPSON TM-T82 Ready</span></span>
              <button type="button" onClick={() => toast('Dialog konfigurasi laci kasir dibuka.', 'info')} className="cursor-pointer rounded bg-[#1f1f22] px-4 py-1.5 text-[#d4d4d4] transition-colors hover:bg-[#2a2a2d] hover:text-white">
                Konfigurasi Laci Kasir
              </button>
            </div>
          </div>

          {/* QRIS */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#1f1f22] text-[#38bdf8]">
                  <QrCode className="size-[22px]" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">QRIS Dinamis Multi-Acquirer</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-xs', channels.qris ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#1f1f22] text-[#a1a1aa]')}>
                      {channels.qris ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <span className="text-xs text-[#a1a1aa]">ASPI QRIS CPM &amp; MPM, settlement langsung ke rekening pengelola</span>
                </div>
              </div>
              <Toggle on={channels.qris} onClick={() => toggle('qris')} label="Aktifkan kanal QRIS" />
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#1f1f22] p-4 text-xs md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-[#a1a1aa]">Timeout Otomatis</span>
                <span className="font-mono font-bold text-white">60 Detik / Tiket</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#a1a1aa]">Provider MID</span>
                <span className="font-mono text-white">MID-SITE-992140</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#a1a1aa]">Fallback Statis</span>
                <span className="font-medium text-[#22c55e]">Auto-Switch bila Offline</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[#a1a1aa]">Customer Screen Box: <span className="text-[#22c55e]">Display 10.1&quot; Terkalibrasi</span></span>
              <button type="button" onClick={() => toast('QR sample dikirim ke customer display 10.1".', 'success')} className="cursor-pointer rounded bg-[#1f1f22] px-4 py-1.5 text-[#d4d4d4] transition-colors hover:bg-[#2a2a2d] hover:text-white">
                Uji Coba QR Sample
              </button>
            </div>
          </div>

          {/* E-Money */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#1f1f22] text-[#4fc1ff]">
                  <Nfc className="size-[22px]" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">Kartu Uang Elektronik (SAM Box)</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-xs', channels.emoney ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#1f1f22] text-[#a1a1aa]')}>
                      {channels.emoney ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <span className="text-xs text-[#a1a1aa]">Mandiri e-Money, Flazz BCA, BNI TapCash, BRIZZI</span>
                </div>
              </div>
              <Toggle on={channels.emoney} onClick={() => toggle('emoney')} label="Aktifkan kanal e-money" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {SAM_SLOTS.map((slot, i) => (
                <div key={slot} className="flex flex-col gap-1 rounded bg-[#1f1f22] p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#a1a1aa]">SLOT {i + 1}</span>
                    <span className={cn('size-1.5 rounded-full', channels.emoney ? 'bg-[#22c55e]' : 'bg-[#a1a1aa]/40')} />
                  </div>
                  <span className="font-bold text-white">{slot}</span>
                  <span className={cn('text-[10px]', channels.emoney ? 'text-[#22c55e]' : 'text-[#a1a1aa]')}>
                    {channels.emoney ? 'ONLINE' : 'STANDBY'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[#a1a1aa]">Palang Otomatis: <span className="text-white">Trigger Buka Instan saat Tap Saldo Cukup</span></span>
              <button type="button" onClick={() => toast('Balance reader SAM merespon: 4 slot OK.', 'success')} className="cursor-pointer rounded bg-[#1f1f22] px-4 py-1.5 text-[#d4d4d4] transition-colors hover:bg-[#2a2a2d] hover:text-white">
                Cek Balance Reader
              </button>
            </div>
          </div>

          {/* EDC */}
          <div className={cn('flex flex-col gap-4 rounded-xl bg-[#1e1e1e] p-5 shadow-sm transition-opacity', !channels.edc && 'opacity-80 hover:opacity-100')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#1f1f22] text-[#a1a1aa]">
                  <CreditCard className="size-[22px]" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">EDC / Kartu Debit Perbankan</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-xs', channels.edc ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#1f1f22] text-[#a1a1aa]')}>
                      {channels.edc ? 'AKTIF' : 'STANDBY'}
                    </span>
                  </div>
                  <span className="text-xs text-[#a1a1aa]">Jalur sekunder manual jika sistem QRIS / TapCash mengalami blackout</span>
                </div>
              </div>
              <Toggle on={channels.edc} onClick={() => toggle('edc')} label="Aktifkan kanal EDC" />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#1f1f22] p-4 text-xs">
              <span className="text-[#a1a1aa]">Terminal EDC Terdaftar: <span className="font-mono text-white">INGENICO Move/2500 (COM4)</span></span>
              <span className="flex items-center gap-1 text-[#f59e0b]">
                <CirclePause className="size-4" aria-hidden /> Non-Aktif (Siap Diaktifkan)
              </span>
            </div>
          </div>
        </div>

        {/* Right: incident feed */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="size-5 text-[#f59e0b]" aria-hidden />
              <h2 className="text-lg font-bold text-white">Live Incident Feed</h2>
            </div>
            <div className="flex items-center gap-1.5 rounded bg-[#1f1f22] px-2 py-0.5 text-xs text-[#4fc1ff]">
              <span className="size-2 animate-ping rounded-full bg-[#4fc1ff]" />
              WS STREAM
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4 rounded-xl bg-[#1e1e1e] p-5 shadow-sm">
            <div className="flex items-center justify-between rounded-lg border-l-4 border-[#f59e0b] bg-[#1f1f22] p-4">
              <div className="flex flex-col">
                <span className="text-sm text-white">Broadcast Alert Aktif</span>
                <span className="text-xs text-[#a1a1aa]">Sinkronisasi pesan kendala ke layar operator booth</span>
              </div>
              <button
                type="button"
                onClick={handleBroadcast}
                className={cn(
                  'cursor-pointer rounded px-4 py-1.5 text-xs font-semibold transition-colors',
                  broadcastSent ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#f59e0b]/20 text-[#f59e0b] hover:bg-[#f59e0b]/30'
                )}
              >
                {broadcastSent ? 'TERKIRIM KE LOKET!' : 'Broadcast Ulang'}
              </button>
            </div>
            <div className="mt-1 flex max-h-[580px] flex-col gap-4 overflow-y-auto pr-1">
              {INITIAL_INCIDENTS.map((incident) => (
                <div key={incident.id} className={cn('relative flex flex-col gap-1.5 rounded-lg border-l-2 bg-[#1f1f22] p-4', TONE_CLASSES[incident.tone].border)}>
                  <div className="flex items-center justify-between">
                    <span className={cn('rounded px-1.5 py-0.5 text-xs font-bold', TONE_CLASSES[incident.tone].badge)}>
                      {incident.tag}
                    </span>
                    <span className="font-mono text-xs text-[#a1a1aa]">{incident.time}</span>
                  </div>
                  <h3 className={cn('mt-1 text-base font-bold', incident.tone === 'muted' ? 'text-[#d4d4d4]' : 'text-white')}>
                    {incident.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#a1a1aa]">{incident.body}</p>
                  {incident.recommendation && (
                    <div className="mt-1 flex items-start gap-1.5 rounded bg-[#1e1e1e] p-2.5 text-xs text-[#d4d4d4]">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-[#f59e0b]" aria-hidden />
                      <span><strong>Rekomendasi Petugas:</strong> {incident.recommendation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <button type="button" onClick={() => navigate('/riwayat')} className="flex-1 cursor-pointer rounded bg-[#1f1f22] py-2 text-center text-xs text-white transition-colors hover:bg-[#264f78]">
                Lihat Riwayat Gangguan Lengkap
              </button>
              <button type="button" onClick={handleExport} className="flex cursor-pointer items-center justify-center gap-1 rounded bg-[#1f1f22] px-4 py-2 text-xs text-[#a1a1aa] transition-colors hover:bg-[#2a2a2d] hover:text-white">
                <Download className="size-4" aria-hidden />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
