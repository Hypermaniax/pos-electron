import type React from 'react'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { QrIntent } from '@shared/types'
import { getQrIntent } from '../../mock/api'
import { formatCountdown, formatCurrency } from '../../lib/format'
import { StatusBadge } from './StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { cn } from '@renderer/lib/utils'

interface QrPaymentPanelProps {
  intentId: string
  canCancel: boolean
  cancelling: boolean
  onStatusChange: (intent: QrIntent) => void
  onCancel: () => void
}

export function QrPaymentPanel({
  intentId,
  canCancel,
  cancelling,
  onStatusChange,
  onCancel
}: QrPaymentPanelProps): React.JSX.Element {
  const [intent, setIntent] = useState<QrIntent | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    void getQrIntent(intentId).then((result) => {
      if (active && result.ok) setIntent(result.data)
    })
    return () => {
      active = false
    }
  }, [intentId])

  useEffect(() => {
    if (!intent) return
    void QRCode.toDataURL(intent.qrString, { width: 288, margin: 1 }).then(setDataUrl)
  }, [intent])

  useEffect(() => {
    const timer = setInterval(async () => {
      const result = await getQrIntent(intentId)
      if (!result.ok) return
      setNow(Date.now())
      setIntent(result.data)
      onStatusChange(result.data)
    }, 1000)
    return () => clearInterval(timer)
  }, [intentId, onStatusChange])

  const remaining = intent
    ? Math.max(0, Math.floor((new Date(intent.expiresAt).getTime() - now) / 1000))
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm">Pembayaran QR</CardTitle>
          {intent && <StatusBadge status={intent.status} />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="flex size-72 items-center justify-center rounded-xl border bg-background p-3">
          {dataUrl ? (
            <img src={dataUrl} alt="QR pembayaran" className="size-full" />
          ) : (
            <Skeleton className="size-full" />
          )}
        </div>
        {intent && (
          <p className="text-sm text-muted-foreground">
            Sisa waktu{' '}
            <span className={cn('font-semibold', remaining <= 15 ? 'text-destructive' : 'text-foreground')}>
              {formatCountdown(remaining)}
            </span>
          </p>
        )}
        {intent && (
          <p className="text-sm text-muted-foreground">
            Total tagihan{' '}
            <span className="font-semibold text-foreground">{formatCurrency(intent.amount)}</span>
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Minta pelanggan memindai QR ini. Status akan diperbarui otomatis.
        </p>

        {intent?.status === 'PENDING_QR' && (
          <Button
            variant="destructive"
            onClick={onCancel}
            disabled={!canCancel || cancelling}
          >
            {cancelling ? 'Membatalkan...' : 'Batalkan QR'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
