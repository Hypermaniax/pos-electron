import type React from 'react'
import type { PaymentTransaction } from '@shared/types'
import { methodLabel } from '../../mock/store'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Separator } from '@renderer/components/ui/separator'

interface ReceiptCardProps {
  transaction: PaymentTransaction
  canReprint: boolean
}

export function ReceiptCard({ transaction, canReprint }: ReceiptCardProps): React.JSX.Element {
  const rows: Array<[string, string]> = [
    ['Nomor tiket', transaction.ticketNumber],
    ['Nomor kendaraan', transaction.plateNumber],
    ['Jenis kendaraan', transaction.vehicleType],
    ['Waktu masuk', '-'],
    ['Waktu bayar', formatDateTime(transaction.paidAt ?? transaction.createdAt)],
    ['Metode', methodLabel(transaction.method)],
    ['Total', formatCurrency(transaction.amount)],
    ['Operator', transaction.operatorName],
    ['Referensi', transaction.reference]
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm">Bukti pembayaran</CardTitle>
          <Button
            variant="outline"
            disabled={!canReprint}
            onClick={() => window.print()}
          >
            Cetak bukti
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="receipt-print mx-auto max-w-sm rounded-lg border border-dashed p-5">
          <p className="text-center text-sm font-bold">POS PARKIR</p>
          <p className="text-center text-xs text-muted-foreground">Bukti pembayaran parkir</p>
          <Separator className="my-3 border-dashed" />
          <dl className="flex flex-col gap-1.5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <Separator className="my-3 border-dashed" />
          <p className="text-center text-xs text-muted-foreground">Terima kasih</p>
        </div>
      </CardContent>
    </Card>
  )
}
