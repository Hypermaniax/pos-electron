import type React from 'react'
import { useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'

const CHANNELS = [
  {
    id: 'cash',
    icon: '⛁',
    iconColor: 'text-emerald-400',
    title: 'Uang Tunai (Cash)',
    desc: 'Transaksional fisik langsung di bilik booth keluar',
    detail: 'Transaksional fisik langsung di bilik booth keluar',
    grid: [
      { label: 'Kalkulator Kembalian', value: 'Otomatis via Layar POS', ok: true },
      { label: 'Maksimal Kas di Laci Kasir', value: 'Rp 5.000.000 (Setor Wajib)', ok: false }
    ] as { label: string; value: string; ok?: boolean }[],
    footer: 'Printer Struk Fisik: ',
    footerValue: 'EPSON TM-T82 Ready',
    action: 'Konfigurasi Laci Kasir'
  },
  {
    id: 'qris',
    icon: '▣',
    iconColor: 'text-sky-400',
    title: 'QRIS Dinamis Multi-Acquirer',
    desc: 'ASPI QRIS CPM & MPM, settlement langsung ke rekening pengelola',
    grid: [
      { label: 'Timeout Otomatis', value: '60 Detik / Tiket', ok: false },
      { label: 'Provider MID', value: 'MID-SITE-992140', ok: false },
      { label: 'Fallback Statis', value: 'Auto-Switch bila Offline', ok: true }
    ] as { label: string; value: string; ok?: boolean }[],
    footer: 'Customer Screen Box: ',
    footerValue: 'Display 10.1" Terkalibrasi',
    action: 'Uji Coba QR Sample'
  },
  {
    id: 'emoney',
    icon: '◉',
    iconColor: 'text-cyan-400',
    title: 'Kartu Uang Elektronik (SAM Box)',
    desc: 'Mandiri e-Money, Flazz BCA, BNI TapCash, BRIZZI',
    grid: [],
    footer: 'Palang Otomatis: ',
    footerValue: 'Trigger Buka Instan saat Tap Saldo Cukup',
    action: 'Cek Balance Reader'
  },
  {
    id: 'debit',
    icon: '▤',
    iconColor: 'text-muted-foreground',
    title: 'EDC / Kartu Debit Perbankan',
    desc: 'Jalur sekunder manual jika sistem QRIS / TapCash mengalami blackout',
    grid: [],
    footer: 'Terminal EDC Terdaftar: ',
    footerValue: 'INGENICO Move/2500 (COM4)',
    action: ''
  }
] as const

const SAM_SLOTS = [
  { slot: 'SLOT 1', name: 'MANDIRI', status: 'ONLINE' },
  { slot: 'SLOT 2', name: 'BCA FLAZZ', status: 'ONLINE' },
  { slot: 'SLOT 3', name: 'BNI TAPCASH', status: 'ONLINE' },
  { slot: 'SLOT 4', name: 'BRIZZI', status: 'ONLINE' }
] as const

interface Incident {
  badge: string
  tone: 'warning' | 'info' | 'success' | 'muted'
  time: string
  title: string
  body: React.ReactNode
  advice?: React.ReactNode
}

const INCIDENTS: Incident[] = [
  {
    badge: 'DEGRADASI PROVIDER',
    tone: 'warning',
    time: '14:32 WIB',
    title: 'Kendala Provider OVO / Grab',
    body: (
      <>
        Tingkat kegagalan QRIS penerbit{' '}
        <strong className="text-foreground">OVO meningkat ke 28%</strong> akibat lonjakan latensi
        payment gateway pihak ketiga.
      </>
    ),
    advice: (
      <>
        <strong>Rekomendasi Petugas:</strong> Arahkan pengunjung membayar via Tunai, GoPay, atau
        E-Money Tap langsung di gate.
      </>
    )
  },
  {
    badge: 'MAINTENANCE SELESAI',
    tone: 'info',
    time: '13:15 WIB',
    title: 'Reader SAM BCA Flazz Pulih Normal',
    body: (
      <>
        Reader SAM Module Slot 2 telah selesai melakukan re-keying session. Rata-rata response time
        kartu Flazz kembali stabil pada <strong className="text-cyan-400">1.2 detik</strong>.
      </>
    )
  },
  {
    badge: 'SINKRONISASI HOST',
    tone: 'success',
    time: '11:00 WIB',
    title: 'Mandiri e-Money Host OK',
    body: (
      <>
        Koneksi host offline sync 100% tersinkronisasi. 1.284 transaksi kliring batch pagi berhasil
        diunggah tanpa anomali data.
      </>
    )
  },
  {
    badge: 'HISTORI TERSENTEL',
    tone: 'muted',
    time: '08:45 WIB',
    title: 'QRIS Timeout Resolved',
    body: (
      <>
        Spike latensi gateway Telkomsel backbone telah kembali normal (&lt;40ms). Tidak ada antrean
        tiket tertahan di Booth 1 &amp; Booth 2.
      </>
    )
  }
]

const TONE = {
  warning: {
    border: 'border-amber-500',
    badge: 'bg-amber-500/20 text-amber-400',
    text: 'text-amber-400',
    icon: 'text-amber-400'
  },
  info: {
    border: 'border-sky-500',
    badge: 'bg-sky-500/20 text-sky-400',
    text: 'text-sky-400',
    icon: 'text-sky-400'
  },
  success: {
    border: 'border-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-400',
    text: 'text-emerald-400',
    icon: 'text-emerald-400'
  },
  muted: {
    border: 'border-border',
    badge: 'bg-card text-muted-foreground',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground'
  }
} as const

export function ActivationSection(): React.JSX.Element {
  const toast = useToast()
  const [channels, setChannels] = useState({ cash: true, qris: true, emoney: true, debit: false })
  const [syncing, setSyncing] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)

  const activeCount = Object.values(channels).filter(Boolean).length
  const activeLabels = [
    channels.cash && 'TUNAI',
    channels.qris && 'QRIS',
    channels.emoney && 'E-MONEY',
    channels.debit && 'DEBIT'
  ].filter((label): label is string => Boolean(label))

  const handleToggle = (id: keyof typeof channels): void => {
    if (id === 'debit') {
      toast('Kanal debit belum didukung backend — sementara standby.', 'info')
      return
    }
    setChannels((prev) => {
      const next = !prev[id]
      if (!next && Object.values({ ...prev, [id]: false }).every((value) => !value)) return prev
      if (id === 'qris' && !next)
        toast(
          'Kanal QRIS dinonaktifkan lokal — server belum menyediakan endpoint aktivasi.',
          'info'
        )
      if (id === 'qris' && next) toast('Kanal QRIS diaktifkan.', 'success')
      if (id === 'emoney' && !next)
        toast(
          'Kanal E-Money dinonaktifkan lokal — server belum menyediakan endpoint aktivasi.',
          'info'
        )
      if (id === 'emoney' && next) toast('Kanal E-Money diaktifkan.', 'success')
      if (id === 'cash' && !next) toast('Kanal Tunai dinonaktifkan lokal.', 'info')
      if (id === 'cash' && next) toast('Kanal Tunai diaktifkan.', 'success')
      return { ...prev, [id]: next }
    })
  }

  const handleSync = (): void => {
    if (syncing) return
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      toast('Status gateway disinkronkan (lokal).', 'success')
    }, 1200)
  }

  const handleBroadcast = (): void => {
    if (broadcasting) return
    setBroadcasting(true)
    setTimeout(() => setBroadcasting(false), 2500)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 pt-1 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-orange-400">
              PAYMENT GATEWAY &amp; SYSTEM RESILIENCE
            </span>
            <span className="flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              CLUSTER NODE #03 ONLINE
            </span>
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Aktivasi Fitur Pembayaran &amp; Health Feed
          </h1>
          <p className="max-w-3xl font-sans text-xs text-muted-foreground">
            Pengelolaan kanal pembayaran loket (Tunai, QRIS, E-Money) serta pemantauan live incident
            dan kendala provider perbankan/e-wallet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Button
            variant="outline"
            className="border-border bg-card font-mono text-[11px] uppercase hover:bg-background"
            onClick={() =>
              toast(
                'Audit log transaksi belum tersedia — lihat Dashboard untuk ringkasan.',
                'info'
              )
            }
          >
            ⎙ Audit Log Transaksi
          </Button>
          <Button
            className="bg-orange-500 font-mono text-[11px] font-bold uppercase text-white shadow-sm hover:bg-orange-600"
            disabled={syncing}
            onClick={handleSync}
          >
            <span className={cn('mr-1 inline-block', syncing && 'animate-spin')}>⇄</span> Sinkronkan
            Status Gateway
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Kanal Aktif
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-foreground">
                  {activeCount}
                </span>
                <span className="font-mono text-xs text-emerald-400">/ 4 Konfigurasi</span>
              </div>
            </div>
            <span className="flex size-10 items-center justify-center rounded border border-border bg-background text-lg text-cyan-400">
              ⛁
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
            {(activeLabels.length ? activeLabels : ['TIDAK ADA']).map((label) => (
              <span
                key={label}
                className="rounded bg-background px-2 py-0.5 font-mono text-[11px] text-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Tingkat Keberhasilan
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-emerald-400">—</span>
              </div>
            </div>
            <span className="flex size-10 items-center justify-center rounded border border-border bg-background text-lg text-emerald-400">
              ✓
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-1 font-mono text-[11px] text-muted-foreground">
            <span>Belum tersedia di backend</span>
          </div>
        </div>

        <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Rata-rata Settlement
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-cyan-400">—</span>
                <span className="font-mono text-[11px] text-muted-foreground">Avg Response</span>
              </div>
            </div>
            <span className="flex size-10 items-center justify-center rounded border border-border bg-background text-lg text-cyan-400">
              ⚡
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-1 font-mono text-[11px]">
            <span className="text-muted-foreground">Benchmark Loket: &lt; 3.0s</span>
          </div>
        </div>

        <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Status Incident Provider
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-amber-400">1</span>
                <span className="font-mono text-[11px] text-amber-400">Gangguan Aktif</span>
              </div>
            </div>
            <span className="flex size-10 items-center justify-center rounded border border-border bg-background text-lg text-amber-400">
              ⚠
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 truncate pt-1 font-mono text-[11px] text-amber-400">
            <span className="size-2 shrink-0 rounded-full bg-amber-500" />
            <span className="truncate">OVO Degradasi QRIS Issuer (feed internal)</span>
          </div>
        </div>
      </div>

      {/* Main 2-column */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Left: channels */}
        <div className="flex flex-col gap-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
              <span className="text-cyan-400">⚒</span> Pengaturan Kanal Pembayaran
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              MODEM &amp; GATEWAY CONTROLLER
            </span>
          </div>

          {CHANNELS.map((channel) => {
            const on = channels[channel.id]
            const isDebit = channel.id === 'debit'
            return (
              <div
                key={channel.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-opacity',
                  (!on || isDebit) && 'opacity-80 hover:opacity-100'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex size-10 items-center justify-center rounded border border-border bg-background text-lg',
                        channel.iconColor
                      )}
                    >
                      {channel.icon}
                    </span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-bold text-foreground">
                          {channel.title}
                        </span>
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 font-mono text-[11px]',
                            on
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-background text-muted-foreground'
                          )}
                        >
                          {on ? 'AKTIF' : isDebit ? 'STANDBY' : 'NON-AKTIF'}
                        </span>
                      </div>
                      <span className="font-sans text-xs text-muted-foreground">
                        {channel.desc}
                      </span>
                    </div>
                  </div>
                  <Switch checked={on} onCheckedChange={() => handleToggle(channel.id)} />
                </div>

                {channel.id === 'emoney' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
                      {SAM_SLOTS.map((slot) => (
                        <div
                          key={slot.slot}
                          className="flex flex-col gap-1 rounded border border-border bg-background p-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{slot.slot}</span>
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                          </div>
                          <span className="font-bold text-foreground">{slot.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            STATUS BELUM TERSEDIA
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">
                        Palang Otomatis:{' '}
                        <span className="font-medium text-foreground">
                          Trigger Buka Instan saat Tap Saldo Cukup
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded border-border bg-background font-mono text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          toast(
                            'Cek balance reader belum tersedia — device belum terdaftar di backend.',
                            'info'
                          )
                        }
                      >
                        Cek Balance Reader
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {channel.grid.length > 0 && (
                      <div
                        className={cn(
                          'grid grid-cols-1 gap-3 rounded border border-border bg-background p-3 font-mono text-[11px]',
                          isDebit && 'opacity-70'
                        )}
                      >
                        {channel.grid.map((item) => (
                          <div key={item.label} className="flex flex-col gap-1">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              {item.ok && <span className="text-emerald-400">✓</span>}
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">
                        {channel.footer}
                        {isDebit ? (
                          <span className="flex items-center gap-1 font-medium text-amber-400">
                            <span>⏸</span> Non-Aktif (Siap Diaktifkan)
                          </span>
                        ) : (
                          <span className="font-medium text-emerald-400">
                            {channel.footerValue}
                          </span>
                        )}
                      </span>
                      {channel.action && !isDebit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded border-border bg-background font-mono text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            toast(
                              channel.id === 'cash'
                                ? 'Konfigurasi laci kasir belum tersedia di backend.'
                                : 'Uji coba QR sample belum tersedia di backend.',
                              'info'
                            )
                          }
                        >
                          {channel.action}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: incident feed */}
        <div className="flex flex-col gap-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
              <span className="text-amber-400">◔</span> Live Incident Feed
            </h2>
            <span className="flex items-center gap-1.5 rounded bg-background px-2 py-0.5 font-mono text-[11px] text-cyan-400">
              <span className="size-2 animate-ping rounded-full bg-cyan-400" />
              NO WS STREAM
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between rounded border-l-4 border-amber-500 bg-background p-3">
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold text-foreground">
                  Broadcast Alert Aktif
                </span>
                <span className="font-sans text-[11px] text-muted-foreground">
                  Sinkronisasi pesan kendala ke layar operator booth
                </span>
              </div>
              <Button
                size="sm"
                className={cn(
                  'h-8 rounded bg-amber-500/20 px-3 font-mono text-[11px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/30 hover:text-amber-300',
                  broadcasting && 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                )}
                onClick={handleBroadcast}
              >
                {broadcasting ? 'TERKIRIM KE LOKET!' : 'Broadcast Ulang'}
              </Button>
            </div>

            <div className="flex max-h-[580px] flex-col gap-3 overflow-y-auto pr-1">
              {INCIDENTS.map((incident, index) => {
                const tone = TONE[incident.tone]
                return (
                  <div
                    key={index}
                    className={cn(
                      'relative flex flex-col gap-1 rounded border-l-2 border-y border-r border-y-transparent border-r-transparent bg-background p-3',
                      tone.border
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 font-mono text-[11px] font-bold',
                          tone.badge
                        )}
                      >
                        {incident.badge}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {incident.time}
                      </span>
                    </div>
                    <h3 className="mt-1 font-heading text-xs font-bold text-foreground">
                      {incident.title}
                    </h3>
                    <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                      {incident.body}
                    </p>
                    {incident.advice && (
                      <div className="mt-1 flex items-start gap-2 rounded bg-card p-2 font-mono text-[11px] text-foreground/90">
                        <span className={cn('mt-0.5 shrink-0', tone.icon)}>◆</span>
                        <span>{incident.advice}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 border-border bg-background font-mono text-[11px] text-foreground hover:bg-card"
                onClick={() => toast('Riwayat gangguan lengkap belum tersedia di backend.', 'info')}
              >
                Lihat Riwayat Gangguan Lengkap
              </Button>
              <Button
                variant="outline"
                className="border-border bg-background font-mono text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => toast('Export PDF belum tersedia.', 'info')}
              >
                ⬇ Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
