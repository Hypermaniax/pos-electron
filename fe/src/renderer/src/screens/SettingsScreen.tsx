import type React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Car,
  ChevronDown,
  Cloud,
  CloudOff,
  Database,
  Download,
  Eye,
  EyeOff,
  History,
  Info,
  KeyRound,
  Lock,
  Moon,
  Network,
  Printer,
  Receipt,
  RefreshCw,
  Save,
  Server,
  Settings2,
  Shield,
  ShieldCheck,
  Sun,
  Trash2,
  Unlock,
  Wifi
} from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { cn } from '@renderer/lib/utils'

interface MetricCard {
  label: string
  value: string
  sub: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  valueColor: string
  badge?: string
  badgeColor?: string
}

interface AuditLog {
  time: string
  supervisor: string
  action: string
  actionColor: string
  gate: string
  plate: string
  status: string
}

const METRICS: MetricCard[] = [
  { label: 'Konektivitas Node', value: 'SYMETRIC DUAL', sub: '2/2 Nodes terotorisasi & tersinkron', icon: Wifi, iconColor: 'text-park-success', valueColor: 'text-white', badge: 'ONLINE', badgeColor: 'text-park-success' },
  { label: 'Status Database', value: '148.6 MB', sub: 'Integritas 100% (CRC32 Checked)', icon: Database, iconColor: 'text-park-cyan', valueColor: 'text-white', badge: 'SQLite WAL', badgeColor: 'text-park-muted' },
  { label: 'Hardware POS Bus', value: 'TM-T82X', sub: 'Kertas 80mm - Auto-Cut Aktif', icon: Printer, iconColor: 'text-park-warning', valueColor: 'text-white', badge: 'READY', badgeColor: 'text-park-success' },
  { label: 'Active Workstation Mode', value: 'DARK ENGINE', sub: 'Peralihan berikut: 06:00 WIB', icon: Moon, iconColor: 'text-park-blue', valueColor: 'text-white', badge: 'NIGHT', badgeColor: 'text-park-cyan' }
]

const AUDIT_LOGS: AuditLog[] = [
  { time: '14:35:45 WIB', supervisor: 'Hendra Wijaya (SPV-01)', action: 'Approve Override Tiket Hilang (Denda waived 50%)', actionColor: 'text-park-warning', gate: 'Gate Exit 02', plate: 'B 1984 RFS', status: 'AUTHORIZED' },
  { time: '13:12:08 WIB', supervisor: 'Aditya Pratama (Super Admin)', action: 'Buka Palang Darurat [F11] - Ambulans Lewat', actionColor: 'text-park-error', gate: 'Gate Exit 01', plate: 'B 9112 ARS', status: 'AUTHORIZED' },
  { time: '11:47:20 WIB', supervisor: 'Hendra Wijaya (SPV-01)', action: 'Bypass Gate Kendaraan Rusak (Towing Truk Rekanan)', actionColor: 'text-park-cyan', gate: 'Gate Entry 03', plate: 'D 8023 YF', status: 'AUTHORIZED' }
]

const PRINTER_OPTIONS = [
  { value: 'epson-tm82x', label: 'EPSON TM-T82X (COM1 / USB 9100 RAW)' },
  { value: 'epson-tm20', label: 'EPSON TM-T20III Serial High-Speed (COM3)' },
  { value: 'custom-vkp80', label: 'Custom VKP80 III Kiosk Heavy Duty (TCP 9100)' },
  { value: 'generic-escpos', label: 'Generic ESC/POS Virtual Spooler' }
]

const SCANNER_OPTIONS = [
  { value: 'hid-auto', label: 'USB-HID Keyboard Wedge (Auto-Enter / Suffix CR)' },
  { value: 'com-serial', label: 'Virtual COM Port Serial Direct Polling' },
  { value: 'omni-laser', label: 'Omnidirectional Industrial Imager (Zebra DS9308)' }
]

const SYNC_OPTIONS = [
  { value: '15', label: 'Setiap 15 Detik (Ultra Realtime)' },
  { value: '30', label: 'Setiap 30 Detik (Rekomendasi)' },
  { value: '60', label: 'Setiap 60 Detik' },
  { value: '300', label: 'Setiap 5 Menit (Hemat Bandwidth)' }
]

const PIN_EXPIRY_OPTIONS = [
  { value: 'daily', label: 'Setiap Hari (Pukul 00:00 Auto-Generate)' },
  { value: 'shift', label: 'Setiap Pergantian Shift Operator (3x Sehari)' },
  { value: 'static', label: 'Statis (Hanya Berubah Manual oleh Super Admin)' }
]

const OVERRIDE_LIMIT_OPTIONS = [
  { value: '1', label: 'Maksimum 1 Kali per Shift (Ketat)' },
  { value: '3', label: 'Maksimum 3 Kali per Operator per Shift' },
  { value: '5', label: 'Maksimum 5 Kali per Operator per Shift' },
  { value: 'unlimited', label: 'Tidak Terbatas (Mode Darurat Audit Manual)' }
]

const RETENTION_OPTIONS = [
  { value: '30', label: '30 Hari (Standar Minimal)' },
  { value: '60', label: '60 Hari' },
  { value: '90', label: '90 Hari (SOP Perparkiran)' },
  { value: '365', label: '365 Hari (Audit Tahunan Penuh)' }
]

const AUTOLOCK_OPTIONS = [
  { value: '5', label: '5 Menit Idle' },
  { value: '10', label: '10 Menit Idle (Rekomendasi)' },
  { value: '30', label: '30 Menit Idle' },
  { value: '0', label: 'Nonaktifkan (Kios Mandiri Saja)' }
]

const OVERRIDE_PERMISSIONS = [
  { key: 'emergency', label: 'Buka Palang Darurat [F11]', desc: 'Trigger open barrier motor loop', icon: AlertTriangle, iconColor: 'text-park-error' },
  { key: 'discount', label: 'Diskon Denda Tiket Hilang', desc: 'Wewenang potong/hapus charge', icon: Receipt, iconColor: 'text-park-warning' },
  { key: 'bypass', label: 'Bypass Gate Kendaraan Rusak', desc: 'Towing / mogok tanpa scan keluar', icon: Car, iconColor: 'text-park-cyan' },
  { key: 'offline', label: 'Transaksi Darurat Offline', desc: 'Cetak manual saat server down', icon: CloudOff, iconColor: 'text-park-cyan' }
]

export function SettingsScreen(): React.JSX.Element {
  const toast = useToast()
  const navigate = useNavigate()
  const [showPin, setShowPin] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [offlineCache, setOfflineCache] = useState(true)
  const [autoCut, setAutoCut] = useState(true)
  const [paperWidth, setPaperWidth] = useState('80')
  const [printPolicy, setPrintPolicy] = useState('auto')
  const [fadeDuration, setFadeDuration] = useState(45)
  const [showLoketModal, setShowLoketModal] = useState(false)
  const [selectedBooth, setSelectedBooth] = useState('exit-01')
  const [overridePerms, setOverridePerms] = useState<Record<string, boolean>>({
    emergency: true,
    discount: true,
    bypass: true,
    offline: true
  })

  const [form, setForm] = useState({
    siteServerUrl: 'https://site-gw.internal.terminal:8443/api/v1',
    siteServerPort: '8443',
    siteServerTimeout: '3000',
    centralUrl: 'https://central-api.parkos.corp/nodes/site-west',
    clusterToken: 'sk_live_cluster_98f24a1b0def990234a',
    syncFrequency: '30',
    printer: 'epson-tm82x',
    scanner: 'hid-auto',
    spvPin: '882914',
    pinExpiry: 'shift',
    overrideLimit: '3',
    retention: '90',
    autoLock: '10'
  })

  const handleSave = (): void => {
    toast('Pengaturan berhasil diperbarui.', 'success')
    toast('Konfigurasi telah disinkronkan ke daemon server.', 'success')
  }

  const handleTestConnection = (): void => {
    toast('Tes Koneksi: Semua endpoint merespons normal.', 'success')
  }

  const handleRotatePin = (): void => {
    toast('PIN berhasil dirotasi & disinkronkan.', 'success')
  }

  const handleBackupDownload = (): void => {
    toast('Backup database sedang disiapkan...', 'info')
  }

  const handleClearCache = (): void => {
    toast('Cache sementara berhasil dibersihkan.', 'success')
  }

  const handleTestPrint = (): void => {
    toast('Sampel cetak ESC/POS dikirim ke printer.', 'info')
  }

  const toggleOverridePerm = (key: string): void => {
    setOverridePerms((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectClass =
    'w-full appearance-none rounded border border-park-border bg-park-secondary px-3 py-2.5 text-sm text-white outline-none focus:border-park-cta cursor-pointer'

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex max-w-3xl flex-col">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="size-2 rounded-full bg-park-cyan shadow-[0_0_8px_rgba(79,193,255,0.6)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-park-cyan">
              Global System Configuration & Node Orchestration
            </span>
            <span className="text-park-card">•</span>
            <span className="text-xs text-park-muted">REVISION v2.4.19</span>
            <span className="text-park-card">•</span>
            <span className="rounded border border-park-cta/30 bg-park-cta/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-park-cta">
              SPV Elevated
            </span>
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Pengaturan Sistem & Integrasi Terminal
          </h1>
          <p className="text-sm leading-relaxed text-park-muted">
            Konfigurasi endpoint Site Server lokal, sinkronisasi Central Backend, jadwal auto-backup database transaksi, manajemen printer thermal, serta aturan tema otomatis.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLoketModal(true)}
            className="flex items-center gap-1.5 rounded border border-park-cta/40 bg-gradient-to-r from-park-cta to-orange-600 px-4 py-2.5 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:brightness-110 active:scale-95"
          >
            <Car className="size-4" />
            <span>Buka Loket Operator (Shift)</span>
            <span className="ml-0.5 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider">[F12]</span>
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            className="flex items-center gap-1.5 rounded bg-park-card px-4 py-2.5 text-sm text-park-main shadow-sm transition-all hover:bg-park-cyan/20 hover:text-white active:scale-95"
          >
            <Network className="size-4 text-park-cyan" />
            <span>Tes Koneksi Semua Endpoint</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded bg-park-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition-all hover:bg-orange-500 active:scale-95"
          >
            <Save className="size-4" />
            <span>Simpan Semua Perubahan</span>
            <span className="text-[11px] font-normal opacity-70">[Ctrl+S]</span>
          </button>
        </div>
      </header>

      {/* Metric Band */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="flex flex-col rounded bg-park-secondary/50 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs uppercase text-park-muted">
              <span>{m.label}</span>
              <m.icon className={cn('size-4', m.iconColor)} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn('text-lg font-bold', m.valueColor)}>{m.value}</span>
              {m.badge && (
                <span className={cn('text-xs font-semibold', m.badgeColor)}>{m.badge}</span>
              )}
            </div>
            <span className="mt-1 text-xs text-park-muted">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Section 1: Network & Endpoint */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-park-cyan/20 text-xs font-bold text-park-cyan">01</span>
            <h2 className="text-lg font-bold text-white">Konfigurasi Jaringan & Endpoint Backend</h2>
          </div>
          <span className="text-xs text-park-cyan">AUTONOMOUS CLUSTER TOPOLOGY</span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Site Server Card */}
          <div className="flex flex-col justify-between gap-4 rounded bg-park-secondary/50 p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Server className="size-5 text-park-cyan" />
                  <div>
                    <h3 className="text-base font-medium text-white">Site Server Lokal (Authority Parkir Aktif)</h3>
                    <p className="text-sm text-park-muted">Pusat transaksi lokal berkecepatan tinggi di booth Barat-Terminal</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded bg-park-card px-2 py-0.5 text-xs text-park-success">
                  <span className="size-2 animate-pulse rounded-full bg-park-success" />
                  <span>Terhubung (Latency 4ms)</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase text-park-muted">IP / Host Endpoint Gateway</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.siteServerUrl}
                    onChange={(e) => setForm({ ...form, siteServerUrl: e.target.value })}
                    className="w-full rounded bg-park-secondary px-3 py-2 text-sm text-white outline-none transition-all focus:bg-park-cyan/10"
                  />
                  <Lock className="absolute right-3 top-2.5 size-4 text-park-muted" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-park-muted">Port API Gateway</label>
                  <input
                    type="text"
                    value={form.siteServerPort}
                    onChange={(e) => setForm({ ...form, siteServerPort: e.target.value })}
                    className="rounded bg-park-secondary px-3 py-2 text-sm text-white outline-none focus:bg-park-cyan/10"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-park-muted">Timeout Jaringan</label>
                  <div className="flex items-center rounded bg-park-secondary px-3 py-2">
                    <input
                      type="number"
                      value={form.siteServerTimeout}
                      onChange={(e) => setForm({ ...form, siteServerTimeout: e.target.value })}
                      className="w-full bg-transparent text-sm text-white outline-none"
                    />
                    <span className="ml-2 text-xs text-park-muted">ms</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between rounded bg-park-tertiary p-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Aktifkan Fallback Offline Cache</span>
                <span className="text-sm text-park-muted">Simpan tiket lokal jika server site terputus mendadak</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={offlineCache}
                onClick={() => setOfflineCache(!offlineCache)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                  offlineCache ? 'bg-park-success' : 'bg-park-card'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow transition duration-200',
                    offlineCache ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Central Cloud Card */}
          <div className="flex flex-col justify-between gap-4 rounded bg-park-secondary/50 p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="size-5 text-park-blue" />
                  <div>
                    <h3 className="text-base font-medium text-white">Central Cloud Backend (Master Data & Permission)</h3>
                    <p className="text-sm text-park-muted">Master database tarif pusat, membership nasional, dan e-wallet aggregator</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded bg-park-card px-2 py-0.5 text-xs text-park-success">
                  <span className="size-2 rounded-full bg-park-success" />
                  <span>Sync Validated CRC32: 0x9AF41B</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase text-park-muted">URL Central Aggregator</label>
                <input
                  type="text"
                  value={form.centralUrl}
                  onChange={(e) => setForm({ ...form, centralUrl: e.target.value })}
                  className="w-full rounded bg-park-secondary px-3 py-2 text-sm text-white outline-none transition-all focus:bg-park-cyan/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-park-muted">Node Cluster Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={form.clusterToken}
                      onChange={(e) => setForm({ ...form, clusterToken: e.target.value })}
                      className="w-full rounded bg-park-secondary px-3 py-2 text-sm tracking-widest text-white outline-none focus:bg-park-cyan/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-2 text-park-muted hover:text-white"
                    >
                      {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-park-muted">Frekuensi Polling Sync</label>
                  <div className="relative">
                    <select
                      value={form.syncFrequency}
                      onChange={(e) => setForm({ ...form, syncFrequency: e.target.value })}
                      className={selectClass}
                    >
                      {SYNC_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between rounded bg-park-tertiary p-4">
              <div className="flex items-center gap-2 text-xs text-park-muted">
                <RefreshCw className="size-4 text-park-cyan" />
                <span>Handshake terakhir berhasil: <strong className="text-sm text-white">14:31:58 WIB</strong></span>
              </div>
              <button
                type="button"
                onClick={() => toast('Re-sync paksa dimulai...', 'info')}
                className="text-xs font-bold uppercase tracking-wider text-park-cyan hover:underline"
              >
                Re-sync Paksa
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Hardware & Printer */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-park-cyan/20 text-xs font-bold text-park-cyan">02</span>
            <h2 className="text-lg font-bold text-white">Hardware Loket & Printer Thermal Default</h2>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-park-success">
            <span className="size-1.5 rounded-full bg-park-success" />
            DRIVER ESC/POS READY
          </span>
        </div>
        <div className="flex flex-col gap-4 rounded bg-park-secondary/50 p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase text-park-muted">Default Thermal Printer Driver</label>
              <div className="relative">
                <select
                  value={form.printer}
                  onChange={(e) => setForm({ ...form, printer: e.target.value })}
                  className={selectClass}
                >
                  {PRINTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
              </div>
              <span className="mt-1 text-xs text-park-cyan">Status Port: Terbuka, Baud Rate 115200 bps, Buffer 4KB Ready</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase text-park-muted">Barcode / QR Scanner Input Mode</label>
              <div className="relative">
                <select
                  value={form.scanner}
                  onChange={(e) => setForm({ ...form, scanner: e.target.value })}
                  className={selectClass}
                >
                  {SCANNER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
              </div>
              <span className="mt-1 text-xs text-park-muted">Prefix/Suffix: [STX] None | [ETX] Enter (\r\n)</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Paper Width */}
            <div className="flex flex-col gap-2 rounded bg-park-card p-4">
              <span className="text-xs font-bold uppercase text-park-muted">Lebar Kertas Struk</span>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="paper-width" value="80" checked={paperWidth === '80'} onChange={() => setPaperWidth('80')} className="size-4 cursor-pointer accent-park-cta" />
                <span className="text-sm font-semibold text-white">80mm (Standar POS & Parkir)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 opacity-80 hover:opacity-100">
                <input type="radio" name="paper-width" value="58" checked={paperWidth === '58'} onChange={() => setPaperWidth('58')} className="size-4 cursor-pointer accent-park-cta" />
                <span className="text-sm text-park-muted">58mm (Kompak Kiosk)</span>
              </label>
            </div>
            {/* Auto-Cut */}
            <div className="flex flex-col justify-between rounded bg-park-card p-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-park-muted">Opsi Auto-Cut Kertas</span>
                <p className="mt-1 text-sm text-park-muted">Kirim instruksi GS V 66 0 pemotong otomatis pasca struk tercetak</p>
              </div>
              <div className="mt-2 flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-park-success">Aktif (Potong Penuh)</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCut}
                  onClick={() => setAutoCut(!autoCut)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                    autoCut ? 'bg-park-success' : 'bg-park-card'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow transition duration-200',
                      autoCut ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
            {/* Print Policy */}
            <div className="flex flex-col gap-2 rounded bg-park-card p-4">
              <span className="text-xs font-bold uppercase text-park-muted">Kebijakan Cetak Struk</span>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="print-policy" value="auto" checked={printPolicy === 'auto'} onChange={() => setPrintPolicy('auto')} className="size-4 cursor-pointer accent-park-cta" />
                <span className="text-sm font-semibold text-white">Cetak Otomatis Setiap Transaksi</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 opacity-80 hover:opacity-100">
                <input type="radio" name="print-policy" value="demand" checked={printPolicy === 'demand'} onChange={() => setPrintPolicy('demand')} className="size-4 cursor-pointer accent-park-cta" />
                <span className="text-sm text-park-muted">Hanya Atas Permintaan Kasir</span>
              </label>
            </div>
          </div>
          {/* Test Print */}
          <div className="flex items-center justify-between rounded bg-park-secondary px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-park-muted">
              <Receipt className="size-4 text-park-cta" />
              <span>Verifikasi fisik pemotong dan density font struk thermal</span>
            </div>
            <button
              type="button"
              onClick={handleTestPrint}
              className="rounded bg-park-card px-4 py-1 text-xs text-white transition-colors hover:bg-park-cyan/20"
            >
              Kirim Sampel Cetak Uji Coba (ESC/POS Feed)
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Master Authorization & Override */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-park-cyan/20 text-xs font-bold text-park-cyan">03</span>
            <ShieldCheck className="size-5 text-park-cta" />
            <h2 className="text-lg font-bold text-white">Master Kode Otorisasi & Override Darurat (Supervisor / Super Admin)</h2>
          </div>
          <span className="flex items-center gap-1.5 rounded border border-park-cta/30 bg-park-cta/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-park-cta">
            <span className="size-1.5 animate-ping rounded-full bg-park-cta" />
            Restricted Level 0: SPV Elevation
          </span>
        </div>
        <div className="flex flex-col gap-4 rounded border border-park-cta/20 bg-park-secondary/50 p-5 shadow-md">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* SPV PIN */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-xs font-bold uppercase text-park-muted">
                  <KeyRound className="size-3.5 text-park-cta" />
                  Master PIN Otorisasi SPV
                </label>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-park-success">
                  <span className="size-1.5 rounded-full bg-park-success" />
                  Aktif & Terenkripsi SHA-256
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={form.spvPin}
                  onChange={(e) => setForm({ ...form, spvPin: e.target.value })}
                  maxLength={6}
                  className="w-full rounded border border-park-border bg-park-secondary px-3.5 py-2.5 text-lg tracking-[0.35em] text-white outline-none transition-all focus:border-park-cta focus:bg-park-cyan/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 flex items-center justify-center rounded p-1 text-park-muted hover:text-white"
                >
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <span className="text-[11px] text-park-muted">
                Digunakan loket kasir saat menekan shortcut <strong className="text-park-cyan">[F11] Override</strong>
              </span>
            </div>
            {/* PIN Expiry */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-xs font-bold uppercase text-park-muted">
                <RefreshCw className="size-3.5 text-park-cyan" />
                Kebijakan Masa Berlaku PIN
              </label>
              <div className="relative">
                <select
                  value={form.pinExpiry}
                  onChange={(e) => setForm({ ...form, pinExpiry: e.target.value })}
                  className={selectClass}
                >
                  {PIN_EXPIRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
              </div>
              <span className="text-[11px] text-park-muted">Sinkronisasi instan ke seluruh lane gate terminal via socket internal</span>
            </div>
            {/* Override Limit */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-xs font-bold uppercase text-park-muted">
                <Shield className="size-3.5 text-park-warning" />
                Batas Override Tanpa Tiket
              </label>
              <div className="relative">
                <select
                  value={form.overrideLimit}
                  onChange={(e) => setForm({ ...form, overrideLimit: e.target.value })}
                  className={selectClass}
                >
                  {OVERRIDE_LIMIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
              </div>
              <span className="flex items-center gap-1 text-[11px] text-park-warning">
                <Lock className="size-3" />
                Mengunci loket & minta verifikasi fisik SPV jika batas terlampaui
              </span>
            </div>
          </div>

          {/* Override Permissions */}
          <div className="flex flex-col gap-2 rounded border border-park-border bg-park-secondary p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-park-muted">
                <Settings2 className="size-4 text-park-cyan" />
                Kategori Izin Override yang Diizinkan dengan PIN SPV
              </span>
              <span className="text-[11px] text-park-muted">Loket gate memverifikasi hak akses ini secara real-time</span>
            </div>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {OVERRIDE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex cursor-pointer items-start gap-2.5 rounded bg-park-card p-2 transition-colors hover:bg-park-card/80"
                >
                  <input
                    type="checkbox"
                    checked={overridePerms[perm.key]}
                    onChange={() => toggleOverridePerm(perm.key)}
                    className="mt-0.5 size-4 cursor-pointer rounded accent-park-cta"
                  />
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1 text-sm font-semibold text-white">
                      <perm.icon className={cn('size-3.5', perm.iconColor)} />
                      {perm.label}
                    </span>
                    <span className="text-[11px] text-park-muted">{perm.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Rotate PIN */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-park-muted">
              <Lock className="size-4 text-park-success" />
              <span>Terakhir dirotasi: <strong>Hari ini 06:00:12 WIB</strong> oleh Super Admin (Aditya P.)</span>
            </div>
            <button
              type="button"
              onClick={handleRotatePin}
              className="flex items-center gap-2 rounded bg-park-cta px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md transition-all hover:bg-orange-500 active:scale-95"
            >
              <RefreshCw className="size-4" />
              <span>Simpan & Rotasi PIN Baru</span>
              <span className="text-[11px] font-normal opacity-80">[CTRL+K]</span>
            </button>
          </div>

          {/* Audit Log */}
          <div className="flex flex-col gap-2 border-t border-park-border pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4 text-park-cyan" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Log Riwayat Audit Override Terakhir (Live Feed)</span>
              </div>
              <span className="text-[11px] text-park-muted">3 Aktivitas Override Supervisor Terkini</span>
            </div>
            <div className="overflow-x-auto rounded border border-park-border bg-park-tertiary">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-park-border bg-park-card text-[10px] uppercase tracking-wider text-park-muted">
                  <tr>
                    <th className="px-3 py-2 font-bold">Waktu</th>
                    <th className="px-3 py-2 font-bold">Supervisor Penyetuju</th>
                    <th className="px-3 py-2 font-bold">Jenis Tindakan Override</th>
                    <th className="px-3 py-2 font-bold">Lokasi / Gate</th>
                    <th className="px-3 py-2 font-bold">Identitas / Plat No.</th>
                    <th className="px-3 py-2 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-park-border/50 text-park-main">
                  {AUDIT_LOGS.map((log, i) => (
                    <tr key={i} className="transition-colors hover:bg-park-card/40">
                      <td className="px-3 py-2.5 font-bold text-park-cyan">{log.time}</td>
                      <td className="px-3 py-2.5 font-semibold text-white">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-park-success" />
                          {log.supervisor}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border border-current/30 bg-current/10 px-2 py-0.5 text-[11px] font-semibold', log.actionColor)}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-white">{log.gate}</td>
                      <td className="px-3 py-2.5 font-mono font-bold tracking-wider text-white">{log.plate}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="rounded bg-park-success/15 px-2 py-0.5 text-[10px] font-bold text-park-success">{log.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 & 5: Theme + Database */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Section 4: Theme */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-park-cyan/20 text-xs font-bold text-park-cyan">04</span>
            <h2 className="text-lg font-bold text-white">Sinkronisasi Waktu & Tema Otomatis</h2>
          </div>
          <div className="flex h-full flex-col justify-between gap-4 rounded bg-park-secondary/50 p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">Tema Workstation Adaptif</span>
                  <p className="text-sm text-park-muted">Pergantian visual gelap-terang otomatis untuk kenyamanan mata shift operator</p>
                </div>
                <div className="rounded bg-park-card px-2.5 py-1 text-xs font-bold tracking-wide text-park-cyan">
                  TEMA GELAP AKTIF
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col rounded bg-park-secondary p-3">
                  <span className="flex items-center gap-1 text-xs font-bold uppercase text-park-warning">
                    <Sun className="size-3.5" />
                    Jadwal Siang (Terang)
                  </span>
                  <span className="mt-1 text-xl font-bold text-white">06:00 - 18:00</span>
                  <span className="text-xs text-park-muted">WIB (Zona Waktu Barat)</span>
                </div>
                <div className="flex flex-col rounded bg-park-secondary p-3">
                  <span className="flex items-center gap-1 text-xs font-bold uppercase text-park-blue">
                    <Moon className="size-3.5" />
                    Jadwal Malam (Gelap)
                  </span>
                  <span className="mt-1 text-xl font-bold text-white">18:00 - 06:00</span>
                  <span className="text-xs text-park-cyan">Aktif Sekarang</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase text-park-muted">Durasi Fade Transisi Gradual</span>
                  <span className="font-bold text-park-cyan">{fadeDuration} Detik</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={fadeDuration}
                  onChange={(e) => setFadeDuration(parseInt(e.target.value, 10))}
                  className="h-2 w-full cursor-pointer rounded accent-park-cyan"
                />
                <span className="text-sm text-park-muted">
                  Peralihan gamma kontras bertahap tanpa flash silau pada layar sentuh booth.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded bg-park-card p-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-park-success" />
                <span className="text-xs text-white">NTP Server Sync: <strong>id.pool.ntp.org</strong></span>
              </div>
              <span className="text-xs text-park-muted">Offset: ±0.002s</span>
            </div>
          </div>
        </section>

        {/* Section 5: Database & Security */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-park-cyan/20 text-xs font-bold text-park-cyan">05</span>
            <h2 className="text-lg font-bold text-white">Database & Kebijakan Keamanan</h2>
          </div>
          <div className="flex h-full flex-col justify-between gap-4 rounded bg-park-secondary/50 p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">Audit Trail & Local Persistence</span>
                  <p className="text-sm text-park-muted">Pengarsipan transaksi terenkripsi & proteksi terminal tanpa pengawasan</p>
                </div>
                <span className="rounded bg-park-card px-2 py-0.5 text-xs text-park-success">AES-256 ENCRYPTED</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-park-muted">Retensi Log Audit Transaksi</label>
                  <div className="relative">
                    <select
                      value={form.retention}
                      onChange={(e) => setForm({ ...form, retention: e.target.value })}
                      className={selectClass}
                    >
                      {RETENTION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-park-muted">Auto-Lock Layar Kasir</label>
                  <div className="relative">
                    <select
                      value={form.autoLock}
                      onChange={(e) => setForm({ ...form, autoLock: e.target.value })}
                      className={selectClass}
                    >
                      {AUTOLOCK_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded bg-park-secondary p-3">
                <Database className="size-4 text-park-cyan" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">Auto Backup SQLite Database</span>
                  <span className="text-xs text-park-muted">Dijadwalkan otomatis setiap hari pukul <strong>23:59:00 WIB</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleBackupDownload}
                className="flex flex-1 items-center justify-center gap-1.5 rounded bg-park-card px-4 py-2 text-xs text-white transition-colors hover:bg-park-cyan/20"
              >
                <Download className="size-4 text-park-success" />
                <span>Unduh Cadangan (.sql.gz)</span>
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                className="flex items-center justify-center gap-1.5 rounded bg-park-card px-4 py-2 text-xs text-park-muted transition-colors hover:bg-park-error/20 hover:text-park-error"
              >
                <Trash2 className="size-4" />
                <span>Bersihkan Cache Sementara</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Loket Modal */}
      {showLoketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-park-cta/40 bg-park-secondary/50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-park-border bg-park-tertiary px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded bg-park-cta text-white">
                  <Car className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold leading-tight text-white">Buka Sesi Loket Operator</h3>
                  <span className="text-[11px] font-semibold text-park-cta">MODE SUPERVISI & OPERASI KASIR</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoketModal(false)}
                className="rounded p-1 text-park-muted transition-colors hover:bg-park-card hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-2 rounded border border-park-border bg-park-card p-4">
                <div className="flex items-center justify-between text-xs text-park-muted">
                  <span>Supervisor Bertugas:</span>
                  <span className="font-mono font-bold text-white">Aditya P. / Hendra Wijaya</span>
                </div>
                <div className="flex items-center justify-between text-xs text-park-muted">
                  <span>Terminal / Gate:</span>
                  <span className="font-mono font-bold text-park-cyan">
                    {selectedBooth === 'entry-02'
                      ? 'BOOTH ENTRY BARAT 02 [DISPENSER-EN-02]'
                      : 'BOOTH EXIT BARAT 01 [GATE-EX-01]'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-park-muted">
                  <span>Shift Operasional:</span>
                  <span className="font-mono font-bold text-park-warning">SHIFT 2 (14:00 - 22:00 WIB)</span>
                </div>
                <div className="flex items-center justify-between text-xs text-park-muted">
                  <span>Hak Otorisasi Kasir:</span>
                  <span className="font-mono font-bold text-park-success">FULL BYPASS + DISKON + REPRINT</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-park-muted">Pilih Posisi Booth Tujuan</label>
                <div className="relative">
                  <select
                    value={selectedBooth}
                    onChange={(e) => setSelectedBooth(e.target.value)}
                    className={selectClass}
                  >
                    <option value="exit-01">Booth Exit Barat 01 (Utama - High Traffic)</option>
                    <option value="exit-02">Booth Exit Barat 02 (Mobil & Bus Khusus)</option>
                    <option value="entry-01">Booth Entry Barat 01 (Mode Manless Recovery)</option>
                    <option value="entry-02">Booth Entry Barat 02 (Manless - Dispenser Ticketing)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-park-muted" />
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded border border-park-cta/30 bg-park-cta/10 p-3 text-sm text-park-main">
                <Info className="mt-0.5 size-4 shrink-0 text-park-cta" />
                <span>Sesi dashboard Admin tetap aktif di background. Menekan <strong className="text-white">[F12]</strong> pada layar kasir nantinya akan mengembalikan tampilan ke konsol pengawasan SPV ini.</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-park-border bg-park-secondary px-5 py-3">
              <button
                type="button"
                onClick={() => setShowLoketModal(false)}
                className="rounded bg-park-card px-4 py-2 text-sm text-park-muted transition-colors hover:bg-park-card/80 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLoketModal(false)
                  if (selectedBooth === 'entry-02') {
                    toast('Membuka Kiosk Manless - Booth Entry Barat 02 (Dispenser Ticketing).', 'success')
                    navigate('/kiosk?booth=entry-west-02&mode=manless')
                    return
                  }
                  toast('Membuka Sesi Loket Operator - Booth Exit Barat 01.', 'success')
                }}
                className="flex items-center gap-2 rounded bg-park-cta px-5 py-2 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-orange-500 active:scale-95"
              >
                <Unlock className="size-4" />
                <span>
                  {selectedBooth === 'entry-02'
                    ? 'Buka Kiosk Dispenser Manless'
                    : 'Masuk ke Loket Kasir [F12]'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
