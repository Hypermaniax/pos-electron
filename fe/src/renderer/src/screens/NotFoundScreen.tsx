import type React from 'react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@renderer/components/ui/empty'

export function NotFoundScreen(): React.JSX.Element {
  return (
    <div className="flex min-h-full items-center justify-center bg-muted/40">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="default">
            <span className="text-3xl font-bold text-muted-foreground/40">404</span>
          </EmptyMedia>
          <EmptyTitle>Halaman tidak ditemukan</EmptyTitle>
          <EmptyDescription>
            Tautan yang Anda buka tidak tersedia pada aplikasi ini.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
