import type React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ParkingSession } from '@shared/types'
import {
  ArrowLeftRight,
  Badge as BadgeIcon,
  Banknote,
  Barcode,
  CarFront,
  CircleCheck,
  DoorOpen,
  Keyboard,
  Lock,
  LockOpen,
  MapPin,
  Nfc,
  Printer,
  QrCode,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  SquareParking,
  SquarePen,
  Video
} from 'lucide-react'
import { searchSessions, payCash, createQrIntent, cancelQrIntent, openGate } from '../lib/server-api'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { useShift } from '../context/ShiftContext'
import { useToast } from '../hooks/useToast'
import { useFKeyBindings } from '../hooks/useFKeyBindings'
import { QrPaymentPanel } from '../components/loket/QrPaymentPanel'
import { HelpModal } from '../components/loket/HelpModal'
import { ShiftModal } from '../components/loket/ShiftModal'
import { SupervisorOverrideModal } from '../components/loket/SupervisorOverrideModal'
import { formatCurrency, formatDateTime, formatDuration } from '../lib/format'
import { newKey } from '../lib/ids'
import { cn } from '@renderer/lib/utils'

type InputMode = 'manual' | 'scan'
type PaymentTab = 'cash' | 'qr' | 'emoney'

const VEHICLE_CLASSES = [
  'Gol. 1 - Mobil Minibus/Sedan',
  'Gol. 2 - Motor / Roda Dua',
  'Gol. 3 - Truk / Bus Besar'
]

const TAB_ACTIVE =
  'bg-[#264f78] font-bold text-white shadow-sm'
const TAB_INACTIVE =
  'font-medium text-[#9ca3af] hover:bg-[#252528] hover:text-white'

function DockKey({
  kbd,
  label,
  title,
  onClick,
  active,
  tone = 'default'
}: {
  kbd: string
  label: string
  title: string
  onClick: () => void
  active?: boolean
  tone?: 'default' | 'success' | 'warning'
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 shadow-sm transition-all active:scale-95',
        tone === 'default' &&
          (active
            ? 'border-[#569cd6]/40 bg-[#264f78] text-white'
            : 'border-[#333338] bg-[#0a0a0a] hover:bg-[#252528] hover:text-white'),
        tone === 'success' &&
          'border-[#22c55e]/50 bg-[#22c55e]/20 font-semibold text-[#22c55e] hover:bg-[#22c55e] hover:text-[#0a0a0a]',
        tone === 'warning' &&
          'border-[#f59e0b]/50 bg-[#f59e0b]/20 font-semibold text-[#f59e0b] hover:bg-[#f59e0b] hover:text-[#0a0a0a]'
      )}
    >
      <kbd
        className={cn(
          'rounded border px-1.5 py-0.5 text-[11px] font-bold',
          tone === 'default' &&
            (active
              ? 'border-[#333338] bg-[#0a0a0a] text-[#38bdf8]'
              : 'border-[#333338] bg-[#252528] text-white'),
          tone === 'success' && 'border-transparent bg-[#22c55e] text-black',
          tone === 'warning' && 'border-transparent bg-[#f59e0b] text-black'
        )}
      >
        {kbd}
      </kbd>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}

export function LoketScreen(): React.JSX.Element {
  const { session, logout } = useAuth()
  const { config } = useConfig()
  const { shift, summary, closeShift: closeShiftRecord } = useShift()
  const toast = useToast()
  const navigate = useNavigate()

  const [inputMode, setInputMode] = useState<InputMode>('scan')
  const [searchQuery, setSearchQuery] = useState('')
  const [manualPlate, setManualPlate] = useState('')
  const [vehicleClass, setVehicleClass] = useState(VEHICLE_CLASSES[0])
  
  //dummy data for testing
  const [activeSession, setActiveSession] = useState<ParkingSession | null>({
  id: 'dummy-1',
  ticketNumber: 'TKT-20250520-00892',
  plateNumber: 'B 1842 WKA',
  vehicleType: 'Mobil Minibus / Sedan',
  entryTime: '2025-05-20T08:15:20Z',
  durationMinutes: 240, // 4 Jam
  amount: 15000,
  sessionStatus: 'ACTIVE',
  paymentStatus: 'UNPAID',
  laneIn: 'Gate Barat 01',
  gateId: 'gate-02',
  operatorId: 'budi-123'
} as ParkingSession)
//end of dummy data

  const [paymentTab, setPaymentTab] = useState<PaymentTab>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [qrIntentId, setQrIntentId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showShift, setShowShift] = useState(false)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const canPay = activeSession && activeSession.paymentStatus === 'UNPAID'
  const canOpenGate = activeSession?.paymentStatus === 'PAID'

  const handleSearch = async (): Promise<void> => {
    const query = inputMode === 'manual' ? manualPlate : searchQuery
    if (!query.trim()) return
    setBusy(true)
    const result = await searchSessions({
      mode: inputMode,
      ticketNumber: inputMode === 'manual' ? query : undefined,
      plateNumber: inputMode === 'manual' ? query : undefined,
      payload: inputMode === 'scan' ? query : undefined
    })
    setBusy(false)
    if (result.ok && result.data.length > 0) {
      setActiveSession(result.data[0])
      setQrIntentId(null)
    } else {
      toast('Tagihan tidak ditemukan.', 'error')
    }
  }

  const handlePayCash = async (): Promise<void> => {
    if (!activeSession || !session) return
    const amount = parseInt(cashReceived, 10)
    if (isNaN(amount) || amount < activeSession.amount) {
      toast('Jumlah uang diterima kurang dari total tagihan.', 'error')
      return
    }
    setBusy(true)
    const result = await payCash(activeSession.id, amount, newKey('pay'), session.operator)
    setBusy(false)
    if (result.ok) {
      setActiveSession({ ...activeSession, paymentStatus: 'PAID' })
      toast('Pembayaran tunai berhasil.', 'success')
    } else {
      toast(result.error.message, 'error')
    }
  }

  const handleCreateQr = async (): Promise<void> => {
    if (!activeSession || !session) return
    setBusy(true)
    const result = await createQrIntent(activeSession.id, session.operator)
    setBusy(false)
    if (result.ok) {
      setQrIntentId(result.data.id)
      setPaymentTab('qr')
      toast('QR pembayaran dibuat.', 'success')
    } else {
      toast(result.error.message, 'error')
    }
  }

  const handleCancelQr = async (): Promise<void> => {
    if (!qrIntentId || !session) return
    setBusy(true)
    const result = await cancelQrIntent(qrIntentId, 'Pelanggan memilih metode lain', session.operator)
    setBusy(false)
    if (result.ok) {
      setQrIntentId(null)
      setPaymentTab('cash')
      toast('QR dibatalkan.', 'info')
    } else {
      toast(result.error.message, 'error')
    }
  }

  const handleOpenGate = async (): Promise<void> => {
    if (!activeSession) return
    if (!canOpenGate) {
      toast('Palang Terkunci! Selesaikan pembayaran atau gunakan Override SPV [F11].', 'error')
      return
    }
    setBusy(true)
    const result = await openGate(activeSession.id, newKey('gate'))
    setBusy(false)
    if (result.ok) {
      toast(result.data.status === 'SUCCESS' ? 'Palang terbuka.' : result.data.message, result.data.status === 'SUCCESS' ? 'success' : 'error')
    } else {
      toast(result.error.message, 'error')
    }
  }

  const handleOverride = async (_pin: string, _reason: string): Promise<void> => {
    if (!activeSession) return
    setOverrideError(null)
    setBusy(true)
    const result = await openGate(activeSession.id, newKey('override'))
    setBusy(false)
    if (result.ok) {
      setShowOverride(false)
      toast('Override berhasil. Palang dibuka.', 'success')
    } else {
      setOverrideError(result.error.message)
    }
  }

  const handleReset = (): void => {
    setActiveSession(null)
    setSearchQuery('')
    setManualPlate('')
    setCashReceived('')
    setQrIntentId(null)
    setPaymentTab('cash')
  }

  const handlePrint = (): void => {
    toast('Struk dikirim ke printer thermal.', 'success')
  }

  const handleShift = (): void => {
    setShowShift(true)
  }

  const handleHandoverShift = (nextNip: string): void => {
    setShowShift(false)
    toast(`Serah terima sukses! Sesi dialihkan ke ${nextNip}. Mencetak bukti serah terima...`, 'success')
  }

  const handleEndShift = async (): Promise<void> => {
    setShowShift(false)
    setBusy(true)
    const closed = await closeShiftRecord()
    setBusy(false)
    if (closed.ok) {
      toast('Z-Report tercetak. Shift ditutup, booth offline. Kembali ke login.', 'success')
    } else {
      toast(`Shift: ${closed.error ?? 'gagal ditutup.'} Tetap keluar ke login.`, 'error')
    }
    await logout()
    navigate('/login', { replace: true })
  }

  useFKeyBindings({
    f1: () => setShowHelp(true),
    f2: () => setShowShift(true),
    f3: () => setInputMode('scan'),
    f4: () => {
      if (activeSession) setManualPlate(activeSession.plateNumber)
      setInputMode('manual')
    },
    f5: () => setPaymentTab('cash'),
    f6: () => setPaymentTab('qr'),
    f7: () => setPaymentTab('emoney'),
    f9: () => void handleOpenGate(),
    f10: handlePrint,
    f11: () => setShowOverride(true),
    enter: () => {
      if (
        paymentTab === 'cash' &&
        canPay &&
        !busy &&
        document.getElementById('cash-input') === document.activeElement
      ) {
        void handlePayCash()
      }
    },
    escape: () => {
      if (showHelp || showShift || showOverride) {
        setShowHelp(false)
        setShowShift(false)
        setShowOverride(false)
      } else {
        handleReset()
      }
    }
  })

  const pad = (n: number): string => String(n).padStart(2, '0')
  const clockText = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const dateText = now
    .toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()

  const cashNum = parseInt(cashReceived, 10)
  const change = (isNaN(cashNum) ? 0 : cashNum) - (activeSession?.amount ?? 0)
  const changeText =
    cashReceived.trim() === ''
      ? 'Rp 0'
      : change >= 0
        ? formatCurrency(change)
        : `- Rp ${Math.abs(change).toLocaleString('id-ID')}`

  return (
    <div className="flex min-h-screen flex-col bg-[#1e1e1e] font-sans text-[#d4d4d4] antialiased lg:h-screen lg:overflow-hidden">
      {/* Top System Title Bar */}
      <div className="flex h-8 flex-none items-center justify-between border-b border-[#27272a] bg-[#0a0a0a] px-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="flex size-2.5 items-center justify-center rounded-sm bg-[#f97316] text-[9px] font-bold text-black">
            P
          </span>
          <span className="font-semibold tracking-wide text-white">PARK-POS v2.4.1</span>
          <span className="text-[#333338]">/</span>
          <span className="hidden text-[#9ca3af] sm:inline">Electron Desktop Workstation</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#9ca3af]">
            <span className="size-2 animate-pulse rounded-full bg-[#22c55e]" />
            Site Server: <span className="font-semibold text-[#22c55e]">Online 10ms</span>
          </span>
          <span className="hidden items-center gap-1.5 text-[#9ca3af] md:flex">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            Central: <span className="font-semibold text-[#22c55e]">Sync OK</span>
          </span>
          <span className="hidden text-[#333338] md:inline">|</span>
          <span className="text-[#38bdf8]">Gate: {config?.gateName ?? 'Exit Barat 01'}</span>
        </div>
      </div>

      {/* Main Navigation & Peripheral Bar */}
      <header className="flex h-14 flex-none items-center justify-between border-b border-[#333338] bg-[#1e1e1e] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 items-center gap-1 rounded bg-[#f97316] px-2.5 font-headline text-sm font-bold text-black shadow-sm">
            <SquareParking className="size-5" strokeWidth={2.5} aria-hidden />
            PARK-OS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wide text-white">LOKET EXIT 01</span>
              <span className="rounded bg-[#264f78] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#38bdf8]">LANE 03 MOBIL</span>
            </div>
            <span className="flex items-center gap-1 font-mono text-xs text-[#9ca3af]">
              <MapPin className="size-3.5 text-[#38bdf8]" aria-hidden /> {config?.gateName ?? 'Gate Barat'} • Exit Kendaraan Roda 4
            </span>
          </div>
        </div>
        <div className="hidden items-center gap-2 font-mono text-xs xl:flex">
          <div className="flex items-center gap-2 rounded border border-[#333338] bg-[#1f1f23] px-2.5 py-1">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            <span className="text-[#9ca3af]">SCANNER:</span>
            <span className="font-semibold text-[#22c55e]">OK (USB HID)</span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            title="Klik untuk Test Printer"
            className="flex cursor-pointer items-center gap-2 rounded border border-[#333338] bg-[#1f1f23] px-2.5 py-1 transition-colors hover:border-[#38bdf8] active:scale-95"
          >
            <span className="size-2 rounded-full bg-[#22c55e]" />
            <span className="text-[#9ca3af]">PRINTER:</span>
            <span className="font-semibold text-[#22c55e]">READY (TM-T82)</span>
          </button>
          <button
            type="button"
            onClick={() => void handleOpenGate()}
            title="Klik untuk Kontrol Palang"
            className="flex cursor-pointer items-center gap-2 rounded border border-[#333338] bg-[#1f1f23] px-2.5 py-1 transition-colors hover:border-[#38bdf8] active:scale-95"
          >
            <span className="size-2 rounded-full bg-[#22c55e]" />
            <span className="text-[#9ca3af]">BARRIER:</span>
            <span className="font-semibold text-[#38bdf8]">ONLINE (COM3)</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleShift}
            title="Klik untuk Ganti Shift [F2]"
            className="group -m-1 flex cursor-pointer items-center gap-2.5 rounded p-1 transition-colors hover:bg-[#252528]"
          >
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-white transition-colors group-hover:text-[#38bdf8]">
                <BadgeIcon className="size-4 text-[#569cd6]" aria-hidden />
                {session?.operator.name ?? '-'}
              </div>
              <div className="font-mono text-[11px] text-[#38bdf8]">
                {shift ? `Shift Pagi • ${new Date(shift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - 14:00` : 'Shift Pagi • 06:00 - 14:00'}
              </div>
            </div>
            <ArrowLeftRight className="size-4 text-[#9ca3af] transition-colors group-hover:text-white" aria-hidden />
          </button>
          <div className="hidden h-8 w-px bg-[#333338] sm:block" />
          <div className="hidden text-right font-mono sm:block">
            <div className="text-sm font-bold tabular-nums text-white">
              {clockText} <span className="text-xs text-[#38bdf8]">WIB</span>
            </div>
            <div className="text-[11px] text-[#9ca3af]">{dateText}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1720px] flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:p-4 lg:grid-cols-12 lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-7">
          <div className="flex flex-none flex-col gap-2.5 rounded-lg border border-[#333338] bg-[#252528] p-2.5 shadow-sm sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-[#27272a] bg-[#0a0a0a] p-1">
                <button
                  type="button"
                  onClick={() => setInputMode('scan')}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs transition-all active:scale-95',
                    inputMode === 'scan' ? TAB_ACTIVE : TAB_INACTIVE
                  )}
                >
                  <QrCode className="size-4" aria-hidden />
                  Scan Tiket [F3]
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs transition-all active:scale-95',
                    inputMode === 'manual' ? TAB_ACTIVE : TAB_INACTIVE
                  )}
                >
                  <Keyboard className="size-4" aria-hidden />
                  Input Manual [F4]
                </button>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#9ca3af]">
                {inputMode === 'scan' ? (
                  <>
                    <span className="size-2 animate-pulse rounded-full bg-[#22c55e]" />
                    BARCODE SCANNER PAYLOAD READY
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-[#569cd6]" />
                    KEYBOARD MANUAL ENTRY MODE
                  </>
                )}
              </div>
            </div>
            {inputMode === 'scan' ? (
              <div className="relative flex items-center">
                <Barcode className="absolute left-3 size-5 text-[#38bdf8]" aria-hidden />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                  placeholder="Tembak barcode scanner atau input nomor tiket..."
                  autoFocus
                  className="w-full rounded border border-[#333338] bg-[#0a0a0a] py-2 pl-10 pr-24 font-mono text-sm text-white transition-colors focus:border-[#38bdf8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleSearch()}
                  disabled={busy || !searchQuery.trim()}
                  className="absolute right-2 cursor-pointer rounded border border-[#333338] bg-[#1f1f23] px-2 py-0.5 font-mono text-[10px] font-bold text-[#38bdf8] transition-all hover:bg-[#264f78]/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cari
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 pt-1 font-mono sm:grid-cols-2">
                <div>
                  <label htmlFor="manual-plate" className="mb-1 block text-[11px] uppercase text-[#9ca3af]">
                    Nomor Plat Polisi [Manual]
                  </label>
                  <input
                    id="manual-plate"
                    value={manualPlate}
                    onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                    placeholder="B 1842 WKA"
                    autoFocus
                    className="w-full rounded border border-[#333338] bg-[#0a0a0a] px-3 py-1.5 font-mono text-sm font-bold uppercase tracking-wider text-white focus:border-[#38bdf8] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="vehicle-class" className="mb-1 block text-[11px] uppercase text-[#9ca3af]">
                    Klasifikasi Golongan
                  </label>
                  <select
                    id="vehicle-class"
                    value={vehicleClass}
                    onChange={(e) => setVehicleClass(e.target.value)}
                    className="w-full cursor-pointer rounded border border-[#333338] bg-[#0a0a0a] px-2 py-2 font-mono text-xs text-white focus:outline-none"
                  >
                    {VEHICLE_CLASSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {activeSession && (
            <>
              <div className="flex flex-none flex-col gap-2.5 rounded-lg border border-[#333338] bg-[#252528] p-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#333338] pb-2">
                  <div className="flex items-center gap-2">
                    <Video className="size-[18px] text-[#38bdf8]" aria-hidden />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">Snapshot Kamera Masuk &amp; OCR ANPR</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-[#9ca3af]">CAM-IN-01</span>
                    <span className="rounded bg-[#22c55e]/20 px-1.5 py-0.5 font-bold text-[#22c55e]">CONFIDENCE: 99.4%</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="relative col-span-5 flex h-28 items-center justify-center overflow-hidden rounded-md border border-[#333338] bg-[#0a0a0a] sm:col-span-4">
                    <div className="text-center">
                      <div className="mx-auto mb-1 inline-block rounded border border-neutral-600 bg-black/90 px-3 py-1 font-mono text-base font-black tracking-widest text-amber-300">
                        {activeSession.plateNumber}
                      </div>
                      <p className="font-mono text-[10px] text-[#22c55e]">PLATE RECOGNITION VALIDATED</p>
                    </div>
                    <div className="absolute bottom-1 left-1 rounded bg-[#0a0a0a]/80 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur">
                      CAM-IN-BARAT
                    </div>
                  </div>
                  <div className="col-span-7 flex h-full flex-col justify-between gap-2 sm:col-span-8">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="block font-mono text-[10px] uppercase text-[#9ca3af]">Plat Terdeteksi ANPR</span>
                        <span className="inline-block rounded border border-[#333338] bg-[#0a0a0a] px-3 py-0.5 font-mono text-xl font-extrabold tracking-widest text-white sm:text-2xl">
                          {activeSession.plateNumber}
                        </span>
                      </div>
                      <span className="rounded border border-[#333338] bg-[#1f1f23] px-2 py-1 font-mono text-xs font-medium text-[#38bdf8]">
                        {activeSession.vehicleType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 font-mono text-xs text-[#9ca3af]">
                      <span>Lane Masuk: <strong className="text-[#d4d4d4]">{activeSession.laneIn}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setManualPlate(activeSession.plateNumber)
                          setInputMode('manual')
                        }}
                        className="flex cursor-pointer items-center gap-1 text-[11px] text-[#569cd6] underline transition-all hover:text-[#38bdf8] active:scale-95"
                      >
                        <SquarePen className="size-3.5" aria-hidden /> Koreksi Plat Manual [F4]
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 rounded-lg border border-[#333338] bg-[#252528] p-3 shadow-sm">
                <div>
                  <div className="mb-2.5 flex items-center justify-between border-b border-[#333338] pb-2">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="size-[18px] text-[#569cd6]" aria-hidden />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">Rincian Sesi Parkir &amp; Tarif</span>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-[#22c55e]">
                      <span className="size-1.5 rounded-full bg-[#22c55e]" /> SESI VALID (SITE SERVER)
                    </span>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
                    <div className="rounded border border-[#27272a] bg-[#1f1f23] p-2">
                      <span className="block text-[10px] text-[#9ca3af]">NOMOR TIKET</span>
                      <span className="block truncate font-bold text-white">{activeSession.ticketNumber}</span>
                    </div>
                    <div className="rounded border border-[#27272a] bg-[#1f1f23] p-2">
                      <span className="block text-[10px] text-[#9ca3af]">WAKTU MASUK</span>
                      <span className="block text-[#d4d4d4]">{formatDateTime(activeSession.entryTime)}</span>
                    </div>
                    <div className="rounded border border-[#27272a] bg-[#1f1f23] p-2">
                      <span className="block text-[10px] text-[#9ca3af]">WAKTU KELUAR</span>
                      <span className="block text-[#d4d4d4]">{formatDateTime(new Date().toISOString())}</span>
                    </div>
                    <div className="rounded border border-[#264f78] bg-[#264f78]/40 p-2">
                      <span className="block text-[10px] font-semibold text-[#38bdf8]">TOTAL DURASI</span>
                      <span className="block font-bold text-white">{formatDuration(activeSession.durationMinutes)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div className="flex flex-col rounded border border-[#27272a] bg-[#0a0a0a] px-3 py-2">
                      <span className="text-[11px] text-[#9ca3af]">Jam Pertama</span>
                      <span className="mt-0.5 text-sm font-bold text-white">{formatCurrency(Math.round(activeSession.amount * 0.4))}</span>
                    </div>
                    <div className="flex flex-col rounded border border-[#27272a] bg-[#0a0a0a] px-3 py-2">
                      <span className="text-[11px] text-[#9ca3af]">Jam Tambahan</span>
                      <span className="mt-0.5 text-sm font-bold text-white">{formatCurrency(Math.round(activeSession.amount * 0.5))}</span>
                    </div>
                    <div className="flex flex-col rounded border border-[#27272a] bg-[#0a0a0a] px-3 py-2">
                      <span className="text-[11px] text-[#9ca3af]">Asuransi / Jasa</span>
                      <span className="mt-0.5 text-sm font-bold text-white">{formatCurrency(Math.round(activeSession.amount * 0.1))}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border-2 border-[#264f78] bg-[#0a0a0a] p-3 shadow-md sm:p-4">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#38bdf8]">TOTAL TAGIHAN PARKIR</span>
                    <span className="mt-0.5 font-mono text-[11px] text-[#9ca3af]">Termasuk PPN Parkir 10% • Terverifikasi Otomatis</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                      {formatCurrency(activeSession.amount)}
                    </div>
                    <div className="font-mono text-[11px] font-semibold tracking-wide text-[#f59e0b]">
                      {activeSession.amount.toLocaleString('id-ID')} RUPIAH NET
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!activeSession && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-[#333338] bg-[#252528] p-8 text-center shadow-sm">
              <CarFront className="size-10 text-[#9ca3af]" aria-hidden />
              <p className="mt-2 font-mono text-xs text-[#9ca3af]">
                Scan tiket atau input plat nomor untuk memulai transaksi
              </p>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-3 lg:col-span-5">
          {activeSession && (
            <>
              <div className="flex flex-none flex-col gap-1.5 rounded-lg border border-[#333338] bg-[#252528] p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-3 rounded-full', activeSession.paymentStatus === 'PAID' ? 'bg-[#22c55e]' : 'animate-ping bg-[#f59e0b]')} />
                    <div>
                      <span className="block font-mono text-[10px] uppercase text-[#9ca3af]">Status Transaksi Gate</span>
                      <span className={cn('font-mono text-xs font-bold tracking-wide', activeSession.paymentStatus === 'PAID' ? 'text-[#22c55e]' : 'text-[#f59e0b]')}>
                        STATUS: {activeSession.paymentStatus === 'PAID' ? 'LUNAS (PAID)' : 'MENUNGGU PEMBAYARAN (UNPAID)'}
                      </span>
                    </div>
                  </div>
                  <span className="rounded border border-[#333338] bg-[#0a0a0a] px-2 py-0.5 font-mono text-[10px] font-bold text-[#38bdf8]">
                    GATE 02 EXIT
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#27272a] pt-1 font-mono text-[10px] text-[#9ca3af]">
                  <span>TXN: <strong className="font-semibold text-[#d4d4d4]">TXN-88219-SITE01</strong></span>
                  <span>IDEMPOTENCY: <strong className="font-semibold text-[#d4d4d4]">IDEM-9921-X7</strong></span>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-[#333338] bg-[#252528] p-3 shadow-sm">
                <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                  {(['cash', 'qr', 'emoney'] as PaymentTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPaymentTab(tab)}
                      disabled={!canPay && tab !== 'cash'}
                      className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded border px-1 py-2 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
                        paymentTab === tab
                          ? 'border-[#569cd6]/50 bg-[#264f78] font-bold text-white shadow-sm'
                          : 'border-[#333338] bg-[#1f1f23] font-medium text-[#9ca3af] hover:bg-[#252528] hover:text-white'
                      )}
                    >
                      {tab === 'cash' ? (
                        <Banknote className="size-[18px]" aria-hidden />
                      ) : tab === 'qr' ? (
                        <QrCode className="size-[18px]" aria-hidden />
                      ) : (
                        <Nfc className="size-[18px]" aria-hidden />
                      )}
                      {tab === 'cash' ? 'Tunai / Cash [F5]' : tab === 'qr' ? 'QRIS Dinamis [F6]' : 'E-Money Tap [F7]'}
                    </button>
                  ))}
                </div>

                {paymentTab === 'cash' && canPay && (
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label htmlFor="cash-input" className="font-mono text-xs font-bold uppercase text-white">Uang Tunai Diterima (Rp)</label>
                          <span className="font-mono text-[11px] text-[#569cd6]">Numpad / Enter</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 font-mono text-lg font-bold text-[#9ca3af]">Rp</span>
                          <input
                            id="cash-input"
                            type="number"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="0"
                            className="w-full rounded border border-[#333338] bg-[#0a0a0a] py-2 pl-12 pr-3 font-mono text-2xl font-bold text-white focus:border-[#38bdf8] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="mb-1 block font-mono text-[11px] text-[#9ca3af]">Pilihan Cepat Nominal:</span>
                        <div className="grid grid-cols-4 gap-1.5 font-mono text-xs font-bold">
                          {[activeSession.amount, 20000, 50000, 100000].map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setCashReceived(String(amount))}
                              className={cn(
                                'cursor-pointer rounded border py-1.5 transition-colors active:scale-95',
                                parseInt(cashReceived, 10) === amount
                                  ? 'border-[#38bdf8] bg-[#264f78] text-white'
                                  : 'border-[#333338] bg-[#0a0a0a] text-[#38bdf8] hover:bg-[#264f78]'
                              )}
                            >
                              {amount === activeSession.amount
                                ? `Uang Pas (${Math.round(amount / 1000)}k)`
                                : amount.toLocaleString('id-ID')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded border border-[#333338] bg-[#0a0a0a] p-3">
                        <div>
                          <span className="block font-mono text-xs font-bold uppercase tracking-wider text-[#9ca3af]">KEMBALIAN OPERATOR:</span>
                          <span className="font-mono text-[11px] text-[#9ca3af]">Siapkan pecahan tunai</span>
                        </div>
                        <div className={cn(
                          'font-mono text-2xl font-extrabold tracking-tight',
                          cashReceived.trim() === '' || change < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'
                        )}>
                          {changeText}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handlePayCash()}
                      disabled={busy || !cashReceived || parseInt(cashReceived, 10) < activeSession.amount}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-[#f97316] py-3 font-mono text-sm font-bold tracking-wider text-white shadow-lg transition-all hover:bg-[#ea580c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CircleCheck className="size-5" aria-hidden />
                      TERIMA PEMBAYARAN CASH [ENTER]
                    </button>
                  </div>
                )}

                {paymentTab === 'qr' && canPay && !qrIntentId && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2.5">
                    <div className="flex h-36 w-36 items-center justify-center rounded bg-white p-2 shadow-inner">
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#f97316]/20 font-mono text-xs font-bold text-[#f97316]">
                        <QrCode className="size-8" aria-hidden />
                        QRIS
                      </div>
                    </div>
                    <span className="text-center font-mono text-xs text-[#38bdf8]">Menunggu Scan Nasabah: {formatCurrency(activeSession.amount)}</span>
                    <button
                      type="button"
                      onClick={() => void handleCreateQr()}
                      disabled={busy}
                      className="w-full cursor-pointer rounded bg-[#264f78] py-2.5 font-mono text-xs font-bold text-white transition-all hover:bg-[#264f78]/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Tampilkan QRIS [F6]
                    </button>
                  </div>
                )}

                {paymentTab === 'qr' && qrIntentId && (
                  <QrPaymentPanel
                    intentId={qrIntentId}
                    canCancel={!!canPay}
                    cancelling={busy}
                    onStatusChange={(intent) => {
                      if (intent.status === 'PAID') {
                        setActiveSession({ ...activeSession, paymentStatus: 'PAID' })
                        toast('Pembayaran QR berhasil.', 'success')
                      }
                    }}
                    onCancel={() => void handleCancelQr()}
                  />
                )}

                {paymentTab === 'emoney' && (
                  <div className="flex flex-1 flex-col items-center justify-between gap-2.5 font-mono">
                    <div className="flex w-full items-center justify-between border-b border-[#333338] pb-1.5 text-xs">
                      <span className="text-[#9ca3af]">SAM NFC READER INTERFACE (COM4)</span>
                      <span className="flex items-center gap-1 font-bold text-[#22c55e]">
                        <span className="size-2 animate-pulse rounded-full bg-[#22c55e]" /> POLLING READY
                      </span>
                    </div>
                    <div className="my-auto flex flex-col items-center gap-2 text-center">
                      <Nfc className="size-12 animate-bounce text-[#38bdf8]" aria-hidden />
                      <span className="text-sm font-bold text-white">TEMPELKAN KARTU E-MONEY / FLAZZ</span>
                      <span className="text-xs text-[#9ca3af]">Mandiri e-Money • BCA Flazz • BNI TapCash • BRI Brizzi</span>
                      <span className="rounded border border-[#333338] bg-[#0a0a0a] px-2.5 py-1 text-[11px] text-[#569cd6]">Saldo terpotong otomatis {formatCurrency(activeSession.amount)}</span>
                    </div>
                    <div className="flex w-full flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => toast('Simulasi tap e-money berhasil.', 'success')}
                        className="w-full cursor-pointer rounded bg-[#264f78] py-2.5 text-xs font-bold text-white transition-all hover:bg-[#264f78]/80 active:scale-95"
                      >
                        [DEV] Simulasi Tap Kartu Berhasil
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentTab('cash')}
                        className="w-full cursor-pointer rounded border border-[#333338] bg-[#0a0a0a] py-1.5 text-xs text-[#9ca3af] hover:text-white"
                      >
                        Ganti Metode [F5]
                      </button>
                    </div>
                  </div>
                )}

                {activeSession.paymentStatus === 'PAID' && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2.5">
                    <CircleCheck className="size-10 text-[#22c55e]" aria-hidden />
                    <span className="font-mono text-lg font-bold text-[#22c55e]">LUNAS</span>
                    <span className="font-mono text-xs text-[#9ca3af]">Pembayaran berhasil. Tekan [F9] untuk buka palang.</span>
                  </div>
                )}
              </div>

              <div className="flex flex-none flex-col gap-2 rounded-lg border border-[#333338] bg-[#252528] p-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#333338] pb-1 font-mono text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <DoorOpen className="size-4 text-[#f59e0b]" aria-hidden /> Kontrol Palang &amp; Terminal
                  </span>
                  <span className="text-[#9ca3af]">IO RELAY: PORT 4 (COM3)</span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOpenGate()}
                  disabled={!canOpenGate || busy}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-center gap-2 rounded border py-3 font-mono text-xs font-bold transition-all active:scale-95 sm:text-sm',
                    canOpenGate
                      ? 'border-[#22c55e] bg-[#22c55e] text-[#0a0a0a] shadow-lg hover:bg-[#22c55e]/90'
                      : 'border-[#333338] bg-[#1f1f23] text-[#9ca3af] hover:bg-[#0a0a0a]'
                  )}
                >
                  {canOpenGate ? (
                    <LockOpen className="size-[18px]" aria-hidden />
                  ) : (
                    <Lock className="size-[18px]" aria-hidden />
                  )}
                  {canOpenGate ? 'BUKA PALANG PINTU [F9] (IZIN TERBIT: SIAP BUKA)' : 'BUKA PALANG PINTU [F9] (Terkunci: Menunggu Pembayaran Lunas)'}
                </button>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-[#333338] bg-[#0a0a0a] px-2 py-2 text-[#d4d4d4] transition-colors hover:bg-[#1f1f23] hover:text-white active:scale-95"
                  >
                    <Printer className="size-4 text-[#38bdf8]" aria-hidden />
                    Cetak Struk [F10]
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-[#333338] bg-[#0a0a0a] px-2 py-2 text-[#ef4444] transition-colors hover:border-[#ef4444]/50 hover:bg-[#ef4444]/20 active:scale-95"
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Batal / Reset [ESC]
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOverride(true)}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-[#333338] bg-[#0a0a0a] py-1.5 font-mono text-xs font-medium text-[#f59e0b] transition-colors hover:border-[#f59e0b]/40 hover:bg-[#f59e0b]/20 active:scale-95"
                >
                  <ShieldCheck className="size-4" aria-hidden />
                  Override Supervisor [F11] • Otorisasi Darurat
                </button>
              </div>
            </>
          )}

          {!activeSession && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-[#333338] bg-[#252528] p-8 text-center shadow-sm">
              <CarFront className="size-10 text-[#9ca3af]" aria-hidden />
              <p className="mt-2 font-mono text-xs text-[#9ca3af]">
                Cari tagihan untuk memulai transaksi
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="flex flex-none flex-wrap items-center justify-between gap-2 border-t border-[#333338] bg-[#111111] px-3 py-2 font-mono text-xs text-[#9ca3af] sm:px-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <DockKey kbd="F1" label="Bantuan" title="Pusat Bantuan & SOP Loket [F1]" onClick={() => setShowHelp(true)} />
          <DockKey kbd="F2" label="Ganti Shift" title="Ganti Shift & Tutup Sesi [F2]" onClick={handleShift} />
          <DockKey kbd="F3" label="Scan Tiket" title="Scan Tiket Barcode [F3]" onClick={() => setInputMode('scan')} active={inputMode === 'scan'} />
          <DockKey kbd="F4" label="Input Manual" title="Input Manual Plat Nomor [F4]" onClick={() => setInputMode('manual')} active={inputMode === 'manual'} />
          <DockKey kbd="F5" label="Tunai" title="Pembayaran Tunai / Cash [F5]" onClick={() => setPaymentTab('cash')} active={paymentTab === 'cash'} />
          <DockKey kbd="F6" label="QRIS" title="QRIS Dinamis [F6]" onClick={() => setPaymentTab('qr')} active={paymentTab === 'qr'} />
          <DockKey kbd="F7" label="E-Money" title="Kartu E-Money / Flazz [F7]" onClick={() => setPaymentTab('emoney')} active={paymentTab === 'emoney'} />
          <DockKey kbd="F9" label="Buka Palang" title="Buka Palang Pintu Barrier [F9]" onClick={() => void handleOpenGate()} tone="success" />
          <DockKey kbd="F10" label="Cetak" title="Cetak Struk Thermal EPSON [F10]" onClick={handlePrint} />
          <DockKey kbd="F11" label="Override" title="Otorisasi Supervisor Darurat [F11]" onClick={() => setShowOverride(true)} tone="warning" />
          <button
            type="button"
            onClick={handleReset}
            title="Tutup Modal atau Batal Transaksi [ESC]"
            className="flex cursor-pointer items-center gap-1.5 rounded border border-[#333338] bg-[#0a0a0a] px-2 py-1 shadow-sm transition-all hover:bg-[#ef4444]/20 hover:text-[#ef4444] active:scale-95"
          >
            <kbd className="rounded border border-[#333338] bg-[#252528] px-1.5 py-0.5 text-[11px] font-bold text-[#ef4444]">
              ESC
            </kbd>
            <span className="text-[11px] font-medium text-[#9ca3af]">Batal / Tutup</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-[#38bdf8]">Session: #SESS-20241024-001</span>
          <span className="text-[#333338]">|</span>
          <span>Audit Level: <strong className="text-white">Standard 1</strong></span>
        </div>
      </footer>

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      <ShiftModal
        open={showShift}
        onClose={() => setShowShift(false)}
        operatorName={session?.operator.name ?? '-'}
        shift={shift}
        summary={summary}
        onHandover={handleHandoverShift}
        onEndShift={handleEndShift}
      />
      <SupervisorOverrideModal
        open={showOverride}
        busy={busy}
        onClose={() => setShowOverride(false)}
        onAuthorize={(pin, reason) => void handleOverride(pin, reason)}
        error={overrideError}
      />
    </div>
  )
}
