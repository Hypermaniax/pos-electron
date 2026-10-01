import type React from 'react'
import { CloudDownloadIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { useState } from 'react'

export function DashboardHeader(): React.JSX.Element {
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleRefresh = (): void => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 750)
  }

  const handleDownload = (): void => {
    setDownloading(true)
    setTimeout(() => setDownloading(false), 1500)
  }

  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl bg-park-primary p-6 md:flex-row md:items-end">
      <div className="flex max-w-3xl flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[10px] tracking-widest uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-park-cyan" />
            Telemetri Operasional
          </Badge>
          <span className="font-mono text-xs text-park-muted">| HUB-WEST-GATEWAY-01</span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
          Ringkasan & Status Operasional Loket
        </h1>
        <p className="text-sm text-park-main">
          Ikhtisar okupansi lot, arus kendaraan masuk/keluar, pendapatan shift berjalan, dan pemantauan gate live.
        </p>
      </div>
      <div className="flex items-center gap-3 self-start md:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="font-mono text-xs"
        >
          {downloading ? (
            <>
              <CloudDownloadIcon className="size-3.5 text-park-success" />
              Mengunduh...
            </>
          ) : (
            <>
              <CloudDownloadIcon className="size-3.5" />
              Unduh Laporan Shift
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-park-cta font-mono text-xs hover:bg-park-cta/90"
        >
          <RefreshCwIcon className={refreshing ? 'size-3.5 animate-spin' : 'size-3.5'} />
          Refresh Data
        </Button>
      </div>
    </div>
  )
}
