import type React from 'react'
import { useState } from 'react'
import { listTransactions } from '../lib/server-api'
import type { PaymentTransaction } from '@shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { formatCurrency, formatDateTime } from '../lib/format'
import { methodLabel } from '../mock/store'
import { cn } from '@renderer/lib/utils'

const STATUS_STYLE: Record<string, string> = {
  PAID: 'bg-park-success/20 text-park-success',
  UNPAID: 'bg-park-muted/20 text-park-muted',
  PENDING_QR: 'bg-park-warning/20 text-park-warning',
  PENDING_EMONEY: 'bg-park-warning/20 text-park-warning',
  FAILED: 'bg-park-error/20 text-park-error',
  EXPIRED: 'bg-orange-500/20 text-orange-400',
  CANCELLED: 'bg-park-muted/20 text-park-muted'
}

export function HistoryScreen(): React.JSX.Element {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(false)

  const load = async (): Promise<void> => {
    setLoading(true)
    const result = await listTransactions(null)
    setTransactions(result)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-park-main">Riwayat Transaksi</h1>
        <Button onClick={() => void load()} disabled={loading} variant="outline" className="border-park-border bg-park-tertiary text-park-main hover:bg-park-card">
          {loading ? 'Memuat...' : 'Muat Data'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-park-muted">Belum ada data. Klik "Muat Data" untuk mengambil dari server.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded border border-park-border bg-park-tertiary p-3">
                  <div className="space-y-0.5">
                    <p className="font-mono text-xs font-bold text-park-main">{tx.ticketNumber}</p>
                    <p className="font-mono text-[10px] text-park-muted">{tx.plateNumber} · {methodLabel(tx.method)}</p>
                    <p className="font-mono text-[10px] text-park-muted">{formatDateTime(tx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-park-main">{formatCurrency(tx.amount)}</p>
                    <Badge className={cn('border-transparent', STATUS_STYLE[tx.status] ?? 'bg-park-muted/20 text-park-muted')}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
