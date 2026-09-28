import type React from 'react'
import type { PaymentStatus } from '@shared/types'
import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'
import { statusLabel } from '../../mock/api'

const STYLE: Record<PaymentStatus, string> = {
  UNPAID: 'bg-muted text-muted-foreground',
  PENDING_QR: 'bg-amber-100 text-amber-700',
  PENDING_EMONEY: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-secondary text-secondary-foreground'
}

export function StatusBadge({ status }: { status: PaymentStatus }): React.JSX.Element {
  return (
    <Badge variant="outline" className={cn('border-transparent', STYLE[status])}>
      {statusLabel(status)}
    </Badge>
  )
}
