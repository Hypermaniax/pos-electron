import type React from 'react'
import { useEffect, useState } from 'react'
import {
  Activity,
  ScanBarcode,
  CheckCircle2,
  CircleCheck,
  CreditCard,
  Download,
  Gauge,
  Headset,
  Keyboard,
  Moon,
  Network,
  Printer,
  QrCode,
  Receipt,
  Save,
  ShieldAlert,
  Sun,
  Timer,
  Wrench,
  Zap
} from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { cn } from '@renderer/lib/utils'

type HelpTab = 'manual' | 'sop' | 'maint' | 'diagnostic'
type ThemeMode = 'dark' | 'light' | 'auto'

interface ThemeCard {
  mode: ThemeMode
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  active?: boolean
}

interface StepCard {
  step: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  footer: string
  footerColor: string
}

interface SopCard {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  steps: string[]
  stepColor: string
}

interface MaintItem {
  title: string
  status: string
  statusColor: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  schedule: string
  assignee: string
}

interface DiagService {
  name: string
  status: string
  statusColor: string
  ping: string
  address: string
  description: string
  dotColor: string
}

const THEME_CARDS: ThemeCard[] = [
  {
    mode: 'dark',
    title: 'Tema Gelap (Dark Mode)',
    description: 'Direkomendasikan untuk ruang loket berkanopi redup, shift malam, serta mengurangi kelelahan visual operator saat transaksi panjang.',
    icon: Moon,
    iconColor: 'text-park-blue'
  },
  {
    mode: 'light',
    title: 'Tema Terang (Light Mode)',
    description: 'Kontras tinggi untuk loket drive-thru outdoor dengan paparan sinar matahari terik, menjaga visibilitas plat nomor dan nominal transaksi.',
    icon: Sun,
    iconColor: 'text-park-warning'
  },
  {
    mode: 'auto',
    title: 'Sinkronisasi Waktu Otomatis',
    description: '',
    icon: Timer,
    iconColor: 'text-park-cyan',
    active: true
  }
]

const STEPS: StepCard[] = [
  {
    step: 'LANGKAH 01',
    title: 'Scan Tiket Masuk (Barcode)',
    description: 'Posisikan tiket 10-15 cm di depan sinar scanner. Pastikan plat nomor di kamera ANPR cocok dengan fisik kendaraan di depan loket.',
    icon: ScanBarcode,
    iconColor: 'text-park-cyan',
    footer: 'Autofokus input barcode aktif',
    footerColor: 'text-park-success'
  },
  {
    step: 'LANGKAH 02',
    title: 'Penerimaan Tunai (Cash)',
    description: 'Ketik nominal uang diterima pada tombol Numpad lalu tekan Enter. Layar kembalian otomatis tampil ke pengemudi.',
    icon: CreditCard,
    iconColor: 'text-park-cta',
    footer: 'Laci kasir (Cash Drawer) auto-buka',
    footerColor: 'text-park-cyan'
  },
  {
    step: 'LANGKAH 03',
    title: 'Generate Dinamis QRIS',
    description: 'Tekan tombol F3 untuk menampilkan QRIS dinamis. Bila timeout 60s tercapai tanpa settlement, tekan Regenerate QR.',
    icon: QrCode,
    iconColor: 'text-park-warning',
    footer: 'Countdown otomatis 60 dtk',
    footerColor: 'text-park-warning'
  },
  {
    step: 'LANGKAH 04',
    title: 'Tap Kartu E-Money / Flazz',
    description: 'Instruksikan pengendara menempelkan kartu pada reader SAM 1-2 detik hingga buzzer hijau berbunyi dan struk transaksi tercetak rapi.',
    icon: Zap,
    iconColor: 'text-park-blue',
    footer: 'Palang barrier auto-terangkat',
    footerColor: 'text-park-success'
  }
]

const SOP_ITEMS: SopCard[] = [
  {
    title: 'SOP Barcode Rusak / Unreadable',
    subtitle: 'Prosedur Verifikasi Manual',
    icon: ScanBarcode,
    iconColor: 'text-park-warning',
    stepColor: 'text-park-cyan',
    steps: [
      'Gunakan input nomor tiket manual di pojok kanan atas layar transaksi.',
      'Bila tiket rusak total, lakukan pencarian jam masuk berdasarkan rekaman ANPR plat nomor.',
      'Jika tiket hilang, terapkan denda tiket hilang dengan menekan F7 dan periksa fisik STNK asli.'
    ]
  },
  {
    title: 'SOP Override Palang Darurat [F11]',
    subtitle: 'Prosedur Prioritas VIP / Ambulans',
    icon: ShieldAlert,
    iconColor: 'text-park-error',
    stepColor: 'text-park-error',
    steps: [
      'Tekan F11 untuk membuka dialog otorisasi darurat instan.',
      'Pilih kategori: Kendaraan Darurat (Ambulans/Damkar) atau Kendala Mekanik Barrier.',
      'Sistem otomatis menyimpan klip 10 detik rekaman CCTV booth ke log server pusat.'
    ]
  },
  {
    title: 'SOP Tutup Shift & Settlement',
    subtitle: 'Prosedur Rekonsiliasi Kasir',
    icon: Receipt,
    iconColor: 'text-park-success',
    stepColor: 'text-park-success',
    steps: [
      'Klik "Tutup Shift Sekarang" sebelum batas waktu pergantian shift loket.',
      'Cetak struk rekapitulasi rangkap dua (1 untuk Supervisor, 1 arsip kasir).',
      'Hitung fisik kas tunai di laci dan pastikan presisi dengan laporan sistem.'
    ]
  },
  {
    title: 'Pemadaman Listrik & UPS Fallback',
    subtitle: 'Operasi Pasokan Cadangan Baterai',
    icon: Zap,
    iconColor: 'text-park-cta',
    stepColor: 'text-park-cta',
    steps: [
      'Unit UPS menopang workstation hingga 45 Menit saat PLN padam.',
      'Utamakan transaksi non-tunai atau cash pas tanpa cetak berulang guna menghemat daya.',
      'Bila genset area belum aktif dalam 20 menit, segera eskalasi ke Command Center.'
    ]
  }
]

const MAINT_ITEMS: MaintItem[] = [
  {
    title: 'Pembersihan Sensor Optik Barcode Scanner',
    status: 'SELESAI HARI INI',
    statusColor: 'text-park-success',
    description: 'Gunakan lap microfiber & alkohol 70% pada permukaan kaca pemindai.',
    icon: CircleCheck,
    iconColor: 'text-park-success',
    schedule: 'Harian (06:00 WIB)',
    assignee: 'Joko — Shift 1'
  },
  {
    title: 'Pemeriksaan Kertas Thermal & Head Printer',
    status: 'READY (65%)',
    statusColor: 'text-park-cyan',
    description: 'Sedia minimal 2 roll cadangan 80mm di laci kabinet loket.',
    icon: Printer,
    iconColor: 'text-park-cyan',
    schedule: 'Tiap Ganti Shift',
    assignee: 'Jadwal: 18:00 WIB'
  },
  {
    title: 'Inspeksi Pegas & Motor Arm Barrier Gate',
    status: 'H-2 MINGGUAN',
    statusColor: 'text-park-warning',
    description: 'Cek ketegangan balance arm, pelumasan gir, serta loop detector keselamatan.',
    icon: Wrench,
    iconColor: 'text-park-warning',
    schedule: 'Sabtu, 10:00 WIB',
    assignee: 'Tim Fasilitas'
  }
]

const DIAG_SERVICES: DiagService[] = [
  {
    name: 'Lokal Site Server',
    status: 'EXCELLENT',
    statusColor: 'text-park-success',
    ping: '3',
    address: '192.168.1.10 (LAN)',
    description: 'Respons database transaksi lokal tanpa lag.',
    dotColor: 'bg-park-success'
  },
  {
    name: 'Central Cloud',
    status: 'STABLE',
    statusColor: 'text-park-cyan',
    ping: '24',
    address: 'api.park-os.central',
    description: 'Sinkronisasi data member & tarif otomatis.',
    dotColor: 'bg-park-cyan'
  },
  {
    name: 'QRIS Switch Gateway',
    status: 'CONNECTED',
    statusColor: 'text-park-cyan',
    ping: '45',
    address: 'Bank Switch Gateway',
    description: 'Verifikasi real-time e-wallet QRIS BI.',
    dotColor: 'bg-park-cyan'
  }
]

export function BantuanScreen(): React.JSX.Element {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<HelpTab>('manual')
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('auto')
  const [fadeEnabled, setFadeEnabled] = useState(true)
  const [pingValues, setPingValues] = useState({ local: '3', cloud: '24', qris: '45' })
  const [isRunningDiag, setIsRunningDiag] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'F1') {
        e.preventDefault()
        setActiveTab('manual')
        toast('Pintasan [F1] Ditekan: Membuka Panduan Kasir', 'info')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toast])

  const runDiagnostics = (): void => {
    setIsRunningDiag(true)
    setPingValues({ local: 'PINGING...', cloud: 'PINGING...', qris: 'PINGING...' })
    setTimeout(() => {
      setPingValues({
        local: String(Math.floor(Math.random() * 2) + 2),
        cloud: String(Math.floor(Math.random() * 6) + 21),
        qris: String(Math.floor(Math.random() * 10) + 40)
      })
      setIsRunningDiag(false)
      toast('Diagnostik Jaringan Selesai: 100% Layanan Sehat', 'success')
    }, 1200)
  }

  const tabs: { key: HelpTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { key: 'manual', label: 'A. Manual Operasi Kasir', icon: Receipt },
    { key: 'sop', label: 'B. SOP Darurat & Shift', icon: ShieldAlert },
    { key: 'maint', label: 'C. Jadwal Perawatan Alat', icon: Wrench, badge: '●' },
    { key: 'diagnostic', label: 'D. Diagnostik Jaringan & Ping', icon: Gauge, badge: 'ONLINE' }
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-park-primary p-5 shadow-md md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-park-secondary text-park-cta">
            <Headset className="size-6" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-park-cyan">
                Modul Konsol 07 & 08
              </span>
              <span className="rounded-full bg-park-success/10 px-2 py-0.5 text-[11px] font-medium text-park-success">
                Live Runtime
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Preferensi Tampilan & Pusat Bantuan [F1]
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-park-border/50 bg-park-secondary px-3 py-2 text-xs text-park-muted">
            <span className="uppercase tracking-wider">Hotkey:</span>
            <kbd className="rounded border border-park-border bg-park-base px-2 py-1 font-mono text-[11px] font-semibold text-park-cyan">F1</kbd>
            <span>Bantuan</span>
            <span className="text-park-border">•</span>
            <kbd className="rounded border border-park-border bg-park-base px-2 py-1 font-mono text-[11px] font-semibold text-park-warning">F11</kbd>
            <span>Emergency</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('diagnostic')
              toast('Membuka Diagnostik Jaringan...', 'info')
            }}
            className="flex items-center gap-2 rounded-lg border border-park-cyan/30 bg-park-cyan/10 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-park-cyan/20"
          >
            <Network className="size-4 text-park-cyan" />
            <span>Cek Jaringan</span>
          </button>
        </div>
      </div>

      {/* Section 1: Theme & Visual */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-park-cta" />
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Bagian 1: Pengaturan Tema & Visual Workstation
            </h2>
          </div>
          <span className="rounded border border-park-border/40 bg-park-secondary px-2.5 py-1 text-xs text-park-muted">
            LOKET ID: BARAT-BOOTH-01
          </span>
        </div>

        {/* Theme Cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {THEME_CARDS.map((card) => (
            <div
              key={card.mode}
              onClick={() => setSelectedTheme(card.mode)}
              className={cn(
                'group relative flex cursor-pointer flex-col justify-between rounded-xl border p-6 transition-all duration-200',
                selectedTheme === card.mode
                  ? 'border-park-cyan/60 bg-park-card shadow-lg'
                  : 'border-park-border/60 bg-park-primary hover:border-park-blue/50'
              )}
            >
              {card.active && selectedTheme === 'auto' && (
                <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-park-success px-2.5 py-0.5 text-[11px] font-bold text-park-tertiary shadow-sm">
                  <Timer className="size-3" />
                  <span>AKTIF BERJALAN</span>
                </div>
              )}
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-park-secondary">
                      <card.icon className={cn('size-5', card.iconColor)} />
                    </div>
                    <span className="text-base font-semibold text-white">{card.title}</span>
                  </div>
                  <div
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border',
                      selectedTheme === card.mode
                        ? 'border-park-cyan bg-park-cyan'
                        : 'border-park-border bg-park-secondary'
                    )}
                  >
                    {selectedTheme === card.mode && <CheckCircle2 className="size-3.5 text-white" />}
                  </div>
                </div>
                {card.description && (
                  <p className="text-sm leading-relaxed text-park-muted">{card.description}</p>
                )}
                {card.mode === 'auto' && (
                  <div className="flex flex-col gap-2 rounded-lg border border-park-border/50 bg-park-secondary/70 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-park-muted">06:00 - 18:00 WIB</span>
                      <span className="flex items-center gap-1.5 font-medium text-park-warning">
                        <Sun className="size-3.5" /> Terang (Light)
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-park-border/30 pt-1">
                      <span className="text-park-muted">18:00 - 06:00 WIB</span>
                      <span className="flex items-center gap-1.5 font-medium text-park-blue">
                        <Moon className="size-3.5" /> Gelap (Dark)
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-park-border/40 pt-4 text-xs text-park-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-park-base border border-park-border" />
                  {card.mode === 'dark' && '#18181b Surface'}
                  {card.mode === 'light' && '#e4e1e6 High Contrast'}
                  {card.mode === 'auto' && 'Sinkronisasi Waktu'}
                </span>
                <span className="rounded bg-park-cta/20 px-2 py-0.5 font-medium text-park-cta">
                  {card.mode === 'dark' && 'CTA #f97316'}
                  {card.mode === 'light' && 'CTA #ea580c'}
                  {card.mode === 'auto' && 'AUTO MODE'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Fade Control */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-park-border/50 bg-park-primary p-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-park-secondary text-park-cyan">
              <Activity className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Transisi Halus Otomatis (Fade Transition Engine)</h3>
              <p className="text-xs text-park-muted">Mencegah lonjakan kontras seketika saat rotasi shift fajar/senja melalui interpolasi warna berangsur.</p>
            </div>
          </div>
          <div className="flex items-center gap-5 self-end md:self-auto">
            <div className="flex items-center gap-2 rounded-lg border border-park-border/50 bg-park-secondary px-3 py-1.5 text-xs">
              <span className="text-park-muted">DURASI FADE:</span>
              <span className="font-semibold text-white">45 DETIK</span>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={fadeEnabled}
                onChange={(e) => setFadeEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-12 rounded-full bg-park-secondary after:absolute after:top-[2px] after:left-[3px] after:size-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-park-cta peer-checked:after:translate-x-6" />
              <span className="ml-2.5 text-xs font-semibold text-park-success">AKTIF</span>
            </label>
          </div>
        </div>
      </section>

      {/* Section 2: Help Center */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-park-cyan" />
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Bagian 2: Pusat Bantuan Terpadu [F1], SOP & Utilitas Hardware
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-park-muted">
            <span>DIREKTORI REVISI:</span>
            <span className="rounded border border-park-border/50 bg-park-secondary px-2 py-0.5 font-mono text-park-cyan">
              DOC-2025.Q1-LOKET
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-park-border/40 bg-park-primary p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium transition-all md:text-sm',
                activeTab === tab.key
                  ? 'bg-park-cyan/20 font-semibold text-white shadow-sm'
                  : 'text-park-muted hover:bg-park-secondary hover:text-white'
              )}
            >
              <tab.icon className="size-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.key === 'maint' && (
                <span className="size-2 rounded-full bg-park-warning" />
              )}
              {tab.badge && tab.key === 'diagnostic' && (
                <span className="rounded bg-park-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-park-success">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="min-h-[380px] rounded-xl border border-park-border/40 bg-park-primary p-6">
          {/* TAB A: Manual */}
          {activeTab === 'manual' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((step) => (
                  <div
                    key={step.step}
                    className="flex flex-col justify-between rounded-xl border border-park-border/50 bg-park-secondary/70 p-5 transition-all duration-200 hover:border-park-border"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-park-cyan/20 px-2 py-0.5 text-[11px] font-semibold text-park-cyan">
                          {step.step}
                        </span>
                        <step.icon className={cn('size-5', step.iconColor)} />
                      </div>
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                      <p className="text-xs leading-relaxed text-park-muted">{step.description}</p>
                    </div>
                    <div className={cn('mt-4 flex items-center gap-1.5 border-t border-park-border/30 pt-3 text-xs', step.footerColor)}>
                      <CheckCircle2 className="size-3.5" />
                      <span>{step.footer}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Keyboard Shortcuts */}
              <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-park-border/50 bg-park-secondary p-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-park-border bg-park-primary text-park-cta">
                    <Keyboard className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-white">Pintasan Keyboard Loket Kasir:</span>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-park-muted">
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border border-park-border bg-park-primary px-1.5 py-0.5 font-mono text-[11px] text-white">Space</kbd>
                        Uang Pas
                      </span>
                      <span className="text-park-border">•</span>
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border border-park-border bg-park-primary px-1.5 py-0.5 font-mono text-[11px] text-white">F2</kbd>
                        QRIS Cepat
                      </span>
                      <span className="text-park-border">•</span>
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border border-park-border bg-park-primary px-1.5 py-0.5 font-mono text-[11px] text-white">F4</kbd>
                        Buka Palang
                      </span>
                      <span className="text-park-border">•</span>
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border border-park-border bg-park-primary px-1.5 py-0.5 font-mono text-[11px] text-white">Esc</kbd>
                        Batalkan
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Panduan PDF sedang diunduh...', 'info')}
                  className="flex items-center gap-1.5 rounded-lg border border-park-border bg-park-primary px-3.5 py-2 text-xs font-semibold text-park-cyan transition-all hover:border-park-cyan hover:bg-park-cyan/10"
                >
                  <Download className="size-4" />
                  <span>Unduh PDF Panduan</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB B: SOP */}
          {activeTab === 'sop' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SOP_ITEMS.map((sop) => (
                <div key={sop.title} className="flex flex-col gap-3 rounded-xl border border-park-border/50 bg-park-secondary/70 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-park-border bg-park-primary p-2 text-park-warning">
                      <sop.icon className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{sop.title}</h4>
                      <span className="text-xs text-park-muted">{sop.subtitle}</span>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-2 text-xs leading-relaxed text-park-muted">
                    {sop.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={cn('font-bold', sop.stepColor)}>{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* TAB C: Maintenance */}
          {activeTab === 'maint' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-park-border/40 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Jadwal Pemeliharaan Preventif Alat Loket</h3>
                  <span className="text-xs text-park-muted">Lokasi: Booth Barat #01 — Barrier Gate & Terminal POS</span>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Form servis baru dibuka.', 'info')}
                  className="flex items-center gap-1.5 rounded-lg bg-park-cta px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-500"
                >
                  <Save className="size-4" />
                  <span>Catat Servis Baru</span>
                </button>
              </div>
              <div className="space-y-3">
                {MAINT_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between rounded-xl border border-park-border/40 bg-park-secondary/70 p-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-9 items-center justify-center rounded-lg border border-park-border bg-park-primary">
                        <item.icon className={cn('size-5', item.iconColor)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold', item.statusColor)}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-park-muted">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-park-muted">
                      <span className="block font-medium text-white">{item.schedule}</span>
                      <span>{item.assignee}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB D: Diagnostics */}
          {activeTab === 'diagnostic' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {DIAG_SERVICES.map((svc) => (
                  <div
                    key={svc.name}
                    className="flex flex-col justify-between rounded-xl border border-park-border/50 bg-park-secondary/70 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('size-2 animate-pulse rounded-full', svc.dotColor)} />
                        <span className="text-xs font-semibold text-white">{svc.name}</span>
                      </div>
                      <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold', svc.statusColor)}>
                        {svc.status}
                      </span>
                    </div>
                    <div className="my-3">
                      <span className="text-3xl font-bold text-white">
                        {pingValues[svc.name === 'Lokal Site Server' ? 'local' : svc.name === 'Central Cloud' ? 'cloud' : 'qris']}
                        <span className="ml-1 text-sm font-normal text-park-muted">ms</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-park-muted">{svc.address}</span>
                    </div>
                    <span className="text-[11px] text-park-muted">{svc.description}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-park-border/50 bg-park-secondary p-4 md:grid-cols-4">
                <div>
                  <span className="block text-xs text-park-muted">Kecepatan Download</span>
                  <span className="mt-0.5 block text-lg font-bold text-white">48.2 Mbps</span>
                </div>
                <div>
                  <span className="block text-xs text-park-muted">Kecepatan Upload</span>
                  <span className="mt-0.5 block text-lg font-bold text-white">22.5 Mbps</span>
                </div>
                <div>
                  <span className="block text-xs text-park-muted">Jitter Koneksi</span>
                  <span className="mt-0.5 block text-lg font-bold text-white">1.2 ms</span>
                </div>
                <div>
                  <span className="block text-xs text-park-muted">Packet Loss</span>
                  <span className="mt-0.5 block text-lg font-bold text-park-success">0.0 %</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-park-border/50 bg-park-secondary/70 p-4 sm:flex-row">
                <div className="flex items-center gap-3">
                  {isRunningDiag && (
                    <div className="size-5 animate-spin rounded-full border-2 border-park-cta border-t-transparent" />
                  )}
                  <span className="text-xs text-park-muted">
                    Status: Semua port dan socket POS siap transaksi (Pemeriksaan otomatis tiap 10 menit).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={runDiagnostics}
                  disabled={isRunningDiag}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-park-cta px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-500 disabled:opacity-70 sm:w-auto"
                >
                  <Activity className="size-4" />
                  <span>{isRunningDiag ? 'Menjalankan...' : 'Jalankan Tes Diagnostik Sekarang'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
