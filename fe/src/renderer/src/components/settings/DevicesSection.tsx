import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { pingServer } from '../../lib/server-api'
import { formatDateTime } from '../../lib/format'
import { useConfig } from '../../context/ConfigContext'
import { Switch } from '@renderer/components/ui/switch'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { cn } from '@renderer/lib/utils'

type DeviceStatus = 'online' | 'warning' | 'offline'

interface DeviceRow {
  id: string
  name: string
  category: string
  ip: string
  port: string
  proto: string
  status: DeviceStatus
  latency: number | null
  lastPing: string | null
  critical?: boolean
}

interface LogLine {
  time: string
  level: 'success' | 'warning' | 'error' | 'accent'
  tag: string
  text: string
}

const CATEGORIES = [
  'Lane Controller (IPC/PLC)',
  'ANPR Camera (Kamera Plat)',
  'Barcode Scanner (1D/2D QR)',
  'Thermal Printer (Tiket/Struk)',
  'Barrier Gate Relay (Palang)',
  'Reader E-Money / Tap Card'
]

const timeStr = (): string => new Date().toLocaleTimeString('id-ID', { hour12: false })

const LEVEL_CLASS = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  accent: 'text-cyan-400'
} as const

export function DevicesSection(): React.JSX.Element {
  const toast = useToast()
  const { config } = useConfig()
  const [devices, setDevices] = useState<DeviceRow[]>([
    {
      id: 'LC-01',
      name: 'Lane Controller Barat In',
      category: 'Lane Controller',
      ip: '192.168.1.101',
      port: '8080',
      proto: 'TCP/IP',
      status: 'online',
      latency: 3,
      lastPing: null
    },
    {
      id: 'CAM-01',
      name: 'ANPR Hikvision Booth 01',
      category: 'Kamera LPR',
      ip: '192.168.1.105',
      port: '554',
      proto: 'RTSP / TCP',
      status: 'online',
      latency: 6,
      lastPing: null
    },
    {
      id: 'CAM-02',
      name: 'ANPR Timur Cam 01',
      category: 'Kamera LPR',
      ip: '192.168.2.110',
      port: '80',
      proto: 'TCP/IP',
      status: 'warning',
      latency: 128,
      lastPing: null
    },
    {
      id: 'GT-02',
      name: 'Barrier Gate Timur 02',
      category: 'Palang Relay',
      ip: '192.168.2.202',
      port: '502',
      proto: 'Modbus TCP',
      status: 'offline',
      latency: null,
      lastPing: null,
      critical: true
    },
    {
      id: 'PRN-01',
      name: 'Epson TM-T82X Barat',
      category: 'Printer Tiket',
      ip: '192.168.1.180',
      port: '9100',
      proto: 'ESC-POS',
      status: 'online',
      latency: 2,
      lastPing: null
    },
    {
      id: 'SCN-01',
      name: 'Newland FM430 Omnidirectional',
      category: 'Scanner Barcode',
      ip: '127.0.0.1',
      port: 'COM3',
      proto: 'USB-HID',
      status: 'online',
      latency: 1,
      lastPing: null
    }
  ])
  const [filter, setFilter] = useState<'all' | DeviceStatus>('all')
  const [query, setQuery] = useState('')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [pinging, setPinging] = useState<string | null>(null)
  const [autoPing, setAutoPing] = useState(true)
  const startedAtRef = useRef(0)
  const [form, setForm] = useState({ name: '', category: CATEGORIES[0], ip: '', port: '' })

  const log = (level: LogLine['level'], tag: string, text: string): void => {
    setLogs((prev) => [{ time: timeStr(), level, tag, text }, ...prev].slice(0, 40))
  }

  const pingSiteServer = async (labelSuccess: string): Promise<void> => {
    await pingServer().then(async (result) => {
      const rtt = Math.round(performance.now() - startedAtRef.current)
      if (result.ok) {
        log(
          'success',
          'ECHO_REPLY',
          `${config?.siteServerUrl.replace(/^https?:\/\//, '') ?? 'site-server'} /api/v1/health (${rtt}ms)`
        )
        toast(`${labelSuccess} — server merespons ${rtt} ms.`, 'success')
      } else {
        log('error', 'HOST_UNREACHABLE', 'site server /health gagal (ETIMEDOUT)')
        toast('Server tidak merespons — periksa koneksi site server.', 'error')
      }
      setDevices((prev) =>
        prev.map((device) =>
          device.critical
            ? device
            : {
                ...device,
                status: result.ok ? ('online' as const) : device.status,
                latency: rtt,
                lastPing: new Date().toISOString()
              }
        )
      )
    })
  }

  const pingDevice = async (device: DeviceRow): Promise<void> => {
    log('accent', 'PING', `manual ping ke [${device.id}] ${device.ip}:${device.port}...`)
    await pingSiteServer(`Ping sweep ${device.id} diteruskan ke site server`)
  }

  const handlePingAll = (): void => {
    if (pinging === 'all') return
    setPinging('all')
    window.setTimeout(() => {
      startedAtRef.current = performance.now()
      setPinging(null)
      void pingSiteServer('Ping sweep selesai untuk seluruh perangkat')
    }, 1400)
  }

  useEffect(() => {
    startedAtRef.current = performance.now()
  }, [])

  useEffect(() => {
    if (!autoPing) return
    const id = window.setInterval(() => {
      startedAtRef.current = performance.now()
      void pingSiteServer('Auto ping selesai')
    }, 5000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPing])

  const online = devices.filter((device) => device.status === 'online').length
  const warns = devices.filter((device) => device.status === 'warning').length
  const offs = devices.filter((device) => device.status === 'offline').length
  const rows = devices.filter(
    (device) =>
      (filter === 'all' || device.status === filter) &&
      (query === '' ||
        `${device.id} ${device.name} ${device.ip}`.toLowerCase().includes(query.toLowerCase()))
  )

  const FILTERS: { id: 'all' | DeviceStatus; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'online', label: 'Online' },
    { id: 'warning', label: 'Warning' },
    { id: 'offline', label: 'Offline' }
  ]
  const counts: Record<string, number> = {
    all: devices.length,
    online,
    warning: warns,
    offline: offs
  }

  const STATUS_BADGE: Record<DeviceStatus, string> = {
    online: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    offline: 'bg-red-500/15 text-red-400'
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 pt-1 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-cyan-400">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            TELEMETRY &amp; DEVICE ORCHESTRATION
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Manajemen Perangkat &amp; Konektivitas
          </h1>
          <p className="max-w-3xl font-sans text-xs text-muted-foreground">
            Pemantauan port periferal booth terminal, palang gerbang otomatis, kamera LPR, dan
            sensor deteksi kendaraan secara real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Button
            variant="outline"
            className="border-border bg-background font-mono text-[11px] hover:bg-card"
            onClick={() => toast('Ekspor JSON device registry belum tersedia di backend.', 'info')}
          >
            ⬇ Ekspor JSON
          </Button>
          <Button
            variant="outline"
            className="border-border bg-background font-mono text-[11px] text-cyan-400 hover:bg-card hover:text-foreground"
            onClick={handlePingAll}
          >
            {pinging === 'all' ? '⇄ PINGING SWEEP...' : '⌾ Ping Semua (Sweep)'}
          </Button>
          <Button
            className="bg-orange-500 font-mono text-[11px] font-bold uppercase text-white shadow-sm hover:bg-orange-600"
            onClick={() => toast('Tambah perangkat: belum ada registry device di backend.', 'info')}
          >
            + Tambah Perangkat
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total Terdaftar',
            value: devices.length,
            suffix: 'Unit (tabel lokal)',
            color: 'text-foreground',
            note: 'Belum registry backend'
          },
          {
            label: 'Online / Stabil',
            value: online,
            suffix: 'Unit',
            color: 'text-emerald-400',
            note: 'Sesuai ping terakhir'
          },
          {
            label: 'Latensi Tinggi',
            value: warns,
            suffix: 'Unit Degradasi',
            color: 'text-amber-400',
            note: 'CAM-02 (simulasi)'
          },
          {
            label: 'Offline / Putus',
            value: offs,
            suffix: 'Unit Timeout',
            color: 'text-red-400',
            note: 'GT-02 (simulasi)'
          }
        ].map((card) => (
          <div
            key={card.label}
            className="flex flex-col justify-between rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>{card.label}</span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className={cn('font-heading text-3xl font-semibold', card.color)}>
                {card.value}
              </span>
              <span className="font-sans text-xs text-muted-foreground">{card.suffix}</span>
            </div>
            <div className="border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">
              {card.note}
            </div>
          </div>
        ))}
      </div>

      {/* Work area */}
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        {/* Table */}
        <div className="flex flex-col gap-3 xl:col-span-8">
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col items-stretch justify-between gap-3 border-b border-border p-4 md:flex-row md:items-center">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari ID, nama, IP endpoint..."
                className="h-9 max-w-md rounded border-border bg-background font-mono text-xs"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      'rounded-lg border px-3.5 py-1.5 font-mono text-[11px] transition-colors',
                      filter === item.id
                        ? 'border-border bg-background text-foreground'
                        : 'border-transparent bg-card/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label} ({counts[item.id]})
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="border-b border-border bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Nama Perangkat</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-3 py-3">Port</th>
                    <th className="px-4 py-3">Protokol</th>
                    <th className="px-4 py-3">Status &amp; Latensi</th>
                    <th className="px-4 py-3 text-right">Terakhir</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((device) => (
                    <tr
                      key={device.id}
                      className={cn(
                        'border-b border-border/60 transition-colors hover:bg-background',
                        device.status === 'offline' && 'bg-red-500/5'
                      )}
                    >
                      <td
                        className={cn(
                          'px-4 py-3 font-mono text-[12px] font-medium',
                          device.status === 'offline' ? 'text-red-400' : 'text-cyan-400'
                        )}
                      >
                        {device.id}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          {device.name}
                          {device.critical && (
                            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                              Kritis
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                          {device.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-foreground">
                        {device.ip}
                      </td>
                      <td className="px-3 py-3 font-mono text-[12px] text-sky-400">
                        {device.port}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {device.proto}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium',
                            STATUS_BADGE[device.status]
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {device.status === 'offline' ? 'Timeout' : `${device.latency ?? '—'}ms`}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-mono text-[11px]',
                          device.lastPing ? 'text-muted-foreground' : 'text-muted-foreground/50'
                        )}
                      >
                        {device.lastPing ? formatDateTime(device.lastPing) : 'belum di-ping'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pinging === device.id}
                            className="h-7 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={async () => {
                              setPinging(device.id)
                              startedAtRef.current = performance.now()
                              await pingDevice(device)
                              setPinging(null)
                            }}
                          >
                            ⟳ Ping
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-amber-400 hover:text-amber-300"
                            onClick={() =>
                              toast(
                                `Restart ${device.id} belum tersedia — tidak ada endpoint device di backend.`,
                                'info'
                              )
                            }
                          >
                            ⭮
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-cyan-400 hover:text-cyan-300"
                            onClick={() =>
                              toast(`Log socket ${device.id} belum tersedia di backend.`, 'info')
                            }
                          >
                            ⎙
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center font-mono text-[11px] text-muted-foreground"
                      >
                        Tidak ada perangkat yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-between gap-2 border-t border-border bg-background/40 p-4 font-mono text-[11px] text-muted-foreground sm:flex-row">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block size-2 rounded-full',
                    autoPing ? 'animate-pulse bg-emerald-500' : 'bg-muted'
                  )}
                />
                Daemon Poller: {autoPing ? 'Aktif (tiap 5 dtk, /api/v1/health)' : 'Pause'}
              </span>
              <span>
                Daftar perangkat lokal — endpoint manajemen device belum tersedia di backend.
              </span>
            </div>
          </div>

          {/* Live log */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-foreground">
                ⌨ LIVE SOCKET STREAM &amp; PING PACKET LOGS
              </span>
              <button
                type="button"
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setLogs([])}
              >
                BERSIHKAN LOG
              </button>
            </div>
            <div className="h-28 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-3 font-mono text-[12px]">
              {logs.length === 0 && (
                <span className="italic text-muted-foreground">Menunggu paket...</span>
              )}
              {logs.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground">[{entry.time}]</span>
                  <span className={cn('font-semibold', LEVEL_CLASS[entry.level])}>{entry.tag}</span>
                  <span className="text-foreground/90">{entry.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3 xl:col-span-4">
          <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-9 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-500">
                +
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Form Cepat Perangkat</span>
                <span className="text-[11px] text-muted-foreground">
                  Konfigurasi endpoint IP &amp; Port periferal
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Nama Perangkat
                </span>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="h-10 rounded border-border bg-background font-mono text-xs"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Kategori Perangkat
                </span>
                <Select
                  value={form.category}
                  onValueChange={(value) => value && setForm({ ...form, category: value })}
                >
                  <SelectTrigger className="h-10 rounded border-border bg-background font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    IP Address
                  </span>
                  <Input
                    value={form.ip}
                    onChange={(event) => setForm({ ...form, ip: event.target.value })}
                    className="h-10 rounded border-border bg-background font-mono text-xs"
                  />
                </label>
                <label className="col-span-1 flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Port
                  </span>
                  <Input
                    value={form.port}
                    onChange={(event) => setForm({ ...form, port: event.target.value })}
                    className="h-10 rounded border-border bg-background font-mono text-xs text-sky-400"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">Auto Ping Poller</span>
                  <span className="text-[11px] text-muted-foreground">
                    Polling /health setiap 5 detik
                  </span>
                </div>
                <Switch checked={autoPing} onCheckedChange={(next) => setAutoPing(Boolean(next))} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1 bg-orange-500 py-2.5 font-mono text-[11px] font-bold uppercase text-white hover:bg-orange-600"
                  onClick={() =>
                    toast('Simpan perangkat: belum ada registry device di backend.', 'info')
                  }
                >
                  ⎙ Simpan Perangkat
                </Button>
                <Button
                  variant="outline"
                  className="border-border bg-background font-mono text-[11px] text-cyan-400 hover:bg-card hover:text-foreground"
                  onClick={() => {
                    startedAtRef.current = performance.now()
                    void pingSiteServer('Test ping')
                  }}
                >
                  ▶ TEST
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-sky-400">ⓘ</span>
                <span>
                  Satu-satunya ping nyata saat ini adalah endpoint{' '}
                  <code className="font-mono text-cyan-400">/api/v1/health</code> site server. ping
                  IP/port periferal langsung (Modbus/RTSP) belum tersedia di bridge Electron.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
