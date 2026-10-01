import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  CircleCheck,
  CloudOff,
  Cpu,
  Download,
  Info,
  Pencil,
  Play,
  Plus,
  Radar,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  Terminal,
  TriangleAlert
} from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { cn } from '@renderer/lib/utils'

type DeviceStatus = 'online' | 'warning' | 'offline'
type DeviceFilter = 'all' | DeviceStatus

interface Device {
  id: string
  name: string
  category: string
  ip: string
  port: string
  proto: string
  lane: string
  timeoutMs: number
  status: DeviceStatus
  latency: string | null
  lastSeenSec: number
  critical?: boolean
}

interface LogEntry {
  id: number
  time: string
  tag: string
  tone: 'ok' | 'warn' | 'err' | 'info'
  message: string
}

const CATEGORIES = [
  'Lane Controller',
  'ANPR Camera',
  'Barcode Scanner',
  'Thermal Printer',
  'Barrier Gate Relay',
  'Reader E-Money'
]

const CATEGORY_LABEL: Record<string, string> = {
  'Lane Controller': 'Lane Controller (IPC/PLC)',
  'ANPR Camera': 'ANPR Camera (Kamera Plat)',
  'Barcode Scanner': 'Barcode Scanner (1D/2D QR)',
  'Thermal Printer': 'Thermal Printer (Tiket/Struk)',
  'Barrier Gate Relay': 'Barrier Gate Relay (Palang)',
  'Reader E-Money': 'Reader E-Money / Tap Card'
}

const ID_PREFIX: Record<string, string> = {
  'Lane Controller': 'LC',
  'ANPR Camera': 'CAM',
  'Barcode Scanner': 'SCN',
  'Thermal Printer': 'PRN',
  'Barrier Gate Relay': 'GT',
  'Reader E-Money': 'EMV'
}

const PROTOCOLS = ['TCP/IP', 'Modbus', 'RS485', 'USB-HID']

const LANES = [
  'LANE_WEST_01',
  'LANE_WEST_02',
  'LANE_EAST_01',
  'LANE_EAST_02',
  'CENTRAL_RACK'
]

// Telemetri perangkat statis (mock): belum ada API backend perangkat.
const INITIAL_DEVICES: Device[] = [
  { id: 'LC-01', name: 'Lane Controller Barat In', category: 'Lane Controller', ip: '192.168.1.101', port: '8080', proto: 'TCP/IP', lane: 'LANE_WEST_01', timeoutMs: 1500, status: 'online', latency: '3ms', lastSeenSec: 3 },
  { id: 'CAM-01', name: 'ANPR Hikvision Booth 01', category: 'ANPR Camera', ip: '192.168.1.105', port: '554', proto: 'RTSP / TCP', lane: 'LANE_WEST_01', timeoutMs: 1500, status: 'online', latency: '6ms', lastSeenSec: 4 },
  { id: 'CAM-02', name: 'ANPR Timur Cam 01', category: 'ANPR Camera', ip: '192.168.2.110', port: '80', proto: 'TCP/IP', lane: 'LANE_EAST_01', timeoutMs: 1500, status: 'warning', latency: '128ms', lastSeenSec: 6 },
  { id: 'GT-02', name: 'Barrier Gate Timur 02', category: 'Barrier Gate Relay', ip: '192.168.2.202', port: '502', proto: 'Modbus', lane: 'LANE_EAST_02', timeoutMs: 1500, status: 'offline', latency: null, lastSeenSec: 20, critical: true },
  { id: 'PRN-01', name: 'Epson TM-T82X Barat', category: 'Thermal Printer', ip: '192.168.1.180', port: '9100', proto: 'ESC-POS', lane: 'LANE_WEST_01', timeoutMs: 1500, status: 'online', latency: '2ms', lastSeenSec: 3 },
  { id: 'SCN-01', name: 'Newland FM430 Omnidirectional', category: 'Barcode Scanner', ip: '127.0.0.1', port: 'COM3', proto: 'USB-HID', lane: 'LANE_WEST_01', timeoutMs: 1500, status: 'online', latency: '1ms', lastSeenSec: 5 },
  { id: 'EMV-01', name: 'Castles Contactless SAM', category: 'Reader E-Money', ip: '192.168.1.140', port: '3001', proto: 'WebSocket SSL', lane: 'LANE_WEST_01', timeoutMs: 1500, status: 'online', latency: '4ms', lastSeenSec: 3 },
  { id: 'GT-01', name: 'Barrier Gate Barat 01 MX-50', category: 'Barrier Gate Relay', ip: '192.168.1.201', port: '502', proto: 'Modbus TCP', lane: 'LANE_WEST_01', timeoutMs: 1500, status: 'online', latency: '2ms', lastSeenSec: 4 }
]

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, time: '14:38:07', tag: 'ECHO_REPLY', tone: 'ok', message: '192.168.1.101:8080 (3ms) TTL=64 proto=TCP' },
  { id: 2, time: '14:38:08', tag: 'ECHO_REPLY', tone: 'ok', message: '192.168.1.105:554 (6ms) TTL=64 proto=RTSP' },
  { id: 3, time: '14:38:08', tag: 'HIGH_LATENCY', tone: 'warn', message: '192.168.2.110:80 (128ms) threshold exceeded > 50ms' },
  { id: 4, time: '14:38:09', tag: 'HOST_UNREACHABLE', tone: 'err', message: '192.168.2.202:502 Modbus sync failed (ETIMEDOUT)' },
  { id: 5, time: '14:38:09', tag: 'ECHO_REPLY', tone: 'ok', message: '192.168.1.180:9100 (2ms) raw-printer ready' }
]

const PAGE_SIZE = 8

function nowTime(): string {
  return new Date().toTimeString().split(' ')[0]
}

function statusPill(device: Device): React.JSX.Element {
  if (device.status === 'online') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/15 px-2.5 py-1 text-xs font-medium text-[#22c55e]">
        <span className="size-1.5 rounded-full bg-[#22c55e]" />
        <span className="font-mono">{device.latency ?? '-'}</span>
        <span>Online</span>
      </span>
    )
  }
  if (device.status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f59e0b]/15 px-2.5 py-1 text-xs font-medium text-[#f59e0b]">
        <span className="size-1.5 animate-pulse rounded-full bg-[#f59e0b]" />
        <span className="font-mono">{device.latency ?? '-'}</span>
        <span>Jitter</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4444]/15 px-2.5 py-1 text-xs font-medium text-[#ef4444]">
      <span className="size-1.5 rounded-full bg-[#ef4444]" />
      <span>Timeout</span>
    </span>
  )
}

export function PerangkatScreen(): React.JSX.Element {
  const toast = useToast()
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DeviceFilter | 'all'>('all')
  const [page, setPage] = useState(1)
  const [sweeping, setSweeping] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [logSeq, setLogSeq] = useState(INITIAL_LOGS.length + 1)
  const [autoPing, setAutoPing] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState(CATEGORIES[0])
  const [formIp, setFormIp] = useState('')
  const [formPort, setFormPort] = useState('')
  const [formProto, setFormProto] = useState(PROTOCOLS[0])
  const [formTimeout, setFormTimeout] = useState('1500')
  const [formLane, setFormLane] = useState(LANES[0])
  const nameRef = useRef<HTMLInputElement>(null)

  // Penghitung "dtk lalu" real-time (pola yang sama dengan jam LoketScreen).
  useEffect(() => {
    const timer = setInterval(() => {
      setDevices((prev) => prev.map((d) => ({ ...d, lastSeenSec: d.lastSeenSec + 1 })))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const pushLog = (tag: string, tone: LogEntry['tone'], message: string): void => {
    const entry: LogEntry = { id: logSeq, time: nowTime(), tag, tone, message }
    setLogSeq((n) => n + 1)
    setLogs((prev) => [entry, ...prev].slice(0, 50))
  }

  const onlineCount = devices.filter((d) => d.status === 'online').length
  const warningCount = devices.filter((d) => d.status === 'warning').length
  const offlineCount = devices.filter((d) => d.status === 'offline').length
  const warningUnit = devices.find((d) => d.status === 'warning')
  const offlineUnit = devices.find((d) => d.status === 'offline')

  const filtered = devices.filter((d) => {
    const matchFilter = filter === 'all' || d.status === filter
    const term = query.toLowerCase().trim()
    const matchQuery =
      term === '' ||
      `${d.id} ${d.name} ${d.ip} ${d.category} ${d.port}`.toLowerCase().includes(term)
    return matchFilter && matchQuery
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSweep = (): void => {
    if (sweeping) return
    setSweeping(true)
    window.setTimeout(() => {
      setDevices((prev) => prev.map((d) => ({ ...d, lastSeenSec: 0 })))
      setSweeping(false)
      pushLog('SWEEP_COMPLETE', 'info', `${devices.length} endpoints polled (${onlineCount} OK, ${warningCount} WARN, ${offlineCount} TIMEOUT)`)
      toast(`Ping sweep selesai untuk ${devices.length} perangkat.`, 'success')
    }, 1400)
  }

  const handleRowPing = (device: Device): void => {
    toast(`Melakukan manual ping ke [${device.id}]...`, 'info')
    window.setTimeout(() => {
      setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, lastSeenSec: 0 } : d)))
      pushLog('ECHO_REPLY', 'ok', `${device.ip}:${device.port} manual ping OK`)
      toast(`Ping respon [${device.id}] berhasil!`, 'success')
    }, 500)
  }

  const handleReboot = (device: Device): void => {
    if (window.confirm(`Kirim sinyal REBOOT REMOTE ke perangkat [${device.id}]?`)) {
      pushLog('REBOOT_SENT', 'warn', `Remote reboot dikirim ke ${device.ip}:${device.port}`)
      toast(`Instruksi restart dikirimkan ke [${device.id}]`, 'info')
    }
  }

  const handleRowLog = (device: Device): void => {
    pushLog('AUDIT_OPEN', 'info', `Membuka audit socket logs untuk [${device.id}]`)
    toast(`Membuka audit socket logs untuk [${device.id}]`, 'info')
  }

  const resetForm = (): void => {
    setEditingId(null)
    setFormName('')
    setFormCategory(CATEGORIES[0])
    setFormIp('')
    setFormPort('')
    setFormProto(PROTOCOLS[0])
    setFormTimeout('1500')
    setFormLane(LANES[0])
  }

  const handleEdit = (device: Device): void => {
    setEditingId(device.id)
    setFormName(device.name)
    setFormCategory(device.category)
    setFormIp(device.ip)
    setFormPort(device.port)
    setFormProto(PROTOCOLS.includes(device.proto) ? device.proto : PROTOCOLS[0])
    setFormTimeout(String(device.timeoutMs))
    setFormLane(LANES.includes(device.lane) ? device.lane : LANES[0])
    toast(`Mode ubah aktif untuk: ${device.id}`, 'info')
    nameRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!formName.trim() || !formIp.trim() || !formPort.trim()) {
      toast('Nama, IP, dan Port wajib diisi.', 'error')
      return
    }
    if (editingId) {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? { ...d, name: formName.trim(), category: formCategory, ip: formIp.trim(), port: formPort.trim(), proto: formProto, lane: formLane, timeoutMs: Number(formTimeout) || 1500 }
            : d
        )
      )
      toast(`Perangkat [${editingId}] berhasil diupdate!`, 'success')
    } else {
      const prefix = ID_PREFIX[formCategory] ?? 'DEV'
      const nextNum = devices.reduce((max, d) => {
        const match = d.id.match(/(\d+)$/)
        return d.id.startsWith(prefix) && match ? Math.max(max, Number(match[1])) : max
      }, 0) + 1
      const id = `${prefix}-${String(nextNum).padStart(2, '0')}`
      setDevices((prev) => [
        ...prev,
        { id, name: formName.trim(), category: formCategory, ip: formIp.trim(), port: formPort.trim(), proto: formProto, lane: formLane, timeoutMs: Number(formTimeout) || 1500, status: 'online', latency: '1ms', lastSeenSec: 0 }
      ])
      toast(`Perangkat "${formName.trim()}" (${formIp.trim()}:${formPort.trim()}) tersimpan!`, 'success')
    }
    resetForm()
  }

  const handleTestPing = (): void => {
    const ip = formIp.trim() || '127.0.0.1'
    const port = formPort.trim() || '80'
    toast(`Mengirim test socket ke ${ip}:${port}...`, 'info')
    window.setTimeout(() => {
      pushLog('ECHO_REPLY', 'ok', `${ip}:${port} test socket OK (4.5ms)`)
      toast(`Respon ${ip}:${port} didapatkan dalam 4.5ms!`, 'success')
    }, 700)
  }

  const handleExport = (): void => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(devices, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'parkos-devices-config.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast('Konfigurasi diekspor: parkos-devices-config.json', 'success')
  }

  const inputClass =
    'bg-[#111111] text-white px-3.5 py-2.5 rounded-lg text-sm border border-[#27272a] focus:border-[#569cd6] outline-none transition-colors placeholder:text-[#a1a1aa]'

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#27272a] bg-[#1e1e1e]/70 p-6 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#4fc1ff]">
            <span className="size-2 animate-pulse rounded-full bg-[#22c55e]" />
            <span>Telemetry &amp; Device Orchestration</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Manajemen Perangkat &amp; Konektivitas</h1>
          <p className="text-sm text-[#a1a1aa]">
            Pemantauan port periferal booth terminal, palang gerbang otomatis, kamera LPR, dan sensor deteksi kendaraan secara real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#d4d4d4] transition-colors hover:bg-[#1f1f22]"
          >
            <Download className="size-[18px] text-[#a1a1aa]" aria-hidden />
            <span>Ekspor JSON</span>
          </button>
          <button
            type="button"
            onClick={handleSweep}
            disabled={sweeping}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#4fc1ff] transition-colors hover:bg-[#264f78] hover:text-white disabled:opacity-80"
          >
            <RefreshCw className={cn('size-[18px]', sweeping && 'animate-spin')} aria-hidden />
            <Radar className={cn('size-[18px]', sweeping && 'hidden')} aria-hidden />
            <span>{sweeping ? 'Pinging Sweep...' : 'Ping Semua (Sweep)'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm()
              toast('Form siap untuk input perangkat baru.', 'info')
              nameRef.current?.focus()
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#f97316] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#ea580c]"
          >
            <Plus className="size-[18px]" aria-hidden />
            <span>Tambah Perangkat</span>
          </button>
        </div>
      </div>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-xl border border-[#27272a] bg-[#111111] p-5 transition-colors hover:border-[#2a2a2d]">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium uppercase tracking-wide">Total Terdaftar</span>
            <Server className="size-5 text-[#a1a1aa]" aria-hidden />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-white">{devices.length}</span>
            <span className="text-sm text-[#a1a1aa]">Unit Hardware</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#27272a] pt-2 text-xs text-[#a1a1aa]">
            <span>Terminal Barat &amp; Timur</span>
            <span className="font-mono font-medium text-[#569cd6]">100% Terhubung</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-[#27272a] bg-[#111111] p-5 transition-colors hover:border-[#2a2a2d]">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium uppercase tracking-wide">Online / Stabil</span>
            <CircleCheck className="size-5 text-[#22c55e]" aria-hidden />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-[#22c55e]">{onlineCount}</span>
            <span className="text-sm text-[#a1a1aa]">Unit (&lt;10ms)</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#27272a] pt-2 text-xs text-[#a1a1aa]">
            <span>Rata-rata Respon</span>
            <span className="font-mono font-medium text-[#22c55e]">4.2ms Jitter Free</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-[#27272a] bg-[#111111] p-5 transition-colors hover:border-[#2a2a2d]">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium uppercase tracking-wide">Latensi Tinggi</span>
            <TriangleAlert className="size-5 text-[#f59e0b]" aria-hidden />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-[#f59e0b]">{warningCount}</span>
            <span className="text-sm text-[#a1a1aa]">Unit Degradasi</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#27272a] pt-2 text-xs text-[#a1a1aa]">
            <span className="max-w-[140px] truncate">{warningUnit?.name ?? '-'}</span>
            <span className="font-mono font-medium text-[#f59e0b]">{warningUnit?.latency ?? '-'}</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-[#27272a] bg-[#111111] p-5 transition-colors hover:border-[#2a2a2d]">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium uppercase tracking-wide">Offline / Putus</span>
            <CloudOff className="size-5 text-[#ef4444]" aria-hidden />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-[#ef4444]">{offlineCount}</span>
            <span className="text-sm text-[#a1a1aa]">Unit Timeout</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#27272a] pt-2 text-xs text-[#a1a1aa]">
            <span className="max-w-[140px] truncate">{offlineUnit?.name ?? '-'}</span>
            <span className="font-mono font-medium text-[#ef4444]">ERR_TIMEOUT</span>
          </div>
        </div>
      </div>

      {/* Work Area */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* Left: Table & Logs */}
        <div className="flex flex-col gap-6 xl:col-span-8">
          <div className="flex flex-col overflow-hidden rounded-xl border border-[#27272a] bg-[#1e1e1e] shadow-sm">
            <div className="flex flex-col items-stretch justify-between gap-3 border-b border-[#27272a] bg-[#1e1e1e] p-4 md:flex-row md:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-2.5 size-[18px] text-[#a1a1aa]" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Cari ID, nama, IP endpoint (192.168.1.105)..."
                  type="text"
                  className="w-full rounded-lg border border-[#27272a] bg-[#111111] py-2 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#a1a1aa] focus:border-[#569cd6]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: `Semua (${devices.length})` },
                    { key: 'online', label: `Online (${onlineCount})` },
                    { key: 'warning', label: `Warning (${warningCount})` },
                    { key: 'offline', label: `Offline (${offlineCount})` }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setFilter(tab.key)
                      setPage(1)
                    }}
                    className={cn(
                      'cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors',
                      filter === tab.key
                        ? 'border border-[#27272a] bg-[#2a2a2d] font-medium text-white'
                        : 'bg-[#111111] text-[#a1a1aa] hover:text-white'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="select-none border-b border-[#27272a] bg-[#111111]/80 text-xs uppercase tracking-wider text-[#a1a1aa]">
                  <tr>
                    <th className="px-4 py-3.5 font-medium">ID</th>
                    <th className="px-4 py-3.5 font-medium">Nama Perangkat</th>
                    <th className="px-4 py-3.5 font-medium">Kategori</th>
                    <th className="px-4 py-3.5 font-medium">IP Address</th>
                    <th className="px-3 py-3.5 font-medium">Port</th>
                    <th className="px-4 py-3.5 font-medium">Protokol</th>
                    <th className="px-4 py-3.5 font-medium">Status &amp; Latensi</th>
                    <th className="px-4 py-3.5 text-right font-medium">Terakhir</th>
                    <th className="px-4 py-3.5 text-center font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60">
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center font-mono text-xs text-[#a1a1aa]">
                        Tidak ada perangkat yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    visible.map((device) => (
                      <tr
                        key={device.id}
                        className={cn(
                          'transition-colors',
                          device.status === 'offline'
                            ? 'bg-[#ef4444]/5 hover:bg-[#ef4444]/10'
                            : 'hover:bg-[#1f1f22]/50'
                        )}
                      >
                        <td className={cn('px-4 py-4 font-mono text-[13px] font-medium', device.status === 'offline' ? 'text-[#ef4444]' : 'text-[#4fc1ff]')}>
                          {device.id}
                        </td>
                        <td className="px-4 py-4 font-medium text-white">
                          <span className="flex items-center gap-2">
                            {device.name}
                            {device.critical && (
                              <span className="rounded bg-[#ef4444]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ef4444]">
                                Kritis
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded border border-[#27272a] bg-[#1f1f22] px-2 py-0.5 text-xs text-[#a1a1aa]">
                            {device.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-[13px] text-white">{device.ip}</td>
                        <td className="px-3 py-4 font-mono text-[13px] text-[#38bdf8]">{device.port}</td>
                        <td className="px-4 py-4 text-xs text-[#a1a1aa]">{device.proto}</td>
                        <td className="px-4 py-4">{statusPill(device)}</td>
                        <td className={cn('px-4 py-4 text-right font-mono text-xs', device.status === 'online' ? 'text-[#a1a1aa]' : 'font-medium', device.status === 'warning' && 'text-[#f59e0b]', device.status === 'offline' && 'text-[#ef4444]')}>
                          {device.lastSeenSec} dtk lalu
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" title="Ping Ulang" onClick={() => handleRowPing(device)} className="cursor-pointer rounded-md p-1.5 text-[#a1a1aa] transition-colors hover:bg-[#1f1f22] hover:text-white">
                              <RefreshCw className="size-4" aria-hidden />
                            </button>
                            <button type="button" title="Edit" onClick={() => handleEdit(device)} className="cursor-pointer rounded-md p-1.5 text-[#a1a1aa] transition-colors hover:bg-[#1f1f22] hover:text-white">
                              <Pencil className="size-4" aria-hidden />
                            </button>
                            <button type="button" title="Restart" onClick={() => handleReboot(device)} className="cursor-pointer rounded-md p-1.5 text-[#a1a1aa] transition-colors hover:bg-[#1f1f22] hover:text-[#f59e0b]">
                              <RotateCcw className="size-4" aria-hidden />
                            </button>
                            <button type="button" title="Log" onClick={() => handleRowLog(device)} className="cursor-pointer rounded-md p-1.5 text-[#a1a1aa] transition-colors hover:bg-[#1f1f22] hover:text-[#4fc1ff]">
                              <ReceiptText className="size-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-between gap-2 border-t border-[#27272a] bg-[#111111]/40 p-4 text-xs text-[#a1a1aa] sm:flex-row">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-[#22c55e]" />
                <span>Daemon Poller: {autoPing ? 'Aktif (Setiap 5.000 ms)' : 'Nonaktif'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Menampilkan {visible.length} dari {filtered.length} perangkat</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        'flex size-7 cursor-pointer items-center justify-center rounded border border-[#27272a] font-mono transition-colors',
                        page === n ? 'bg-[#1f1f22] text-white' : 'bg-[#111111] text-[#a1a1aa] hover:bg-[#1f1f22] hover:text-white'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Socket Log */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#27272a] bg-[#1e1e1e] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-[18px] text-[#4fc1ff]" aria-hidden />
                <span className="text-[13px] font-medium tracking-wide text-white">LIVE SOCKET STREAM &amp; PING PACKET LOGS</span>
              </div>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="cursor-pointer font-mono text-[11px] text-[#a1a1aa] transition-colors hover:text-white"
              >
                BERSIHKAN LOG
              </button>
            </div>
            <div className="h-28 select-none space-y-1.5 overflow-y-auto rounded-lg border border-[#27272a]/70 bg-[#0a0a0a] p-3 font-mono text-xs text-[#d4d4d4]">
              {logs.length === 0 ? (
                <div className="italic text-[#a1a1aa]">[Log visualizer dikosongkan. Menunggu paket...]</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-2">
                    <span className="text-[#a1a1aa]">[{log.time}]</span>
                    <span className={cn('font-semibold', log.tone === 'ok' && 'text-[#22c55e]', log.tone === 'warn' && 'text-[#f59e0b]', log.tone === 'err' && 'text-[#ef4444]', log.tone === 'info' && 'text-[#4fc1ff]')}>
                      {log.tag}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          <div className="flex flex-col rounded-xl border border-[#27272a] bg-[#1e1e1e] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border border-[#f97316]/20 bg-[#f97316]/10 text-[#f97316]">
                  <Cpu className="size-5" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    {editingId ? `Ubah [${editingId}]` : 'Form Cepat Perangkat'}
                  </span>
                  <span className="text-xs text-[#a1a1aa]">Konfigurasi endpoint IP &amp; Port periferal</span>
                </div>
              </div>
              <button type="button" onClick={resetForm} title="Reset Form" className="cursor-pointer rounded-md p-1.5 text-[#a1a1aa] transition-colors hover:bg-[#1f1f22] hover:text-white">
                <RotateCcw className="size-[18px]" aria-hidden />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="perangkat-name" className="text-xs font-medium text-[#a1a1aa]">NAMA PERANGKAT</label>
                <input
                  id="perangkat-name"
                  ref={nameRef}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Barcode Reader Booth 02"
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="perangkat-category" className="text-xs font-medium text-[#a1a1aa]">KATEGORI PERANGKAT</label>
                <select id="perangkat-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={inputClass}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABEL[cat]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="perangkat-ip" className="text-xs font-medium text-[#a1a1aa]">IP ADDRESS</label>
                  <input id="perangkat-ip" value={formIp} onChange={(e) => setFormIp(e.target.value)} placeholder="192.168.1.100" type="text" className={cn(inputClass, 'font-mono')} />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label htmlFor="perangkat-port" className="text-xs font-medium text-[#a1a1aa]">PORT</label>
                  <input id="perangkat-port" value={formPort} onChange={(e) => setFormPort(e.target.value)} placeholder="8080" type="text" className={cn(inputClass, 'font-mono text-[#38bdf8]')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="perangkat-proto" className="text-xs font-medium text-[#a1a1aa]">PROTOKOL</label>
                  <select id="perangkat-proto" value={formProto} onChange={(e) => setFormProto(e.target.value)} className={inputClass}>
                    {PROTOCOLS.map((proto) => (
                      <option key={proto} value={proto}>{proto === 'Modbus' ? 'Modbus TCP' : proto === 'RS485' ? 'RS-485 Serial' : proto === 'USB-HID' ? 'USB-HID / VCP' : proto}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="perangkat-timeout" className="text-xs font-medium text-[#a1a1aa]">TIMEOUT (MS)</label>
                  <input id="perangkat-timeout" value={formTimeout} onChange={(e) => setFormTimeout(e.target.value.replace(/\D/g, ''))} min={200} step={100} type="number" className={cn(inputClass, 'font-mono')} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="perangkat-lane" className="text-xs font-medium text-[#a1a1aa]">LANE ASSIGNMENT</label>
                <select id="perangkat-lane" value={formLane} onChange={(e) => setFormLane(e.target.value)} className={inputClass}>
                  <option value="LANE_WEST_01">LANE_WEST_01 (Pintu Masuk Barat 1)</option>
                  <option value="LANE_WEST_02">LANE_WEST_02 (Pintu Keluar Barat 2)</option>
                  <option value="LANE_EAST_01">LANE_EAST_01 (Pintu Masuk Timur 1)</option>
                  <option value="LANE_EAST_02">LANE_EAST_02 (Pintu Keluar Timur 2)</option>
                  <option value="CENTRAL_RACK">CENTRAL SERVER RACK (Core System)</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#27272a] bg-[#111111] p-3.5">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-white">Auto Ping Poller</span>
                  <span className="text-[11px] text-[#a1a1aa]">Polling background setiap 5 detik</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoPing}
                  onClick={() => setAutoPing((v) => !v)}
                  className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors', autoPing ? 'bg-[#22c55e]' : 'bg-[#353438]')}
                >
                  <span className={cn('pointer-events-none mt-0.5 inline-block size-5 rounded-full bg-white shadow transition-all', autoPing ? 'ml-5' : 'ml-0.5')} />
                </button>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#f97316] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#ea580c]">
                  <Save className="size-[18px]" aria-hidden />
                  <span>{editingId ? 'UPDATE PERANGKAT' : 'SIMPAN PERANGKAT'}</span>
                </button>
                <button type="button" onClick={handleTestPing} title="Uji Koneksi Langsung" className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#27272a] bg-[#111111] px-4 py-3 text-sm font-medium text-[#4fc1ff] transition-colors hover:bg-[#1f1f22]">
                  <Play className="size-[18px]" aria-hidden />
                  <span>TEST</span>
                </button>
              </div>
            </form>
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#27272a] bg-[#111111]/70 p-3.5 text-xs leading-relaxed text-[#a1a1aa]">
              <Info className="mt-0.5 size-[18px] shrink-0 text-[#569cd6]" aria-hidden />
              <span>Port 502 Modbus digunakan untuk barrier relay IO module. Pastikan firewall switch mengizinkan traffic raw socket TCP SYN/ACK pada VLAN Booth.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
