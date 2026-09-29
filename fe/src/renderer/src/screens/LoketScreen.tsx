import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { GateResult, ParkingSession, PaymentTransaction, QrIntent } from '@shared/types'
import {
  cancelQrIntent,
  createQrIntent,
  getLatestTransactionForSession,
  getSession,
  openGate,
  payCash,
  pingServer,
  searchSessions
} from '../lib/server-api'
import { can, Permissions } from '../lib/permissions'
import { newKey } from '../lib/ids'
import { formatCurrency, formatDateTime, formatDuration } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useShift } from '../context/ShiftContext'
import { useConfig } from '../context/ConfigContext'
import { QrPaymentPanel } from '../components/loket/QrPaymentPanel'
import { HelpModal } from '../components/loket/HelpModal'
import { SupervisorOverrideModal } from '../components/loket/SupervisorOverrideModal'
import { DockButton } from '../components/park-pos'
import { useToast } from '../hooks/useToast'
import { useFKeyBindings } from '../hooks/useFKeyBindings'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/utils'

type SearchMode = 'scan' | 'manual'
type PaymentTab = 'cash' | 'qr' | 'emoney'

const MANUAL_CLASSES = [
  'Gol. 1 - Mobil Minibus/Sedan',
  'Gol. 2 - Motor / Roda Dua',
  'Gol. 3 - Truk / Bus Besar'
]

function timeParts(now: Date): { clock: string; date: string } {
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MEI',
    'JUN',
    'JUL',
    'AGU',
    'SEP',
    'OKT',
    'NOV',
    'DES'
  ]
  const date = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`
  return { clock, date }
}

export function LoketScreen(): React.JSX.Element {
  const { session } = useAuth()
  const { shift } = useShift()
  const { config } = useConfig()
  const navigate = useNavigate()
  const operator = session?.operator

  const [mode, setMode] = useState<SearchMode>('scan')
  const [query, setQuery] = useState('')
  const [manualClass, setManualClass] = useState(MANUAL_CLASSES[0])
  const [scanPayload, setScanPayload] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<ParkingSession[] | null>(null)

  const [selected, setSelected] = useState<ParkingSession | null>(null)
  const [payTab, setPayTab] = useState<PaymentTab>('cash')
  const [paidTransaction, setPaidTransaction] = useState<PaymentTransaction | null>(null)

  const [cashReceived, setCashReceived] = useState('')
  const [cashBusy, setCashBusy] = useState(false)
  const [cashError, setCashError] = useState<string | null>(null)
  const [cashKey, setCashKey] = useState('')

  const [qrIntent, setQrIntent] = useState<QrIntent | null>(null)
  const [qrBusy, setQrBusy] = useState(false)
  const [qrCancelBusy, setQrCancelBusy] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)

  const [gateResult, setGateResult] = useState<GateResult | null>(null)
  const [gateBusy, setGateBusy] = useState(false)
  const [gateSimulate, setGateSimulate] = useState('none')
  const [gateKey, setGateKey] = useState('')

  const [helpOpen, setHelpOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideBusy, setOverrideBusy] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  const [latency, setLatency] = useState<number | null>(null)
  const [clock, setClock] = useState<{ clock: string; date: string } | null>(null)

  const canCash = can(session, Permissions.PaymentCash)
  const canQr = can(session, Permissions.PaymentQr)
  const canCancel = can(session, Permissions.PaymentCancel)
  const canGate = can(session, Permissions.GateOpen)
  const canReprint = can(session, Permissions.ReceiptReprint)

  const toast = useToast()

  const unpaid = Boolean(selected && selected.paymentStatus !== 'PAID' && !paidTransaction)

  // ── Live clock ──
  useEffect(() => {
    const push = (): void => setClock(timeParts(new Date()))
    const startId = window.setTimeout(push, 50)
    const id = window.setInterval(push, 1000)
    return () => {
      window.clearTimeout(startId)
      window.clearInterval(id)
    }
  }, [])

  const pingTick = useCallback(async (): Promise<void> => {
    const startedAt = performance.now()
    const pingResult = await pingServer()
    const nextLatency = pingResult.ok ? Math.round(performance.now() - startedAt) : null
    setLatency(nextLatency)
  }, [])

  useEffect(() => {
    const startId = window.setTimeout(() => void pingTick(), 50)
    const id = window.setInterval(() => void pingTick(), 10_000)
    return () => {
      window.clearTimeout(startId)
      window.clearInterval(id)
    }
  }, [pingTick])

  const resetGate = useCallback((target: ParkingSession | null): void => {
    setGateResult(null)
    setGateSimulate('none')
    setGateKey(target ? newKey(`gate_${target.id}`) : '')
  }, [])

  const clearPaymentState = useCallback(
    (target: ParkingSession | null): void => {
      setPayTab('cash')
      setCashReceived('')
      setCashError(null)
      setQrIntent(null)
      setQrError(null)
      setPaidTransaction(null)
      if (target) setCashKey(newKey(`cash_${target.id}`))
      resetGate(target)
    },
    [resetGate]
  )

  const runSearch = async (event?: React.FormEvent): Promise<void> => {
    if (searching) return
    if (event) event.preventDefault()
    setSearching(true)
    setSearchError(null)
    setSelected(null)
    clearPaymentState(null)
    setResults(null)

    const input =
      mode === 'scan'
        ? ({ mode: 'scan', payload: scanPayload } as const)
        : ({ mode: 'manual', plateNumber: query } as const)

    const result = await searchSessions(input)
    setSearching(false)
    if (result.ok) {
      setResults(result.data)
      if (result.data.length === 1) {
        setSelected(result.data[0])
        setCashKey(newKey(`cash_${result.data[0].id}`))
        setGateKey(newKey(`gate_${result.data[0].id}`))
      }
    } else {
      setSearchError(result.error.message)
      setResults(null)
    }
  }

  const selectSession = (target: ParkingSession): void => {
    setSelected(target)
    clearPaymentState(target)
  }

  const refreshSelected = useCallback(async (): Promise<void> => {
    if (!selected) return
    const result = await getSession(selected.id)
    if (result.ok) setSelected(result.data)
  }, [selected])

  const handleCash = async (): Promise<void> => {
    if (!selected || !operator || cashBusy) return
    if (!cashReceived || Number(cashReceived) < selected.amount) {
      setCashError('Nominal tunai kurang dari total pembayaran.')
      return
    }
    setCashBusy(true)
    setCashError(null)
    const result = await payCash(selected.id, Number(cashReceived), cashKey, operator)
    setCashBusy(false)
    if (!result.ok) {
      setCashError(result.error.message)
      return
    }
    setPaidTransaction(result.data)
    toast('Pembayaran tunai berhasil. Izin buka palang aktif.', 'success')
    await refreshSelected()
  }

  const handleCreateQr = async (): Promise<void> => {
    if (!selected || !operator || qrBusy) return
    setQrBusy(true)
    setQrError(null)
    setPayTab('qr')
    const result = await createQrIntent(selected.id, operator)
    setQrBusy(false)
    if (!result.ok) {
      setQrError(result.error.message)
      return
    }
    setQrIntent(result.data)
    await refreshSelected()
  }

  const handleQrStatusChange = useCallback(
    async (intent: QrIntent): Promise<void> => {
      setQrIntent(intent)
      if (intent.status === 'PAID') {
        const transaction = await getLatestTransactionForSession(intent.sessionId)
        setPaidTransaction(transaction)
        toast('Pembayaran QR berhasil. Izin buka palang aktif.', 'success')
        void refreshSelected()
      } else if (intent.status === 'CANCELLED') {
        setQrIntent(null)
        toast('QR dibatalkan. Pelanggan dapat memilih metode lain.')
        void refreshSelected()
      } else if (intent.status === 'EXPIRED') {
        setQrIntent(null)
        setQrError('QR kedaluwarsa. Buat QR baru bila pelanggan masih ingin membayar.')
        void refreshSelected()
      }
    },
    [refreshSelected, toast]
  )

  const handleCancelQr = async (): Promise<void> => {
    if (!qrIntent || !operator || qrCancelBusy) return
    setQrCancelBusy(true)
    const result = await cancelQrIntent(qrIntent.id, 'Pelanggan memilih metode lain', operator)
    setQrCancelBusy(false)
    if (!result.ok) {
      setQrError(result.error.message)
      return
    }
    setQrIntent(null)
    setPayTab('cash')
    toast('QR dibatalkan oleh operator.')
    await refreshSelected()
  }

  const handleOverride = async (_pin: string, reason: string): Promise<void> => {
    if (!selected || overrideBusy) return
    setOverrideBusy(true)
    setOverrideError(null)
    const response = await openGate(selected.id, newKey(`gate_override_${selected.id}`), 'none')
    setOverrideBusy(false)
    if (!response.ok) {
      setOverrideError(response.error.message)
      toast('Server menolak otorisasi: ' + response.error.message, 'error')
      return
    }
    setGateResult(response.data)
    toast(
      `Otorisasi supervisor diterima (${reason}) — palang: ${response.data.status === 'SUCCESS' ? 'DIBUKA' : 'GAGAL'}`,
      response.data.status === 'SUCCESS' ? 'success' : 'error'
    )
    if (response.data.status === 'SUCCESS') await refreshSelected()
    setOverrideOpen(false)
  }

  const handleOpenGate = async (): Promise<void> => {
    if (!selected || gateBusy || !canGate) return
    if (unpaid) {
      setGateResult({
        status: 'FAILED',
        message: 'Palang terkunci. Selesaikan pembayaran terlebih dahulu.',
        correlationId: '-'
      })
      return
    }
    setGateBusy(true)
    setGateResult(null)
    const response = await openGate(selected.id, gateKey, gateSimulate as never)
    setGateBusy(false)
    if (response.ok) {
      setGateResult(response.data)
      if (response.data.status === 'SUCCESS') await refreshSelected()
    } else {
      setGateResult({ status: 'FAILED', message: response.error.message, correlationId: '-' })
    }
  }

  const handlePrint = (): void => {
    if (paidTransaction && canReprint) {
      toast(`Struk TXN ${paidTransaction.id} dikirim antrian cetak (TM-T82).`, 'success')
      return
    }
    toast('Belum ada transaksi lunas yang bisa dicetak untuk sesi ini.', 'info')
  }

  const nextTransaction = (): void => {
    setSelected(null)
    setResults(null)
    setQuery('')
    setScanPayload('')
    setSearchError(null)
    setMode('scan')
    clearPaymentState(null)
  }

  const change = selected ? Number(cashReceived || 0) - selected.amount : 0

  // ── Keyboard shortcuts (F1, F3-F9, F11, Enter, ESC) ──
  useFKeyBindings({
    f1: () => setHelpOpen(true),
    f11: () => {
      setOverrideError(null)
      setOverrideOpen(true)
    },
    f3: () => setMode('scan'),
    f4: () => setMode('manual'),
    f5: () => {
      if (unpaid) setPayTab('cash')
    },
    f6: () => {
      if (unpaid && !qrIntent) void handleCreateQr()
    },
    f9: () => void handleOpenGate(),
    enter: () => {
      if (unpaid && payTab === 'cash') void handleCash()
    },
    escape: () => {
      if (helpOpen) {
        setHelpOpen(false)
        return
      }
      if (overrideOpen) {
        setOverrideOpen(false)
        return
      }
      nextTransaction()
    }
  })

  const gateNameDisplay = config?.gateName ?? 'Gate Barat'
  const unitLabel = `${gateNameDisplay} • Exit Kendaraan Roda 4`

  return (
    <div className="flex h-screen min-h-0 flex-col">
      {/* ═════ TOP WINDOW BAR (Electron Chrome Header) ═════ */}
      <header className="w-full flex-none border-b border-park-border bg-park-secondary">
        {/* System Title Bar */}
        <div className="flex h-8 items-center justify-between border-b border-border/60 bg-background px-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 items-center justify-center rounded-sm bg-park-cta text-[9px] font-bold text-black">
              P
            </span>
            <span className="font-semibold tracking-wide text-foreground">PARK-POS v2.4.1</span>
            <span className="text-border">/</span>
            <span className="text-muted-foreground">Electron Desktop Workstation</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className={cn(
                  'size-2 rounded-full',
                  latency !== null ? 'animate-pulse bg-park-success' : 'bg-muted-foreground'
                )}
              />
              Site Server:{' '}
              <span
                className={cn(
                  'font-semibold',
                  latency !== null ? 'text-park-success' : 'text-muted-foreground'
                )}
              >
                {latency !== null ? `Online ${latency}ms` : 'Menunggu ping...'}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-muted-foreground/60" />
              Central: <span className="font-semibold text-muted-foreground">Tidak tersedia</span>
            </span>
            <span className="text-border">|</span>
            <span className="text-park-cyan">
              Gate: {config?.gateName ?? 'Exit 01'} {config?.laneName ? `• ${config.laneName}` : ''}
            </span>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-8 items-center justify-center px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-park-card hover:text-white active:scale-95"
              title="Kembali ke Beranda"
            >
              ⌂ Beranda
            </button>
          </div>
        </div>
        {/* Main Navigation & Peripheral Bar */}
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Logo & Gate info */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 items-center gap-1 rounded bg-park-cta px-2.5 shadow-sm">
              <span className="text-lg font-bold text-black">P</span>
              <span className="text-sm font-heading font-bold tracking-tight text-black">
                PARK-OS
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wide text-white">LOKET EXIT 01</span>
                <span className="rounded bg-selection-blue px-1.5 py-0.5 font-mono text-[10px] font-bold text-park-cyan">
                  {config?.laneName ? `LANE ${config.laneName}` : 'LANE 01 MOBIL'}
                </span>
              </div>
              <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <span className="text-park-cyan">📍</span> {unitLabel}
              </span>
            </div>
          </div>
          {/* Center: Peripherals Status Badges */}
          <div className="hidden items-center gap-2 font-mono text-xs xl:flex">
            <div className="flex items-center gap-2 rounded border border-park-border bg-park-card-subtle px-2.5 py-1">
              <span className="size-2 rounded-full bg-park-success" />
              <span className="text-muted-foreground">SCANNER:</span>
              <span className="font-semibold text-park-success">OK (USB HID)</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-park-border bg-park-card-subtle px-2.5 py-1">
              <span className="size-2 rounded-full bg-park-success" />
              <span className="text-muted-foreground">PRINTER:</span>
              <span className="font-semibold text-park-success">
                {config?.printerName ? `READY (${config.printerName})` : 'READY (TM-T82)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleOpenGate()}
              className="flex items-center gap-2 rounded border border-park-border bg-park-card-subtle px-2.5 py-1 transition-colors hover:border-park-cyan"
              title="Klik untuk Kontrol Palang"
            >
              <span className="size-2 rounded-full bg-park-success" />
              <span className="text-muted-foreground">BARRIER:</span>
              <span className="font-semibold text-park-cyan">ONLINE (COM3)</span>
            </button>
          </div>
          {/* Right: Operator profile & Clock */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/shift')}
              className="group flex items-center gap-2.5 rounded p-1 text-right transition-colors hover:bg-park-card"
              title="Klik untuk Ganti Shift [F2]"
            >
              <div>
                <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-white transition-colors group-hover:text-park-cyan">
                  <span className="text-park-blue">▣</span>
                  <span>{operator?.name ?? '—'}</span>
                </div>
                <div className="font-mono text-[11px] text-park-cyan">
                  {shift ? `Shift Aktif • ${shift.laneName}` : 'Shift belum dibuka • 06:00 - 14:00'}
                </div>
              </div>
              <span className="text-base text-muted-foreground transition-colors group-hover:text-white">
                ⇄
              </span>
            </button>
            <div className="hidden h-8 w-px bg-park-border sm:block" />
            <div className="hidden text-right font-mono sm:block">
              <div className="text-sm font-bold text-white tabular-nums">
                {clock?.clock ?? '--:--:--'} <span className="text-xs text-park-cyan">WIB</span>
              </div>
              <div className="text-[11px] text-muted-foreground">{clock?.date ?? ''}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ═════ MAIN WORKSPACE (2 Balanced Columns) ═════ */}
      <main className="grid w-full flex-1 grid-cols-1 items-stretch gap-3 overflow-y-auto p-3 lg:grid-cols-12 lg:overflow-hidden">
        {/* ── LEFT COLUMN: Data Kendaraan & Sesi Parkir (7 Cols) ── */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-7">
          {/* 1. Bar Tab Mode Input & Scanner Bar */}
          <div className="flex flex-none flex-col gap-2.5 rounded-lg border border-park-border bg-park-card p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background p-1">
                {(['scan', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs font-bold transition-all active:scale-95',
                      mode === m
                        ? 'bg-selection-blue text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-park-card hover:text-white'
                    )}
                  >
                    <span aria-hidden>{m === 'scan' ? '▦' : '⌨'}</span>
                    <span>{m === 'scan' ? 'Scan Tiket [F3]' : 'Input Manual [F4]'}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-park-success" />
                <span>
                  {mode === 'scan' ? 'BARCODE SCANNER PAYLOAD READY' : 'KEYBOARD MANUAL ENTRY MODE'}
                </span>
              </div>
            </div>

            {mode === 'scan' ? (
              <form
                onSubmit={(event) => void runSearch(event)}
                className="relative flex items-center"
              >
                <span aria-hidden className="absolute left-3 font-mono text-xl text-park-cyan">
                  ▦
                </span>
                <Input
                  value={scanPayload}
                  onChange={(event) => setScanPayload(event.target.value)}
                  placeholder="Tembak barcode scanner atau input nomor tiket..."
                  className="h-10 rounded border-border bg-background pl-10 pr-28 font-mono text-sm text-white"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={() => {
                    setScanPayload('')
                    toast('Scanner dibiarkan fokus — siap menerima tembakan barcode.', 'info')
                  }}
                  className="absolute right-2 h-6 rounded px-2 font-mono text-[10px] font-bold text-park-cyan"
                  variant="outline"
                >
                  AUTO-FOCUS
                </Button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <form onSubmit={(event) => void runSearch(event)} className="flex flex-col gap-1">
                  <label className="block text-[11px] uppercase text-muted-foreground">
                    Nomor Plat Polisi [Manual]
                  </label>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value.toUpperCase())}
                    placeholder="B 1842 WKA"
                    className="h-9 rounded border-border bg-background font-mono text-sm font-bold uppercase tracking-wider text-white"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={searching}
                    className="h-8 w-fit font-mono text-[11px]"
                  >
                    {searching ? 'Mencari...' : 'CARI SESI'}
                  </Button>
                </form>
                <div className="flex flex-col gap-1">
                  <label className="block text-[11px] uppercase text-muted-foreground">
                    Klasifikasi Golongan
                  </label>
                  <select
                    value={manualClass}
                    onChange={(event) => setManualClass(event.target.value)}
                    className="rounded border border-park-border bg-background px-2 py-2 font-mono text-xs text-foreground focus:outline-none"
                  >
                    {MANUAL_CLASSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground">
                    Golongan manual hanya tampil di layar; tarif tetap dari rule server.
                  </span>
                </div>
              </div>
            )}

            {searchError && (
              <p className="font-mono text-xs text-park-error">{searchError.toUpperCase()}</p>
            )}

            {results && results.length > 1 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">
                  {results.length} sesi ditemukan — pilih salah satu:
                </span>
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSession(item)}
                    className="flex w-full items-center justify-between rounded border border-park-border bg-background px-3 py-2 text-left font-mono text-xs transition-colors hover:border-selection-blue hover:bg-selection-blue/20"
                  >
                    <span>
                      <span className="font-bold text-white">{item.ticketNumber}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {item.plateNumber} · {item.vehicleType} · {item.laneIn}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold text-white">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Masuk {formatDateTime(item.entryTime)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {results && results.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground">
                TIDAK ADA SESI YANG COCOK. PERIKSA NOMOR TIKET ATAU PLAT.
              </p>
            )}
            {!shift && (
              <p className="font-mono text-[11px] text-park-warning">
                ⚠ Shift belum dibuka — transaksi tercatat tanpa shift.
              </p>
            )}
          </div>

          {/* 2. Snapshot Kamera Masuk & Metadata ANPR OCR */}
          <div className="flex flex-none flex-col gap-2.5 rounded-lg border border-park-border bg-park-card p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-park-border pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg text-park-cyan">▣</span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Snapshot Kamera Masuk &amp; OCR ANPR
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-muted-foreground">CAM-IN-01</span>
                <span className="rounded bg-park-success/20 px-1.5 py-0.5 font-bold text-park-success">
                  CONFIDENCE: —
                </span>
              </div>
            </div>
            <div className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-5 relative flex h-28 items-center justify-center overflow-hidden rounded-md border border-park-border bg-background sm:col-span-4">
                <div className="text-center font-mono text-[11px] text-muted-foreground">
                  <span className="block text-2xl">▣</span>
                  KAMERA MASUK
                  <span className="block text-[10px] text-park-warning">
                    RTSP / ANPR belum terintegrasi
                  </span>
                </div>
                <div className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur">
                  CAM-IN-BARAT
                </div>
              </div>
              <div className="col-span-7 flex h-full flex-col justify-between gap-2 sm:col-span-8">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="block font-mono text-[10px] uppercase text-muted-foreground">
                      Plat Terdeteksi ANPR
                    </span>
                    {selected ? (
                      <span className="mt-0.5 inline-block rounded border border-park-border bg-background px-3 py-0.5 font-mono text-xl font-extrabold tracking-widest text-white sm:text-2xl">
                        {selected.plateNumber}
                      </span>
                    ) : (
                      <span className="mt-0.5 inline-block rounded border border-dashed border-border bg-background px-3 py-0.5 font-mono text-xl font-extrabold tracking-widest text-muted-foreground sm:text-2xl">
                        —
                      </span>
                    )}
                  </div>
                  <span className="rounded border border-park-border bg-park-card-subtle px-2 py-1 font-mono text-xs font-medium text-park-cyan">
                    {manualClass.split(' - ')[1] ?? selected?.vehicleType ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 font-mono text-xs text-muted-foreground">
                  <span>
                    Lane Masuk:{' '}
                    <strong className="font-semibold text-park-main">
                      {selected?.laneIn ?? '—'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className="flex items-center gap-1 text-[11px] text-park-blue underline transition-colors hover:text-park-cyan"
                  >
                    ✎ Koreksi Plat Manual [F4]
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Card Rincian Sesi Parkir & Breakdown Tarif */}
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 rounded-lg border border-park-border bg-park-card p-3 shadow-sm">
            <div>
              <div className="mb-2.5 flex items-center justify-between border-b border-park-border pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-park-blue">▦</span>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    Rincian Sesi Parkir &amp; Tarif
                  </span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-park-success">
                  <span className="size-1.5 rounded-full bg-park-success" />
                  {selected ? 'SESI VALID (SITE SERVER)' : 'MENUNGGU SESI'}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
                <div className="rounded border border-border/60 bg-park-card-subtle p-2">
                  <span className="block text-[10px] text-muted-foreground">NOMOR TIKET</span>
                  <span className="block truncate font-bold text-white">
                    {selected?.ticketNumber ?? '—'}
                  </span>
                </div>
                <div className="rounded border border-border/60 bg-park-card-subtle p-2">
                  <span className="block text-[10px] text-muted-foreground">WAKTU MASUK</span>
                  <span className="block text-park-main">
                    {selected ? formatDateTime(selected.entryTime) : '—'}
                  </span>
                </div>
                <div className="rounded border border-border/60 bg-park-card-subtle p-2">
                  <span className="block text-[10px] text-muted-foreground">WAKTU KELUAR</span>
                  <span className="block text-park-main">
                    {selected && selected.paymentStatus === 'PAID' ? 'Selesai' : '— (aktif)'}
                  </span>
                </div>
                <div className="rounded border border-selection-blue bg-selection-blue/40 p-2">
                  <span className="block font-mono text-[10px] font-semibold text-park-cyan">
                    TOTAL DURASI
                  </span>
                  <span className="block font-bold text-white">
                    {selected ? formatDuration(selected.durationMinutes) : '—'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="flex flex-col rounded border border-border/60 bg-background px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">Jam Pertama</span>
                  <span className="mt-0.5 text-sm font-bold text-white">
                    {selected ? formatCurrency(selected.amount) : '—'}
                  </span>
                </div>
                <div className="flex flex-col rounded border border-border/60 bg-background px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">Jam Tambahan</span>
                  <span className="mt-0.5 text-sm font-bold text-white">—</span>
                </div>
                <div className="flex flex-col rounded border border-border/60 bg-background px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">Asuransi / Jasa</span>
                  <span className="mt-0.5 text-sm font-bold text-white">—</span>
                </div>
              </div>
            </div>
            {/* 4. Big Banner Total Tagihan */}
            <div className="flex items-center justify-between rounded-lg border-2 border-selection-blue bg-background p-3 shadow-md sm:p-4">
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-park-cyan">
                  TOTAL TAGIHAN PARKIR
                </span>
                <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  Sesuai tarif flat per jam site server • tanpa denda
                </span>
              </div>
              <div className="text-right">
                <div className="font-mono text-3xl font-extrabold tracking-tight text-white tabular-nums sm:text-4xl">
                  {selected ? formatCurrency(selected.amount) : 'Rp 0'}
                </div>
                <div
                  className={cn(
                    'font-mono text-[11px] font-semibold tracking-wide',
                    selected?.paymentStatus === 'PAID' ? 'text-park-success' : 'text-park-warning'
                  )}
                >
                  {selected?.paymentStatus === 'PAID' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Metode Pembayaran & Kontrol Gate (5 Cols) ── */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-5">
          {/* 1. Transaction Status Header & Idempotency Badge */}
          <div className="flex flex-none flex-col gap-1.5 rounded-lg border border-park-border bg-park-card p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'size-3 rounded-full',
                    unpaid
                      ? 'animate-ping bg-park-warning'
                      : selected
                        ? 'bg-park-success'
                        : 'bg-muted-foreground'
                  )}
                />
                <div>
                  <span className="block font-mono text-[10px] uppercase text-muted-foreground">
                    Status Transaksi Gate
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs font-bold tracking-wide',
                      unpaid
                        ? 'text-park-warning'
                        : selected
                          ? 'text-park-success'
                          : 'text-muted-foreground'
                    )}
                  >
                    {unpaid
                      ? 'STATUS: MENUNGGU PEMBAYARAN (UNPAID)'
                      : selected
                        ? `STATUS: LUNAS (PAID)${paidTransaction ? ` · ${paidTransaction.method}` : ''}`
                        : 'STATUS: IDLE — TEMBAK TIKET DULU'}
                  </span>
                </div>
              </div>
              <span className="rounded border border-park-border bg-background px-2 py-0.5 font-mono text-[10px] font-bold text-park-cyan">
                {config?.gateName ? 'GATE EXIT' : 'GATE 02 EXIT'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-1 font-mono text-[10px] text-muted-foreground">
              <span>
                SESI:{' '}
                <strong className="font-semibold text-park-main">{selected?.id ?? '—'}</strong>
              </span>
              {paidTransaction && (
                <span>
                  TXN:{' '}
                  <strong className="font-semibold text-park-main">{paidTransaction.id}</strong>
                </span>
              )}
            </div>
          </div>

          {/* 2. Payment Method Switcher Tabs & Content Panels */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-park-border bg-park-card p-3 shadow-sm">
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
              {(
                [
                  { key: 'cash', label: 'Tunai / Cash [F5]', icon: '▣' },
                  { key: 'qr', label: 'QRIS Dinamis [F6]', icon: '▩' },
                  { key: 'emoney', label: 'E-Money Tap [F7]', icon: '◈' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  disabled={tab.key === 'qr' && (!canQr || qrBusy)}
                  onClick={() => {
                    if (tab.key === 'qr' && !qrIntent && unpaid) {
                      void handleCreateQr()
                      return
                    }
                    setPayTab(tab.key)
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded border px-1 py-2 transition-all active:scale-95 disabled:opacity-40',
                    payTab === tab.key
                      ? 'border-selection-blue bg-selection-blue font-bold text-white shadow-sm'
                      : 'border-park-border bg-park-card-subtle text-muted-foreground hover:bg-park-card hover:text-white'
                  )}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {payTab === 'cash' && (
              <div className="flex flex-1 flex-col justify-between gap-3">
                <div className="flex flex-col gap-2.5">
                  {cashError && <p className="font-mono text-xs text-park-error">{cashError}</p>}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="font-mono text-xs font-bold uppercase text-white">
                        Uang Tunai Diterima (Rp)
                      </label>
                      <span className="font-mono text-[11px] text-park-blue">Numpad / Enter</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-mono text-lg font-bold text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="cash"
                        type="number"
                        min={0}
                        step={1000}
                        value={cashReceived}
                        onChange={(event) => setCashReceived(event.target.value)}
                        placeholder="0"
                        disabled={!selected || !unpaid}
                        className="h-10 rounded border-border bg-background pl-12 pr-3 font-mono text-2xl font-bold text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block font-mono text-[11px] text-muted-foreground">
                      Pilihan Cepat Nominal:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-xs font-bold">
                      <button
                        type="button"
                        disabled={!selected}
                        onClick={() => selected && setCashReceived(String(selected.amount))}
                        className="rounded border border-park-border bg-background py-1.5 text-park-cyan transition-colors hover:bg-selection-blue active:scale-95 disabled:opacity-40"
                      >
                        Uang Pas
                      </button>
                      {[20000, 50000, 100000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCashReceived(String(preset))}
                          className="rounded border border-park-border bg-background py-1.5 text-white transition-colors hover:bg-selection-blue active:scale-95 tabular-nums"
                        >
                          {preset.toLocaleString('id-ID')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded border border-park-border bg-background p-3">
                    <div>
                      <span className="block font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        KEMBALIAN OPERATOR:
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Siapkan pecahan tunai
                      </span>
                    </div>
                    <div
                      className={cn(
                        'font-mono text-2xl font-extrabold tracking-tight tabular-nums',
                        change < 0 ? 'text-park-error' : 'text-park-success'
                      )}
                    >
                      {change < 0
                        ? `- Rp ${Math.abs(change).toLocaleString('id-ID')}`
                        : `Rp ${change.toLocaleString('id-ID')}`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCash()}
                  disabled={
                    !selected ||
                    !unpaid ||
                    cashBusy ||
                    !canCash ||
                    !cashReceived ||
                    Number(cashReceived) < (selected?.amount ?? 0)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded bg-park-cta py-3 font-mono text-sm font-bold tracking-wider text-white shadow-lg transition-all hover:bg-park-cta/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden>✓</span>
                  <span>{cashBusy ? 'MEMPROSES SERVER...' : 'TERIMA PEMBAYARAN CASH [ENTER]'}</span>
                </button>
              </div>
            )}

            {payTab === 'qr' && (
              <div className="flex flex-1 flex-col gap-2">
                {qrError && <p className="font-mono text-xs text-park-error">{qrError}</p>}
                {qrIntent ? (
                  <QrPaymentPanel
                    intentId={qrIntent.id}
                    canCancel={canCancel}
                    cancelling={qrCancelBusy}
                    onStatusChange={handleQrStatusChange}
                    onCancel={() => void handleCancelQr()}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border bg-background p-4 text-center font-mono text-xs text-muted-foreground">
                    {selected && unpaid
                      ? 'TEKAN TAB QRIS UNTUK MEMBUAT QR DINAMIS'
                      : 'PILIH SESI TERLEBIH DAHULU'}
                  </div>
                )}
              </div>
            )}

            {payTab === 'emoney' && (
              <div className="flex flex-1 items-center justify-between gap-2.5 font-mono">
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded border border-dashed border-border bg-background p-4 text-center">
                  <span className="animate-bounce text-4xl text-park-cyan">◈</span>
                  <span className="text-sm font-bold text-white">
                    TEMPELKAN KARTU E-MONEY / FLAZZ
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Mandiri e-Money • BCA Flazz • BNI TapCash • BRI Brizzi
                  </span>
                  <span className="rounded border border-park-border bg-park-tertiary px-2.5 py-1 text-[11px] text-park-warning">
                    SAM NFC READER (COM4) belum terintegrasi — pembayaran tap belum tersedia di
                    backend
                  </span>
                  <span className="font-mono text-[11px] text-park-cyan">&nbsp;</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Panel Kontrol Palang Pintu & Printer */}
          <div className="flex flex-none flex-col gap-2 rounded-lg border border-park-border bg-park-card p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-park-border pb-1 font-mono text-xs">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <span className="text-park-warning">▣</span> Kontrol Palang &amp; Terminal
              </span>
              <span className="text-muted-foreground">IO RELAY: PORT 4 (COM3)</span>
            </div>
            {gateResult && (
              <p
                className={cn(
                  'rounded border px-2 py-1.5 font-mono text-[11px]',
                  gateResult.status === 'SUCCESS'
                    ? 'border-park-success/50 bg-park-success/10 text-park-success'
                    : 'border-park-error/50 bg-park-error/10 text-park-error'
                )}
              >
                {gateResult.message}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleOpenGate()}
              disabled={gateBusy || !canGate || unpaid || !selected}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded border font-mono font-bold text-xs transition-all active:scale-[0.98] sm:text-sm',
                unpaid || !selected
                  ? 'cursor-not-allowed border-park-border bg-park-card-subtle py-3 text-muted-foreground'
                  : 'border-park-success/50 bg-park-success/20 py-3 text-park-success hover:bg-park-success hover:text-black'
              )}
            >
              <span aria-hidden>{unpaid || !selected ? '🔒' : '🔓'}</span>
              <span>
                {unpaid || !selected
                  ? 'BUKA PALANG PINTU [F9] (Terkunci: Menunggu Pembayaran Lunas)'
                  : gateBusy
                    ? 'Mengirim sinyal palang...'
                    : 'BUKA PALANG PINTU [F9] (Izin Terbit)'}
              </span>
            </button>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 rounded border border-park-border bg-background px-2 py-2 text-park-main transition-colors hover:bg-park-card-subtle hover:text-white active:scale-95"
              >
                <span className="text-park-cyan">▤</span>
                <span>Cetak Struk [F10]</span>
              </button>
              <button
                type="button"
                onClick={nextTransaction}
                className="flex items-center justify-center gap-1.5 rounded border border-park-border bg-background px-2 py-2 text-park-error transition-colors hover:border-park-error/50 hover:bg-park-error/20 active:scale-95"
              >
                <span aria-hidden>⟳</span>
                <span>Batal / Reset [ESC]</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setOverrideError(null)
                setOverrideOpen(true)
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-park-border bg-background py-1.5 font-mono text-xs font-medium text-park-warning transition-colors hover:border-park-warning/40 hover:bg-park-warning/20 active:scale-95"
            >
              <span aria-hidden>▣</span>
              <span>Override Supervisor [F11] • Otorisasi Darurat</span>
            </button>
            {gateSimulate !== 'none' && (
              <p className="text-center font-mono text-[10px] text-muted-foreground">
                Simulasi relay aktif: {gateSimulate}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* ═════ MODALS ═════ */}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SupervisorOverrideModal
        open={overrideOpen}
        busy={overrideBusy}
        error={overrideError}
        onClose={() => setOverrideOpen(false)}
        onAuthorize={(pin, reason) => void handleOverride(pin, reason)}
      />

      {/* ═════ BOTTOM FOOTER (Shortcuts Dock) ═════ */}
      <footer className="flex w-full flex-none flex-wrap items-center justify-between gap-2 border-t border-park-border bg-park-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <DockButton kbd="F1" label="Bantuan" onClick={() => setHelpOpen(true)} />
          <DockButton kbd="F2" label="Ganti Shift" onClick={() => navigate('/shift')} />
          <DockButton
            kbd="F3"
            label="Scan Tiket"
            variant={mode === 'scan' ? 'active' : 'default'}
            onClick={() => setMode('scan')}
          />
          <DockButton
            kbd="F4"
            label="Input Manual"
            variant={mode === 'manual' ? 'active' : 'default'}
            onClick={() => setMode('manual')}
          />
          <DockButton
            kbd="F5"
            label="Tunai"
            variant={payTab === 'cash' && unpaid ? 'active' : 'default'}
            onClick={() => selected && unpaid && setPayTab('cash')}
            disabled={!unpaid}
          />
          <DockButton
            kbd="F6"
            label="QRIS"
            variant={payTab === 'qr' && unpaid ? 'active' : 'default'}
            onClick={() => void handleCreateQr()}
            disabled={!unpaid || qrBusy || !canQr}
          />
          <DockButton
            kbd="F7"
            label="E-Money"
            variant={payTab === 'emoney' && unpaid ? 'active' : 'default'}
            onClick={() => selected && unpaid && setPayTab('emoney')}
            disabled={!unpaid}
          />
          <DockButton
            kbd="F9"
            label="Buka Palang"
            variant="success"
            onClick={() => void handleOpenGate()}
            disabled={gateBusy || !selected}
          />
          <DockButton kbd="F10" label="Cetak" onClick={handlePrint} />
          <DockButton
            kbd="F11"
            label="Override"
            variant="warning"
            onClick={() => {
              setOverrideError(null)
              setOverrideOpen(true)
            }}
          />
          <DockButton kbd="ESC" label="Batal / Tutup" variant="danger" onClick={nextTransaction} />
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-park-cyan">Session: {selected?.id ?? '—'}</span>
          <span className="text-border">|</span>
          <span>
            Audit Level:{' '}
            <strong className="text-white">
              {shift ? `Aktif ${shift.laneName}` : 'TANPA SHIFT'}
            </strong>
          </span>
        </div>
      </footer>
    </div>
  )
}
