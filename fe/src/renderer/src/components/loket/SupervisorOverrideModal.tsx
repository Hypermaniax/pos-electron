import { useState } from 'react'
import type React from 'react'
import { ParkModal } from '../park-pos/ParkModal'
import { cn } from '@renderer/lib/utils'
import { Spinner } from '@renderer/components/ui/spinner'

const REASONS = [
  'Kendaraan Dinas / Operasional VIP',
  'Gangguan Hardware Tiket / Barcode Rusak',
  'Instruksi Lapangan Management',
  'Pemulihan Darurat Sistem'
]

export function SupervisorOverrideModal({
  open,
  busy,
  onClose,
  onAuthorize,
  error
}: {
  open: boolean
  busy: boolean
  onClose: () => void
  onAuthorize: (pin: string, reason: string) => void
  error: string | null
}): React.JSX.Element {
  const [pin, setPin] = useState('')
  const [reason, setReason] = useState(REASONS[0])

  const complete = pin.length === 6

  return (
    <ParkModal
      open={open}
      onClose={onClose}
      icon="⚑"
      iconClass="text-amber-400"
      title="Otorisasi Supervisor [F11]"
      maxWidth="max-w-md"
    >
      <p className="font-sans text-xs text-muted-foreground">
        Buka paksa palang tanpa verifikasi pembayaran kasir. Tindakan ini dicatat ke log audit
        database sentral.
      </p>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
          <span>PIN Supervisor (6 Digit)</span>
          <button
            type="button"
            onClick={() => setPin('')}
            className="cursor-pointer text-[10px] text-amber-400 hover:underline"
          >
            Clear
          </button>
        </div>
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="******"
          type="password"
          className="rounded border border-border bg-background py-1.5 text-center font-mono text-lg tracking-widest text-foreground focus:border-cyan-400 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-1 pt-1 font-mono text-xs font-bold">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === 'C') setPin('')
              else if (key === '⌫') setPin((prev) => prev.slice(0, -1))
              else setPin((prev) => (prev.length < 6 ? prev + key : prev))
            }}
            className={cn(
              'rounded border border-border bg-background py-2 transition-all active:scale-95',
              key === 'C'
                ? 'text-red-400 hover:bg-red-500/30'
                : 'text-foreground hover:bg-primary/20'
            )}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase text-muted-foreground">Alasan Override</span>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="cursor-pointer rounded border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none"
        >
          {REASONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          disabled={!complete || busy}
          onClick={() => onAuthorize(pin, reason)}
          className="flex flex-1 items-center justify-center gap-2 rounded bg-amber-500 py-2.5 text-xs font-bold shadow transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Spinner /> : null}
          Otorisasi & Buka Palang
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border bg-background px-4 py-2.5 text-xs text-muted-foreground transition-all hover:bg-card hover:text-white active:scale-95"
        >
          Batal [ESC]
        </button>
      </div>
    </ParkModal>
  )
}
