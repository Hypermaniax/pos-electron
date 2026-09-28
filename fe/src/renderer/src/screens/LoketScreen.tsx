import type React from 'react'
import { useCallback, useState } from 'react'
import type { GateResult, ParkingSession, PaymentTransaction, QrIntent } from '@shared/types'
import {
  cancelQrIntent,
  createQrIntent,
  getLatestTransactionForSession,
  getSession,
  openGate,
  payCash,
  searchSessions
} from '../mock/api'
import { can, Permissions } from '../lib/permissions'
import { newKey } from '../lib/ids'
import { formatCurrency, formatDateTime, formatDuration } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useShift } from '../context/ShiftContext'
import { StatusBadge } from '../components/loket/StatusBadge'
import { QrPaymentPanel } from '../components/loket/QrPaymentPanel'
import { GatePanel } from '../components/loket/GatePanel'
import { ReceiptCard } from '../components/loket/ReceiptCard'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field, FieldLabel } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Separator } from '@renderer/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { cn } from '@renderer/lib/utils'

type SearchMode = 'manual' | 'scan'
type PaymentChoice = 'cash' | 'qr' | null

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export function LoketScreen(): React.JSX.Element {
  const { session } = useAuth()
  const { shift } = useShift()
  const operator = session?.operator

  const [mode, setMode] = useState<SearchMode>('manual')
  const [query, setQuery] = useState('')
  const [scanPayload, setScanPayload] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<ParkingSession[] | null>(null)

  const [selected, setSelected] = useState<ParkingSession | null>(null)
  const [choice, setChoice] = useState<PaymentChoice>(null)
  const [paidTransaction, setPaidTransaction] = useState<PaymentTransaction | null>(null)
  const [paidMessage, setPaidMessage] = useState<string | null>(null)

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

  const canCash = can(session, Permissions.PaymentCash)
  const canQr = can(session, Permissions.PaymentQr)
  const canCancel = can(session, Permissions.PaymentCancel)
  const canGate = can(session, Permissions.GateOpen)
  const canReprint = can(session, Permissions.ReceiptReprint)

  const resetGate = (target: ParkingSession | null): void => {
    setGateResult(null)
    setGateSimulate('none')
    setGateKey(target ? newKey(`gate_${target.id}`) : '')
  }

  const clearPaymentState = (target: ParkingSession | null): void => {
    setChoice(null)
    setCashReceived('')
    setCashError(null)
    setQrIntent(null)
    setQrError(null)
    setPaidTransaction(null)
    setPaidMessage(null)
    if (target) setCashKey(newKey(`cash_${target.id}`))
    resetGate(target)
  }

  const runSearch = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (searching) return
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
    setCashBusy(true)
    setCashError(null)
    const result = await payCash(selected.id, Number(cashReceived), cashKey, operator)
    setCashBusy(false)
    if (!result.ok) {
      setCashError(result.error.message)
      return
    }
    setPaidTransaction(result.data)
    setPaidMessage('Pembayaran tunai berhasil. Status tagihan lunas.')
    await refreshSelected()
  }

  const handleCreateQr = async (): Promise<void> => {
    if (!selected || !operator || qrBusy) return
    setQrBusy(true)
    setQrError(null)
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
    (intent: QrIntent): void => {
      setQrIntent(intent)
      if (intent.status === 'PAID') {
        setPaidTransaction(getLatestTransactionForSession(intent.sessionId))
        setPaidMessage('Pembayaran QR berhasil. Status tagihan lunas.')
        void refreshSelected()
      } else if (intent.status === 'CANCELLED') {
        setQrIntent(null)
        setPaidMessage('QR dibatalkan. Pelanggan dapat memilih metode lain.')
        void refreshSelected()
      } else if (intent.status === 'EXPIRED') {
        setQrIntent(null)
        setQrError('QR kedaluwarsa. Buat QR baru bila pelanggan masih ingin membayar.')
        void refreshSelected()
      }
    },
    [refreshSelected]
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
    setPaidMessage('QR dibatalkan oleh operator.')
    await refreshSelected()
  }

  const handleOpenGate = async (): Promise<void> => {
    if (!selected || gateBusy || !canGate) return
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

  const retryGate = (): void => {
    setGateKey(newKey(`gate_${selected?.id ?? 'x'}`))
    setGateResult(null)
  }

  const nextTransaction = (): void => {
    setSelected(null)
    setResults(null)
    setQuery('')
    setScanPayload('')
    setSearchError(null)
    setMode('manual')
    clearPaymentState(null)
  }

  const change = selected ? Number(cashReceived || 0) - selected.amount : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Loket</h1>
          <p className="text-sm text-muted-foreground">
            Cari tagihan, proses pembayaran, lalu buka palang.
          </p>
        </div>
        {!shift && (
          <Alert className="w-auto py-2">
            <AlertDescription>
              Shift belum dibuka. Transaksi akan tercatat tanpa shift.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {!selected && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-6">
            <Tabs
              value={mode}
              onValueChange={(value) => {
                setMode(value as SearchMode)
                setSearchError(null)
              }}
            >
              <TabsList>
                <TabsTrigger value="manual">Input manual</TabsTrigger>
                <TabsTrigger value="scan">Scan tiket</TabsTrigger>
              </TabsList>
            </Tabs>

            <form
              onSubmit={(event) => void runSearch(event)}
              className="flex flex-wrap items-end gap-3"
            >
              {mode === 'manual' ? (
                <Field className="min-w-64 flex-1">
                  <FieldLabel htmlFor="query">Nomor plat atau nomor tiket</FieldLabel>
                  <Input
                    id="query"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="cth. B 1234 XYZ atau TKT-20260928-0001"
                    autoFocus
                  />
                </Field>
              ) : (
                <Field className="min-w-64 flex-1">
                  <FieldLabel htmlFor="scan">Hasil pindai tiket</FieldLabel>
                  <Input
                    id="scan"
                    value={scanPayload}
                    onChange={(event) => setScanPayload(event.target.value)}
                    placeholder="cth. TKT-20260928-0001|B 1234 XYZ"
                    autoFocus
                  />
                </Field>
              )}
              <Button type="submit" disabled={searching}>
                {searching ? 'Mencari...' : 'Cari tagihan'}
              </Button>
            </form>

            {searchError && (
              <Alert variant="destructive">
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {results && !selected && (
        <Card>
          <CardContent className="py-6">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada sesi parkir yang cocok. Periksa kembali nomor tiket atau nomor plat.
              </p>
            ) : (
              <>
                <h2 className="text-sm font-semibold">{results.length} sesi ditemukan</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {results.map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      onClick={() => selectSession(item)}
                      className="h-auto w-full justify-between px-4 py-3"
                    >
                      <span className="flex flex-col items-start">
                        <span className="text-sm font-semibold">{item.ticketNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.plateNumber} · {item.vehicleType} · {item.laneIn}
                        </span>
                      </span>
                      <span className="flex flex-col items-end">
                        <span className="text-sm font-semibold">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Masuk {formatDateTime(item.entryTime)}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Nomor tiket
                    </p>
                    <p className="text-lg font-semibold">{selected.ticketNumber}</p>
                  </div>
                  <StatusBadge status={selected.paymentStatus} />
                </div>

                <div className="mt-4 flex flex-col">
                  <DetailRow label="Nomor kendaraan" value={selected.plateNumber} />
                  <Separator />
                  <DetailRow label="Jenis kendaraan" value={selected.vehicleType} />
                  <Separator />
                  <DetailRow label="Waktu masuk" value={formatDateTime(selected.entryTime)} />
                  <Separator />
                  <DetailRow label="Durasi" value={formatDuration(selected.durationMinutes)} />
                  <Separator />
                  <DetailRow label="Lane masuk" value={selected.laneIn} />
                  <Separator />
                  <DetailRow
                    label="Status sesi"
                    value={selected.sessionStatus === 'ACTIVE' ? 'Aktif' : 'Selesai'}
                  />
                </div>

                <div className="mt-4 rounded-lg bg-primary p-4 text-primary-foreground">
                  <p className="text-xs text-primary-foreground/70">Total tagihan</p>
                  <p className="text-3xl font-bold">{formatCurrency(selected.amount)}</p>
                </div>
              </CardContent>
            </Card>

            {selected.paymentStatus !== 'PAID' && !paidTransaction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metode pembayaran</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={choice === 'cash' ? 'default' : 'outline'}
                      onClick={() => {
                        setChoice('cash')
                        setQrIntent(null)
                      }}
                      disabled={!canCash}
                    >
                      Terima cash
                    </Button>
                    <Button
                      variant={choice === 'qr' ? 'default' : 'outline'}
                      onClick={() => setChoice('qr')}
                      disabled={!canQr}
                    >
                      Tampilkan QR
                    </Button>
                  </div>
                  {!canCash && !canQr && (
                    <p className="text-sm text-muted-foreground">
                      Anda tidak memiliki hak akses untuk memproses pembayaran.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {choice === 'cash' && !paidTransaction && selected.paymentStatus !== 'PAID' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pembayaran tunai</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {cashError && (
                    <Alert variant="destructive">
                      <AlertDescription>{cashError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="cash">Uang diterima</FieldLabel>
                      <Input
                        id="cash"
                        type="number"
                        min={0}
                        step={1000}
                        value={cashReceived}
                        onChange={(event) => setCashReceived(event.target.value)}
                        placeholder="0"
                        autoFocus
                      />
                    </Field>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium">Kembalian</p>
                      <p
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-lg font-semibold',
                          change < 0
                            ? 'border-destructive/40 bg-destructive/10 text-destructive'
                            : 'bg-muted'
                        )}
                      >
                        {formatCurrency(Math.max(0, change))}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Button
                      onClick={() => void handleCash()}
                      disabled={cashBusy || !cashReceived || Number(cashReceived) < selected.amount}
                    >
                      {cashBusy ? 'Memproses...' : 'Konfirmasi penerimaan cash'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {choice === 'qr' && selected.paymentStatus !== 'PAID' && !paidTransaction && (
              <div className="flex flex-col gap-3">
                {qrError && (
                  <Alert variant="destructive">
                    <AlertDescription>{qrError}</AlertDescription>
                  </Alert>
                )}
                {!qrIntent ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Pembayaran QR</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Buat QR pembayaran dari backend, lalu minta pelanggan memindainya.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => void handleCreateQr()} disabled={qrBusy || !canQr}>
                        {qrBusy ? 'Membuat QR...' : 'Tampilkan QR'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <QrPaymentPanel
                    intentId={qrIntent.id}
                    canCancel={canCancel}
                    cancelling={qrCancelBusy}
                    onStatusChange={handleQrStatusChange}
                    onCancel={() => void handleCancelQr()}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {paidMessage && (
              <Alert>
                <AlertDescription>{paidMessage}</AlertDescription>
              </Alert>
            )}

            {(paidTransaction || selected.paymentStatus === 'PAID') && (
              <>
                <GatePanel
                  key={selected.id}
                  result={gateResult}
                  canOpen={canGate && selected.paymentStatus === 'PAID'}
                  busy={gateBusy}
                  simulate={gateSimulate}
                  onSimulateChange={setGateSimulate}
                  onOpen={() => void handleOpenGate()}
                  onRetry={retryGate}
                />
                {paidTransaction ? (
                  <ReceiptCard transaction={paidTransaction} canReprint={canReprint} />
                ) : (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      Sesi ini sudah lunas sebelum shift berjalan. Bukti pembayaran tidak tersedia.
                    </CardContent>
                  </Card>
                )}
                <Button className="w-full" size="lg" onClick={nextTransaction}>
                  Transaksi berikutnya
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
