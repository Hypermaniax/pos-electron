import type React from 'react'
import { useEffect, useState } from 'react'
import type { PaymentMethod, PaymentStatus, PaymentTransaction } from '@shared/types'
import { listTransactions, statusLabel } from '../mock/api'
import { useShift } from '../context/ShiftContext'
import { formatCurrency, formatDateTime } from '../lib/format'
import { Badge } from '@renderer/components/ui/badge'
import { Card } from '@renderer/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qr: 'QR',
  emoney: 'E-Money'
}

const STATUS_STYLE: Record<PaymentStatus, string> = {
  UNPAID: 'bg-muted text-muted-foreground',
  PENDING_QR: 'bg-amber-100 text-amber-700',
  PENDING_EMONEY: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-secondary text-secondary-foreground'
}

export function HistoryScreen(): React.JSX.Element {
  const { shift } = useShift()
  const [rows, setRows] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void listTransactions(shift?.id ?? null).then((data) => {
      if (!active) return
      setRows(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [shift?.id])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Riwayat transaksi</h1>
        <p className="text-sm text-muted-foreground">
          {shift
            ? `Transaksi pada shift aktif (${shift.openedByName}).`
            : 'Belum ada shift aktif. Menampilkan seluruh transaksi contoh.'}
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Tiket</TableHead>
              <TableHead>Plat</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Operator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                  Memuat transaksi...
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                  Belum ada transaksi.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell className="font-medium">{row.ticketNumber}</TableCell>
                  <TableCell>{row.plateNumber}</TableCell>
                  <TableCell>{METHOD_LABEL[row.method]}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('border-transparent', STATUS_STYLE[row.status])}
                    >
                      {statusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.operatorName}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
