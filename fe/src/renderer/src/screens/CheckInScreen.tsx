import type React from 'react'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { ParkingSession } from '@shared/types'
import { createSession, listSessions } from '../lib/server-api'
import { formatDateTime, formatDuration } from '../lib/format'
import { useShift } from '../context/ShiftContext'
import { useToast } from '@renderer/hooks/useToast'
import { useFKeyBindings } from '@renderer/hooks/useFKeyBindings'
import { DockButton } from '@renderer/components/park-pos'
import { MatrixBox, DetailLine, SectionHeader } from '@renderer/components/park-pos'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
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

const VEHICLES = ['Motor', 'Mobil', 'Truk', 'Bus']
const LANES = ['Masuk 1', 'Masuk 2', 'Masuk 3']

export function CheckInScreen(): React.JSX.Element {
  const { shift } = useShift()
  const toast = useToast()
  const [plate, setPlate] = useState('')
  const [vehicle, setVehicle] = useState('Mobil')
  const [lane, setLane] = useState(LANES[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticket, setTicket] = useState<ParkingSession | null>(null)
  const [qr, setQr] = useState<{ id: string; url: string } | null>(null)
  const [history, setHistory] = useState<ParkingSession[]>([])

  useEffect(() => {
    let active = true
    if (ticket) {
      void QRCode.toDataURL(
        JSON.stringify({ ticket: ticket.ticketNumber, plate: ticket.plateNumber }),
        {
          width: 256,
          margin: 1
        }
      ).then((url) => {
        if (active) setQr({ id: ticket.id, url })
      })
    }
    return () => {
      active = false
    }
  }, [ticket])

  useEffect(() => {
    let active = true
    void listSessions(50).then((result) => {
      if (!active) return
      if (result.ok) setHistory(result.data)
    })
    return () => {
      active = false
    }
  }, [ticket])

  const submit = async (event?: React.FormEvent): Promise<void> => {
    if (busy) return
    if (event) event.preventDefault()
    if (!plate.trim()) {
      setError('Nomor plat wajib diisi.')
      return
    }
    setBusy(true)
    setError(null)
    const result = await createSession({
      plateNumber: plate.trim(),
      vehicleType: vehicle,
      laneIn: lane
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setTicket(result.data)
    toast('Tiket terbit: ' + result.data.ticketNumber, 'success')
  }

  const nextVehicle = (): void => {
    setTicket(null)
    setPlate('')
    setVehicle('Mobil')
    setLane(LANES[0])
  }

  const refresh = (): void => {
    void listSessions(50).then((result) => {
      if (result.ok) setHistory(result.data)
    })
  }

  useFKeyBindings({
    f5: () => void submit(),
    escape: nextVehicle
  })

  return (
    <div className="flex min-h-[calc(100%-56px)] flex-col gap-3 font-mono">
      {/* ── Input workspace ── */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Gate Masuk · Terbitkan Tiket
            </h1>
            <p className="text-xs text-muted-foreground">
              Catat kendaraan yang baru datang dan terbitkan nomor tiket.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            <span>
              {shift ? `SHIFT AKTIF: ${shift.laneName.toUpperCase()}` : 'SHIFT TIDAK AKTIF'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {ticket ? (
        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-12">
          {/* LEFT */}
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-7">
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <SectionHeader
                icon="▦"
                title="Kendaraan Terdaftar"
                right={
                  <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> SESI VALID (SITE
                    SERVER)
                  </span>
                }
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-[10px] uppercase font-mono text-muted-foreground">
                    Nomor Tiket Terbit
                  </span>
                  <span className="mt-1 inline-block rounded border border-border bg-background px-3 py-0.5 font-mono text-2xl font-extrabold tracking-widest text-white">
                    {ticket.ticketNumber}
                  </span>
                </div>
                <span className="rounded border border-border bg-background px-2 py-1 font-mono text-xs font-medium text-cyan-400">
                  {ticket.vehicleType}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
                <MatrixBox label="PLAT NOMOR" value={ticket.plateNumber} highlight />
                <MatrixBox label="WAKTU MASUK" value={formatDateTime(ticket.entryTime)} />
                <MatrixBox label="LANE MASUK" value={ticket.laneIn} />
                <MatrixBox label="STATUS" value="Aktif · Belum dibayar" />
              </div>
              <div className="mt-2 border-t border-border/70 pt-2">
                <DetailLine label="Sesi ID" value={ticket.id} />
              </div>
            </div>

            <div className="mt-auto rounded-lg border-2 border-emerald-500/40 bg-background p-3 shadow-md sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                    Tiket Diterbitkan
                  </span>
                  <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    Saat keluar, proses pembayaran di menu Loket.
                  </span>
                </div>
                <Button
                  className="bg-emerald-500 font-mono text-xs font-bold text-black shadow-lg hover:bg-emerald-400"
                  onClick={nextVehicle}
                >
                  ▸ Input kendaraan berikutnya [ESC]
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT — QR */}
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-5">
            <div className="flex flex-1 flex-col items-center gap-2.5 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="flex w-full items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  <span aria-hidden className="text-cyan-400">
                    ▩
                  </span>
                  QR Tiket Masuk
                </span>
                <span className="rounded border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                  UNPAID
                </span>
              </div>
              <div className="rounded-xl border-4 border-white bg-white p-2.5 shadow-lg">
                <div className="flex size-52 items-center justify-center">
                  {qr?.id === ticket.id && qr.url ? (
                    <img src={qr.url} alt="QR tiket parkir" className="size-full" />
                  ) : (
                    <p className="font-mono text-xs text-neutral-500">Membuat QR...</p>
                  )}
                </div>
              </div>
              <p className="text-center font-sans text-[11px] text-muted-foreground">
                Tempel/serahkan QR ini pada kendaraan agar mudah dipindai saat keluar.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm">
          <SectionHeader icon="▚" title="Registrasi Kendaraan Masuk" />
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-1 block font-mono text-[11px] uppercase text-muted-foreground">
                  Nomor plat
                </span>
                <Input
                  id="plate"
                  value={plate}
                  onChange={(event) => setPlate(event.target.value.toUpperCase())}
                  placeholder="cth. B 1234 XYZ"
                  autoFocus
                  className="h-10 rounded border-border bg-background font-mono text-lg font-bold tracking-widest text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1 block font-mono text-[11px] uppercase text-muted-foreground">
                    Jenis kendaraan
                  </span>
                  <Select value={vehicle} onValueChange={(value) => value && setVehicle(value)}>
                    <SelectTrigger className="h-10 rounded border-border bg-background font-mono text-xs text-foreground">
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="mb-1 block font-mono text-[11px] uppercase text-muted-foreground">
                    Lane masuk
                  </span>
                  <Select value={lane} onValueChange={(value) => value && setLane(value)}>
                    <SelectTrigger className="h-10 rounded border-border bg-background font-mono text-xs text-foreground">
                      <SelectValue placeholder="Pilih lane" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              disabled={busy || !plate.trim()}
              className="bg-orange-500 py-6 font-mono text-sm font-bold tracking-wider text-white shadow-lg hover:bg-orange-600 disabled:opacity-40"
            >
              {busy ? 'Menerbitkan tiket...' : 'TERBITKAN TIKET MASUK [F5 / ENTER]'}
            </Button>
          </form>
        </div>
      )}

      {/* ── Riwayat ── */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <SectionHeader
          icon="≡"
          title="Arus Masuk Terakhir"
          right={<DockButton kbd="F5" label="Segarkan" onClick={refresh} />}
        />
        <div className="flex flex-col gap-1.5">
          {history.length === 0 && (
            <p className="py-6 text-center font-mono text-xs text-muted-foreground">
              Belum ada kendaraan masuk.
            </p>
          )}
          {history.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-4 rounded border border-border bg-background px-3 py-1.5 font-mono text-[11px]"
            >
              <span className="min-w-0 truncate">
                <strong className="font-bold text-white">{row.ticketNumber}</strong>
                <span className="text-muted-foreground">
                  {' '}
                  · {row.plateNumber} · {row.vehicleType} · {row.laneIn}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground">{formatDateTime(row.entryTime)}</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold">
                  {formatDuration(row.durationMinutes)}
                </span>
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 font-bold',
                    row.paymentStatus === 'PAID'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  )}
                >
                  {row.paymentStatus === 'PAID' ? 'LUNAS' : 'UNPAID'}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer dock ── */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 rounded-t-lg border-t border-border bg-card/80 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-1.5">
          <DockButton
            kbd="F5"
            label="Terbitkan Tiket"
            variant="warning"
            onClick={() => void submit()}
          />
          <DockButton kbd="ESC" label="Input berikutnya" variant="danger" onClick={nextVehicle} />
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          <span className="text-cyan-400">{ticket ? ticket.ticketNumber : 'Session: -'}</span>
          <span className="text-border">|</span>
          <span>
            Shift:{' '}
            <strong className="font-semibold text-foreground/90">
              {shift ? 'aktif' : 'tidak aktif'}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}
