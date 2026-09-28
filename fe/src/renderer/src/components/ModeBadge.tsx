import type React from 'react'
import { Badge } from '@renderer/components/ui/badge'

export function ModeBadge(): React.JSX.Element {
  return (
    <Badge
      variant="secondary"
      title="Frontend berjalan dengan data contoh lokal. Belum terhubung ke Site Server."
    >
      <span className="size-2 rounded-full bg-muted-foreground" />
      Mode Lokal · Data Contoh
    </Badge>
  )
}
