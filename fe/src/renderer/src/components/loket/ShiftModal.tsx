import { useState } from 'react'
import type { Shift, ShiftSummary } from '@shared/types'
import { Lock, Repeat } from 'lucide-react'
import { ParkModal } from '../park-pos/ParkModal'
import { formatCurrency } from '../../lib/format'
import { cn } from '@renderer/lib/utils'

type ShiftTab = 'operasional' | 'end'

export function ShiftModal({
  open,
  onClose,
  operatorName,
  shift,
  summary,
  onHandover,
  onEndShift
}: {
  open: boolean
  onClose: () => void
  operatorName: string
  shift: Shift | null
  summary: ShiftSummary | null
  onHandover: (nextNip: string) => void
  onEndShift: () => void
}): React.JSX.Element {
  const [tab, setTab] = useState<ShiftTab>('operasional')
  const [nextNip, setNextNip] = useState('OP-8820 (Agus W)')
  const [nextPin, setNextPin] = useState('')
  const [openingCash, setOpeningCash] = useState('Rp 200.000')

  const vehicleCount = summary ? summary.cashCount + summary.qrSuccessCount : null
  const cashTotal = summary ? summary.cashTotal : null

  return (
    <ParkModal
      open={open}
      onClose={onClose}
      icon="⇄"
      title="Ganti Shift & Tutup Sesi [F2]"
      subtitle="Serah Terima Laci Kasir & Laporan Z-Report"
      maxWidth="max-w-lg"
    >
      <div className="grid grid-cols-3 gap-2 rounded border border-border bg-background p-3 text-xs">
        <div>
          <span className="block text-[10px] text-muted-foreground">OPERATOR AKTIF</span>
          <span className="block truncate font-bold text-foreground" title={operatorName}>
            {operatorName}
          </span>
          <span className="text-[10px] text-cyan-400">
            {shift
              ? `Shift • ${new Date(shift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : 'Shift Pagi'}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-muted-foreground">TOTAL KENDARAAN</span>
          <span className="block font-bold text-foreground">
            {vehicleCount === null ? '-' : `${vehicleCount} Unit`}
          </span>
          <span className="text-[10px] text-emerald-400">
            {vehicleCount === null ? 'Belum ada data' : '100% Selesai'}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-muted-foreground">TOTAL KAS TUNAI</span>
          <span className="block text-sm font-bold text-emerald-400">
            {cashTotal === null ? '-' : formatCurrency(cashTotal)}
          </span>
          <span className="text-[10px] text-muted-foreground">Fisik di Laci</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded border border-border/60 bg-background p-1 text-xs">
        {(
          [
            { key: 'operasional', label: 'Opsi A: Serah Terima Operator' },
            { key: 'end', label: 'Opsi B: End Shift (Tutup Sesi)' }
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'cursor-pointer rounded py-1.5 transition-all',
              tab === item.key
                ? 'bg-primary/20 font-bold text-foreground'
                : 'font-medium text-muted-foreground hover:text-white'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'operasional' ? (
        <div className="space-y-2.5 text-xs">
          <div>
            <label htmlFor="shift-next-nip" className="mb-1 block text-[10px] uppercase text-muted-foreground">
              NIP Operator Pengganti
            </label>
            <input
              id="shift-next-nip"
              value={nextNip}
              onChange={(e) => setNextNip(e.target.value)}
              placeholder="Contoh: OP-8820 (Agus W)"
              className="w-full rounded border border-border bg-background px-3 py-1.5 font-mono text-foreground focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="shift-next-pin" className="mb-1 block text-[10px] uppercase text-muted-foreground">
                PIN Pengganti (4 Digit)
              </label>
              <input
                id="shift-next-pin"
                value={nextPin}
                onChange={(e) => setNextPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="****"
                type="password"
                maxLength={4}
                className="w-full rounded border border-border bg-background px-3 py-1.5 text-center font-mono tracking-widest text-foreground focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="shift-opening-cash" className="mb-1 block text-[10px] uppercase text-muted-foreground">
                Modal Awal Laci Kas
              </label>
              <input
                id="shift-opening-cash"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-1.5 font-mono text-foreground focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onHandover(nextNip.trim() || 'Operator Pengganti')}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-orange-500 py-2.5 font-mono text-xs font-bold text-white shadow transition-all hover:bg-orange-600 active:scale-95"
          >
            <Repeat className="size-4" aria-hidden />
            Konfirmasi Serah Terima Kasir
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          <p className="font-sans text-xs text-muted-foreground">
            Tutup sesi loket sepenuhnya, cetak Z-Report ringkasan harian, dan set status booth menjadi OFFLINE.
          </p>
          <div className="flex items-center justify-between rounded border border-border bg-background p-2.5 text-xs">
            <span className="text-muted-foreground">Cetak Z-Report ke Printer Epson:</span>
            <span className="font-mono font-bold text-emerald-400">AKTIF (AUTO-PRINT)</span>
          </div>
          <button
            type="button"
            onClick={onEndShift}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-red-500 py-2.5 font-mono text-xs font-bold text-white shadow transition-all hover:opacity-90 active:scale-95"
          >
            <Lock className="size-4" aria-hidden />
            Tutup Sesi &amp; Kunci Booth Offline
          </button>
        </div>
      )}

      <div className="flex justify-end border-t border-border pt-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded border border-border bg-background px-4 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card hover:text-white active:scale-95"
        >
          Batal [ESC]
        </button>
      </div>
    </ParkModal>
  )
}
