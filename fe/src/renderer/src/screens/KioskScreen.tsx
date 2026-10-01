import type React from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { OperatorProfile, ParkingSession } from '@shared/types'
import {
  Badge as BadgeIcon,
  BadgeCheck,
  Bike,
  CarFront,
  CircleCheck,
  CreditCard,
  DoorOpen,
  FlaskConical,
  Headset,
  LockOpen,
  Nfc,
  QrCode,
  Timer,
  TriangleAlert,
  Truck
} from 'lucide-react'
import { searchSessions, createQrIntent, openGate } from '../lib/server-api'
import { QrPaymentPanel } from '../components/loket/QrPaymentPanel'
import { formatCurrency, formatDateTime, formatDuration } from '../lib/format'
import { newKey } from '../lib/ids'
import { cn } from '@renderer/lib/utils'

type KioskView = 'standby' | 'billing' | 'success' | 'error'

interface SuccessInfo {
  badge: string
  subtitle: string
  plate: string
  method: string
}

const KIOSK_OPERATOR: OperatorProfile = {
  id: 'kiosk',
  username: 'kiosk',
  name: 'Kiosk Manless',
  role: 'Kiosk',
  permissions: []
}

const INSTRUCTION_CARDS = [
  {
    icon: Nfc,
    iconClass: 'text-[#ffb690]',
    title: 'Member / RFID',
    desc: 'Tempelkan kartu pada reader'
  },
  {
    icon: QrCode,
    iconClass: 'text-[#4fc1ff]',
    title: 'QRIS Dinamis',
    desc: 'Scan QR dari dashboard mobil'
  },
  {
    icon: CreditCard,
    iconClass: 'text-[#7bd0ff]',
    title: 'Kartu Bank / e-Toll',
    desc: 'Flazz, Mandiri, BRI, BNI'
  }
]

function dummySession(
  id: string,
  ticketNumber: string,
  plateNumber: string,
  vehicleType: string,
  entryTime: string,
  durationMinutes: number,
  amount: number
): ParkingSession {
  return {
    id,
    ticketNumber,
    plateNumber,
    vehicleType,
    entryTime,
    durationMinutes,
    amount,
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: 'Gate Barat 01'
  }
}

const SIM_DUMMY = {
  car: dummySession(
    'dummy-car',
    'TCK-89240019',
    'B 2489 SKV',
    'Mobil',
    '2024-10-24T12:13:45',
    135,
    12000
  ),
  motor: dummySession(
    'dummy-motor',
    'MTR-33910042',
    'B 6742 WQZ',
    'Motor',
    '2024-10-24T13:00:10',
    88,
    4000
  ),
  truck: dummySession(
    'dummy-truck',
    'TRK-55201991',
    'B 9011 TKK',
    'Truk / Bus',
    '2024-10-24T09:30:20',
    298,
    35000
  )
}

function isDummySession(session: ParkingSession): boolean {
  return session.id.startsWith('dummy-')
}

export function KioskScreen(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const isEntryWest02 =
    searchParams.get('booth') === 'entry-west-02' && searchParams.get('mode') === 'manless'
  const [view, setView] = useState<KioskView>('standby')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null)
  const [qrIntentId, setQrIntentId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null)
  const [gateCountdown, setGateCountdown] = useState(5)

  useEffect(() => {
    if (view !== 'success') return
    const countdown = setInterval(() => setGateCountdown((c) => (c <= 0 ? 0 : c - 1)), 1000)
    return () => clearInterval(countdown)
  }, [view])

  const showSuccess = (info: SuccessInfo): void => {
    setSuccessInfo(info)
    setGateCountdown(5)
    setView('success')
    setTimeout(() => {
      setView('standby')
      setActiveSession(null)
      setQrIntentId(null)
      setSearchQuery('')
      setSuccessInfo(null)
    }, 5000)
  }

  const createIntent = async (session: ParkingSession): Promise<void> => {
    setBusy(true)
    const result = await createQrIntent(session.id, KIOSK_OPERATOR)
    setBusy(false)
    if (result.ok) {
      setQrIntentId(result.data.id)
    } else {
      setErrorMessage(result.error.message)
      setView('error')
    }
  }

  /** Masuk ke billing; sesi asli langsung dibuatkan QR (tanpa klik), sesi dummy mode simulator. */
  const openBilling = (session: ParkingSession): void => {
    setActiveSession(
      isEntryWest02
        ? { ...session, laneIn: 'Entry Barat 02 • Dispenser Ticketing' }
        : session
    )
    setQrIntentId(null)
    setErrorMessage('')
    setView('billing')
    if (!isDummySession(session)) {
      void createIntent(session)
    }
  }

  const handleSearch = async (): Promise<void> => {
    if (!searchQuery.trim()) return
    setBusy(true)
    const result = await searchSessions({ mode: 'scan', payload: searchQuery })
    setBusy(false)
    if (result.ok && result.data.length > 0) {
      const session = result.data[0]
      if (session.paymentStatus === 'PAID') {
        setErrorMessage('Tiket sudah lunas. Silakan hubungi operator.')
        setView('error')
        return
      }
      openBilling(session)
    } else {
      setErrorMessage('Tiket tidak ditemukan atau tidak valid. Silakan hubungi operator.')
      setView('error')
    }
  }

  const handleGateOpen = async (): Promise<void> => {
    if (!activeSession) return
    setBusy(true)
    const result = await openGate(activeSession.id, newKey('gate'))
    setBusy(false)
    if (result.ok && result.data.status === 'SUCCESS') {
      showSuccess({
        badge: 'Pembayaran Diverifikasi • Lunas',
        subtitle:
          'Pembayaran QRIS telah diterima oleh sistem payment gateway. Gerbang sedang dibuka.',
        plate: activeSession.plateNumber,
        method: 'QRIS'
      })
    } else {
      setErrorMessage(result.ok ? result.data.message : result.error.message)
      setView('error')
    }
  }

  const handleReset = (): void => {
    setView('standby')
    setActiveSession(null)
    setQrIntentId(null)
    setSearchQuery('')
    setErrorMessage('')
    setSuccessInfo(null)
  }

  const simulateQrSuccess = (): void => {
    if (!activeSession) return
    showSuccess({
      badge: 'Pembayaran QRIS Berhasil • Lunas',
      subtitle:
        'Pembayaran QRIS telah diterima oleh sistem payment gateway. Gerbang sedang dibuka.',
      plate: activeSession.plateNumber,
      method: 'QRIS (Simulasi)'
    })
  }

  const simulateTapSuccess = (): void => {
    if (!activeSession) return
    showSuccess({
      badge: 'Tap E-Money Berhasil • Saldo Terpotong',
      subtitle:
        'Transaksi berhasil menggunakan kartu contactless. Palang terbuka, silakan jalan.',
      plate: activeSession.plateNumber,
      method: 'E-Money (Simulasi)'
    })
  }

  const loopStatus =
    view === 'billing'
      ? { dot: 'bg-[#f59e0b] animate-pulse', text: 'MOBIL PRESENT', cls: 'text-[#f59e0b]' }
      : view === 'success'
        ? { dot: 'bg-[#22c55e] animate-pulse', text: 'KENDARAAN KELUAR', cls: 'text-[#22c55e]' }
        : { dot: 'bg-[#38bdf8]', text: 'STANDBY / IDLE', cls: 'text-[#38bdf8]' }

  return (
    <div className="flex min-h-screen flex-col bg-[#18181b] font-sans text-[#d4d4d4] antialiased lg:h-screen lg:overflow-hidden">
      {/* Hardware Live Telemetry Strip */}
      <div className="flex w-full flex-none flex-wrap items-center justify-between gap-2 bg-[#0e0e11] px-4 py-1.5 font-mono text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', loopStatus.dot)} />
            <span className="font-semibold text-[#d4d4d4]">SENSOR LOOP:</span>
            <span className={cn('font-bold', loopStatus.cls)}>{loopStatus.text}</span>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            <span>ANPR OCR CAM:</span>
            <span className="font-bold text-[#38bdf8]">READY (99.4%)</span>
          </div>
          <div className="hidden items-center gap-1.5 md:flex">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            <span>OPTICAL SCAN:</span>
            <span className="font-bold text-[#22c55e]">ONLINE</span>
          </div>
          <div className="hidden items-center gap-1.5 lg:flex">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            <span>SAM / RFID TAP:</span>
            <span className="font-bold text-[#22c55e]">READY</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#1f1f22] px-2 py-0.5">
            POS ID:{' '}
            <span className="font-bold text-white">
              {isEntryWest02 ? 'KSL-ENTRY-WEST-02' : 'KSL-GATE-01'}
            </span>
          </span>
          {isEntryWest02 && (
            <span className="rounded bg-[#264f78] px-2 py-0.5 font-bold text-[#7bd0ff]">
              MANLESS • DISPENSER TICKETING
            </span>
          )}
          <span className="rounded bg-[#1f1f22] px-2 py-0.5">
            RELAY: <span className="font-bold text-[#22c55e]">COM3 OK</span>
          </span>
        </div>
      </div>

      <main className="flex w-full flex-1 flex-col gap-4 overflow-y-auto p-4 lg:overflow-hidden">
        {view === 'standby' && (
          <div className="relative flex min-h-[420px] w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl bg-[#1b1b1e] p-6 text-center shadow-xl">
            <div className="pointer-events-none absolute -left-32 -top-32 size-96 animate-pulse rounded-full bg-[#22c55e]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-[#ffb690]/10 blur-3xl" />
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#22c55e]/15 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-[#22c55e]">
              <span className="size-3 animate-ping rounded-full bg-[#22c55e]" />
              Gerbang Parkir Otomatis Siap Operasi
            </div>
            <div className="select-none py-4 font-heading text-7xl font-bold tracking-tighter text-[#22c55e] drop-shadow-[0_0_40px_rgba(34,197,94,0.65)] md:text-8xl">
              BUKA
            </div>
            <div className="mt-2 flex max-w-2xl flex-col items-center gap-2">
              <h2 className="font-heading text-2xl font-bold text-white md:text-3xl">SILAKAN MAJU KE POS</h2>
              <p className="text-sm text-[#a1a1aa]">
                Kamera otomatis mendeteksi plat nomor kendaraan. Siapkan tiket parkir, kartu e-Money, atau aplikasi pembayaran digital Anda.
              </p>
            </div>
            <div className="mt-6 grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
              {INSTRUCTION_CARDS.map((card) => (
                <div key={card.title} className="flex items-center gap-3 rounded-lg bg-[#1f1f22] p-4 shadow-sm">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#353438]">
                    <card.icon className={cn('size-7', card.iconClass)} aria-hidden />
                  </div>
                  <div className="text-left">
                    <div className="font-mono text-xs font-bold uppercase text-white">{card.title}</div>
                    <div className="text-xs text-[#a1a1aa]">{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'billing' && activeSession && (
          <div className="grid flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            {/* Left (5 cols): ANPR snapshot & tariff */}
            <div className="flex flex-col justify-between rounded-xl bg-[#1b1b1e] p-5 shadow-md lg:col-span-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-[#a1a1aa]">
                    <span className="size-2 animate-ping rounded-full bg-[#ef4444]" />
                    ANPR Live Camera Feed
                  </span>
                  <span className="rounded bg-[#264f78] px-2 py-0.5 font-mono text-xs font-bold uppercase text-white">
                    Golongan: {activeSession.vehicleType}
                  </span>
                </div>
                <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg bg-[#0a0a0a] p-4 shadow-inner">
                  <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-[#2a2a2d]/80 px-1.5 py-0.5 font-mono text-[11px]">
                    <span className="text-[#a1a1aa]">OCR REC:</span>
                    <span className="font-bold text-[#22c55e]">99.8%</span>
                  </div>
                  <div className="mt-4 rounded-md bg-[#111111] px-6 py-2 text-center shadow-md">
                    <div className="font-mono text-[11px] tracking-widest text-[#a1a1aa]">INDONESIA</div>
                    <div className="font-mono text-3xl font-extrabold tracking-wider text-white md:text-4xl">
                      {activeSession.plateNumber}
                    </div>
                    <div className="font-mono text-[11px] tracking-widest text-[#a1a1aa]">
                      {activeSession.ticketNumber}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-[#1f1f22] p-4 font-mono text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#a1a1aa]">WAKTU MASUK:</span>
                    <span className="font-bold text-white">{formatDateTime(activeSession.entryTime)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#a1a1aa]">WAKTU KELUAR:</span>
                    <span className="font-bold text-white">{formatDateTime(new Date().toISOString())}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#a1a1aa]">DURASI PARKIR:</span>
                    <span className="font-bold text-[#ffb690]">
                      {formatDuration(activeSession.durationMinutes).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#a1a1aa]">KODE TIKET:</span>
                    <span className="font-bold text-[#a1a1aa]">{activeSession.ticketNumber}</span>
                  </div>
                  {isEntryWest02 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#a1a1aa]">BOOTH DISPENSER:</span>
                      <span className="font-bold text-[#7bd0ff]">ENTRY BARAT 02</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-col rounded-xl bg-[#2a2a2d] p-4 shadow-inner">
                <span className="font-mono text-xs uppercase tracking-wider text-[#a1a1aa]">Total Tarif Parkir</span>
                <div className="flex items-baseline justify-between">
                  <span className="font-heading text-xl font-bold text-[#ffb690]">RP</span>
                  <span className="font-mono text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                    {activeSession.amount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right (7 cols): Metode A + Metode B side by side, no selection click */}
            <div className="flex flex-col justify-between rounded-xl bg-[#1b1b1e] p-5 shadow-md lg:col-span-7">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-3 animate-ping rounded-full bg-[#f59e0b]" />
                    <span className="font-heading text-sm font-bold uppercase tracking-wide text-white">
                      Pilihan Pembayaran Mandiri
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#a1a1aa]">PILIH SALAH SATU</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Option A: QRIS */}
                  <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-xl bg-[#1f1f22] p-4 text-center shadow-sm">
                    <div className="mb-2 flex w-full items-center justify-between">
                      <span className="rounded bg-[#f97316]/20 px-2 py-0.5 font-mono text-[11px] font-bold text-[#f97316]">
                        METODE A
                      </span>
                      {qrIntentId || isDummySession(activeSession) ? (
                        <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#f59e0b]">
                          <Timer className="size-4" aria-hidden /> QR AKTIF
                        </span>
                      ) : (
                        <span className="rounded bg-[#353438] px-2 py-0.5 font-mono text-[11px] text-[#a1a1aa]">
                          GPN
                        </span>
                      )}
                    </div>
                    <span className="font-heading text-sm font-bold text-white">QRIS DINAMIS</span>
                    {isDummySession(activeSession) ? (
                      <>
                        <div className="my-2 flex h-52 w-52 flex-col items-center justify-center gap-1 rounded-lg bg-white p-2 shadow-md">
                          <QrCode className="size-16 text-[#0a0a0a]" aria-hidden />
                          <span className="font-mono text-[10px] font-bold text-[#0a0a0a]">
                            {formatCurrency(activeSession.amount)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#a1a1aa]">
                          BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay, LinkAja.
                        </p>
                        <button
                          type="button"
                          onClick={simulateQrSuccess}
                          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-[#f97316] px-4 py-2.5 font-mono text-xs font-bold uppercase text-white shadow-md transition-colors hover:bg-[#ea580c] active:scale-95"
                        >
                          <BadgeCheck className="size-[18px]" aria-hidden />
                          Simulasi QRIS Sukses
                        </button>
                      </>
                    ) : qrIntentId ? (
                      <div className="mt-2 w-full">
                        <QrPaymentPanel
                          intentId={qrIntentId}
                          canCancel={false}
                          cancelling={false}
                          onStatusChange={(intent) => {
                            if (intent.status === 'PAID') {
                              void handleGateOpen()
                            }
                          }}
                          onCancel={() => undefined}
                        />
                      </div>
                    ) : (
                      <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-8">
                        <span className="font-mono text-xs text-[#a1a1aa]">
                          {busy ? 'Membuat kode QR...' : 'Gagal membuat kode QR.'}
                        </span>
                        {!busy && (
                          <button
                            type="button"
                            onClick={() => void createIntent(activeSession)}
                            className="cursor-pointer rounded bg-[#f97316] px-4 py-2.5 font-mono text-xs font-bold uppercase text-white shadow-md transition-colors hover:bg-[#ea580c] active:scale-95"
                          >
                            Buat Ulang QR
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Option B: e-Money */}
                  <div className="flex flex-col items-center justify-between rounded-xl bg-[#1f1f22] p-4 text-center shadow-sm">
                    <div className="mb-2 flex w-full items-center justify-between">
                      <span className="rounded bg-[#7bd0ff]/20 px-2 py-0.5 font-mono text-[11px] font-bold text-[#7bd0ff]">
                        METODE B
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#22c55e]">READER SIAP</span>
                    </div>
                    <span className="font-heading text-sm font-bold text-white">TAP KARTU E-MONEY</span>
                    <div className="mt-1 text-xs text-[#a1a1aa]">
                      Tempelkan kartu Anda pada sensor bertanda gelombang
                    </div>
                    <div className="relative my-3 flex size-48 flex-col items-center justify-center rounded-full bg-[#18181b] shadow-inner">
                      <Nfc className="size-[68px] animate-pulse text-[#7bd0ff]" aria-hidden />
                      <div className="pointer-events-none absolute inset-0 animate-ping rounded-full border-2 border-[#7bd0ff]/20" />
                      <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa]">
                        Tempel disini
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase text-[#a1a1aa]">
                      <span>Flazz</span> • <span>E-Money</span> • <span>Brizzi</span> • <span>TapCash</span>
                    </div>
                    {isDummySession(activeSession) ? (
                      <button
                        type="button"
                        onClick={simulateTapSuccess}
                        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-[#2a2a2d] px-4 py-2.5 font-mono text-xs font-bold uppercase text-white shadow-md transition-colors hover:bg-[#264f78] active:scale-95"
                      >
                        <CreditCard className="size-[18px]" aria-hidden />
                        Simulasi Tap Kartu
                      </button>
                    ) : (
                      <div className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-[#27272a] bg-[#0e0e11] px-3 py-2">
                        <span className="size-2 animate-pulse rounded-full bg-[#f59e0b]" />
                        <span className="font-mono text-xs">Menunggu tap...</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="mt-3 w-full cursor-pointer rounded border border-[#27272a] bg-[#0e0e11] px-4 py-2 font-mono text-xs text-[#a1a1aa] transition-colors hover:bg-[#2a2a2d] hover:text-white active:scale-95"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#1f1f22] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Headset className="size-5 text-[#ffb690]" aria-hidden />
                  <span className="text-xs text-[#a1a1aa]">
                    Butuh Bantuan Operator Pos? Tekan Tombol Bantuan Intercom di Kanan.
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-[#ffb690]">INTERCOM AKTIF</span>
              </div>
            </div>
          </div>
        )}

        {view === 'success' && successInfo && (
          <div className="flex min-h-[420px] w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl bg-[#1b1b1e] p-6 text-center shadow-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#22c55e]/20 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-[#22c55e]">
              <CircleCheck className="size-5" aria-hidden />
              {successInfo.badge}
            </div>
            <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white md:text-5xl">
              TERIMA KASIH • SELAMAT JALAN!
            </h1>
            <p className="max-w-xl text-sm text-[#a1a1aa]">{successInfo.subtitle}</p>
            <div className="my-6 flex w-full max-w-lg items-center justify-around rounded-xl bg-[#1f1f22] p-5 shadow-inner">
              <div className="flex flex-col items-center">
                <span className="font-mono text-[11px] uppercase text-[#a1a1aa]">Status Palang</span>
                <span className="flex items-center gap-1.5 font-heading text-xl font-bold text-[#22c55e]">
                  <DoorOpen className="size-6" aria-hidden />
                  TERBUKA PENUH
                </span>
              </div>
              <div className="h-10 w-px bg-[#27272a]" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-[11px] uppercase text-[#a1a1aa]">Hitung Mundur Tutup</span>
                <span className="font-mono text-4xl font-bold text-[#f97316]">
                  {String(gateCountdown).padStart(2, '0')}s
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-[#a1a1aa]">
              <span>
                PLAT: <b className="text-white">{successInfo.plate}</b>
              </span>
              <span>•</span>
              <span>
                METODE: <b className="text-[#22c55e]">{successInfo.method}</b>
              </span>
              <span>•</span>
              <span>
                STRUK: <b className="text-white">TERCETAK OTOMATIS</b>
              </span>
            </div>
          </div>
        )}

        {view === 'error' && (
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 rounded-xl bg-[#1b1b1e] p-8 text-center shadow-xl">
            <TriangleAlert className="size-14 text-[#ef4444]" aria-hidden />
            <h2 className="font-heading text-2xl font-bold text-white">Terjadi Kesalahan</h2>
            <p className="text-sm text-[#a1a1aa]">{errorMessage}</p>
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer rounded-lg bg-[#f97316] px-6 py-2.5 font-mono text-sm font-bold text-white shadow transition-all hover:bg-[#ea580c] active:scale-95"
            >
              Kembali
            </button>
          </div>
        )}

        {/* Simulator skenario operasional (test bench pengembangan) */}
        <div className="w-full flex-none rounded-xl bg-[#111111] p-3 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#a1a1aa]">
              <FlaskConical className="size-[18px] text-[#ffb690]" aria-hidden />
              <span className="font-bold text-white">Simulator Skenario Operasional</span>
              <span className="hidden sm:inline">| Klik skenario untuk melihat respon layar kiosk</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                placeholder="Tiket asli..."
                className="w-40 rounded border border-[#27272a] bg-[#0e0e11] px-2.5 py-1 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={busy || !searchQuery.trim()}
                className="cursor-pointer rounded bg-[#264f78] px-3 py-1 font-mono text-xs font-bold text-white transition-colors hover:bg-[#264f78]/70 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cari
              </button>
              <span className="hidden font-mono text-[11px] text-[#a1a1aa] md:inline">SIM V4.2</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
            <button
              type="button"
              onClick={handleReset}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#1f1f22] px-2 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#2a2a2d] active:scale-95"
            >
              <span className="size-2 rounded-full bg-[#22c55e]" />
              1. STANDBY (BUKA)
            </button>
            <button
              type="button"
              onClick={() =>
                showSuccess({
                  badge: 'Member Berlangganan / Karyawan Aktif (Rp 0)',
                  subtitle: 'Selamat datang Bpk. Hendra Wijaya. Hak akses member berlaku s/d 31 Des 2025.',
                  plate: 'B 1234 KRY',
                  method: 'MEMBER / RFID'
                })
              }
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#1f1f22] px-2 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#264f78] active:scale-95"
            >
              <BadgeIcon className="size-4 text-[#4fc1ff]" aria-hidden />
              2. MEMBER RFID (Rp0)
            </button>
            <button
              type="button"
              onClick={() =>
                showSuccess({
                  badge: 'Pembayaran Terverifikasi - Lunas (Auto-Pay)',
                  subtitle: 'Sesi parkir telah dituntaskan secara non-tunai.',
                  plate: 'B 8899 POS',
                  method: 'AUTO-PAY'
                })
              }
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#1f1f22] px-2 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#264f78] active:scale-95"
            >
              <BadgeCheck className="size-4 text-[#22c55e]" aria-hidden />
              3. AUTO-PAY LUNAS
            </button>
            <button
              type="button"
              onClick={() => openBilling(SIM_DUMMY.car)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#1f1f22] px-2 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#2a2a2d] active:scale-95"
            >
              <CarFront className="size-4 text-[#f97316]" aria-hidden />
              4. MOBIL (Rp12.000)
            </button>
            <button
              type="button"
              onClick={() => openBilling(SIM_DUMMY.motor)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#1f1f22] px-2 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#2a2a2d] active:scale-95"
            >
              <Bike className="size-4 text-[#f97316]" aria-hidden />
              5. MOTOR (Rp4.000)
            </button>
            <button
              type="button"
              onClick={() => openBilling(SIM_DUMMY.truck)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#1f1f22] px-2 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#2a2a2d] active:scale-95"
            >
              <Truck className="size-4 text-[#f97316]" aria-hidden />
              6. TRUK (Rp35.000)
            </button>
            <button
              type="button"
              onClick={() =>
                showSuccess({
                  badge: 'Override Manual oleh Operator Kiosk',
                  subtitle: 'Palang dibuka secara darurat/manual via console perintah.',
                  plate: 'MANUAL OVERRIDE',
                  method: 'OVERRIDE'
                })
              }
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#f97316] px-2 py-1.5 font-mono text-[11px] font-bold uppercase text-white shadow transition-colors hover:bg-[#ea580c] active:scale-95"
            >
              <LockOpen className="size-4" aria-hidden />
              Buka Manual
            </button>
          </div>
        </div>
      </main>

      {/* Device status footer */}
      <footer className="w-full flex-none bg-[#111111] px-4 py-2 shadow-[0_-1px_6px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between font-mono text-[11px] text-[#a1a1aa]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#22c55e]" />
              PRINTER THERMAL: READY
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="size-2 rounded-full bg-[#22c55e]" />
              RFID READER: ACTIVE
            </div>
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="size-2 rounded-full bg-[#22c55e]" />
              OPTICAL SCANNER: ARMED
            </div>
            <div className="hidden items-center gap-1.5 lg:flex">
              <span className={cn('size-2 rounded-full', view === 'standby' ? 'bg-[#38bdf8]' : 'bg-[#22c55e]')} />
              LOOP DETECTOR: {view === 'standby' ? 'IDLE' : 'CAR PRESENT'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">POS PARKIR V4.2.0-ELECTRON</span>
            <span className="font-semibold text-[#ffb690]">HELP DESK: INTERCOM 01</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
