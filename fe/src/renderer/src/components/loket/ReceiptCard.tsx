import type React from 'react'
import type { PaymentTransaction } from '@shared/types'
import { methodLabel } from '../../mock/store'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { useToast } from '@renderer/hooks/useToast'
import { Button } from '@renderer/components/ui/button'

interface ReceiptCardProps {
  transaction: PaymentTransaction
  canReprint: boolean
}

export function ReceiptCard({ transaction, canReprint }: ReceiptCardProps): React.JSX.Element {
  const toast = useToast()
  const rows: Array<[string, string]> = [
    ['Nomor tiket', transaction.ticketNumber],
    ['Nomor kendaraan', transaction.plateNumber],
    ['Jenis kendaraan', transaction.vehicleType],
    ['Waktu masuk', '-'],
    ['Waktu bayar', formatDateTime(transaction.paidAt ?? transaction.createdAt)],
    ['Metode', methodLabel(transaction.method)],
    ['Operator', transaction.operatorName],
    ['Referensi', transaction.reference]
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-3 font-mono shadow-sm">
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <span aria-hidden className="text-cyan-400">
            ▤
          </span>
          Struk & Terminal Thermal
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 border-border bg-background px-2 font-mono text-[10px] font-bold text-cyan-300 hover:bg-card/80"
          disabled={!canReprint}
          onClick={() => {
            window.print()
            toast('Struk dikirim ke printer thermal.', 'success')
          }}
        >
          Cetak Ulang Struk
        </Button>
      </div>

      <div className="receipt-print mx-auto max-w-sm rounded-lg border border-dashed border-neutral-800 bg-background p-4">
        <p className="text-center font-mono text-sm font-bold text-foreground">POS PARKIR</p>
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Bukti Pembayaran Parkir · Gerbang Exit
        </p>
        <div className="my-2.5 border-t border-dashed border-neutral-800" />
        <dl className="flex flex-col gap-1">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-[11px]">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium text-foreground/90">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="my-2.5 border-t border-dashed border-neutral-800" />
        <div className="flex justify-between text-sm font-extrabold">
          <span>TOTAL</span>
          <span className="tabular-nums text-emerald-400">
            {formatCurrency(transaction.amount)}
          </span>
        </div>
        <div className="mt-2.5 border-t border-dashed border-neutral-800 pt-2 text-center text-[10px] text-muted-foreground">
          Terima kasih — simpan bukti ini atas, konfirmasi di palang keluar.
        </div>
      </div>
    </div>
  )
}
