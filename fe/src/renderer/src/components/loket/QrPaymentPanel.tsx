import type React from 'react'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { QrIntent } from '@shared/types'
import { getQrIntent, simulateQrPaid } from '../../lib/server-api'
import { formatCountdown, formatCurrency } from '../../lib/format'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { cn } from '@renderer/lib/utils'

interface QrPaymentPanelProps {
  intentId: string
  canCancel: boolean
  cancelling: boolean
  onStatusChange: (intent: QrIntent) => void
  onCancel: () => void
}

function statusChip(status: QrIntent['status']): React.JSX.Element {
  const map: Partial<Record<QrIntent['status'], string>> = {
    PENDING_QR: 'border-amber-500/50 bg-amber-500/15 text-amber-400',
    PAID: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400',
    CANCELLED: 'border-border bg-background text-muted-foreground',
    EXPIRED: 'border-red-500/50 bg-red-500/15 text-red-400'
  }
  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold',
        map[status] ?? map.CANCELLED
      )}
    >
      {status}
    </span>
  )
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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          <span aria-hidden className="text-cyan-400">
            ▩
          </span>
          QRIS Dinamis
        </span>
        {intent && statusChip(intent.status)}
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <div className="rounded-xl border-4 border-white bg-white p-2.5 shadow-lg">
          <div className="flex size-56 items-center justify-center">
            {dataUrl ? (
              <img src={dataUrl} alt="QR pembayaran" className="size-full" />
            ) : (
              <Skeleton className="size-full" />
            )}
          </div>
        </div>

        {intent && (
          <div className="flex w-full items-center justify-between rounded border border-border bg-background p-2.5">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Countdown Pembayaran
              </span>
              <span
                className={cn(
                  'font-mono text-xl font-bold tabular-nums',
                  remaining <= 15 ? 'text-red-400' : 'text-cyan-400'
                )}
              >
                {formatCountdown(remaining)}
              </span>
            </div>
            <div className="text-right">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Tagihan
              </span>
              <span className="font-mono text-lg font-bold text-foreground">
                {formatCurrency(intent.amount)}
              </span>
            </div>
          </div>
        )}

        <p className="text-center font-sans text-[11px] text-muted-foreground">
          Minta pelanggan memindai QR. Status diperbarui otomatis 1×/detik.
        </p>

        {intent?.status === 'PENDING_QR' && (
          <div className="flex w-full gap-2">
            <Button
              variant="destructive"
              className="flex-1 font-mono text-xs"
              onClick={onCancel}
              disabled={!canCancel || cancelling}
            >
              {cancelling ? 'Membatalkan...' : 'Batalkan QR'}
            </Button>
            <Button
              variant="secondary"
              className="flex-1 font-mono text-xs"
              onClick={() => {
                void simulateQrPaid(intentId).then((result) => {
                  if (result.ok) onStatusChange(result.data)
                })
              }}
            >
              [DEV] Simulasi Sukses
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
