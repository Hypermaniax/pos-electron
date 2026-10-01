import type React from 'react'
import { CarIcon, ArrowLeftRightIcon, BanknoteIcon, WarehouseIcon } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

interface MetricCardProps {
  title: string
  icon: React.ReactNode
  iconColor: string
  children: React.ReactNode
  className?: string
}

function MetricCard({ title, icon, iconColor, children, className }: MetricCardProps): React.JSX.Element {
  return (
    <Card className={cn('bg-park-primary shadow-sm', className)}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-wider text-park-muted uppercase">{title}</span>
          </div>
          <div className={cn('rounded-lg bg-park-card p-2', iconColor)}>{icon}</div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export function MetricCards(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Okupansi */}
      <MetricCard
        title="Okupansi Parkir Real-Time"
        icon={<CarIcon className="size-5 text-park-warning" />}
        iconColor="text-park-warning"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-4xl font-bold text-white">482</span>
          <span className="font-mono text-sm text-park-muted">/ 600 Lot</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-park-main">Kapasitas Lapangan</span>
            <span className="font-semibold text-park-warning">80.3% Terisi</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded bg-park-card">
            <div className="h-full bg-park-success" style={{ width: '55%' }} />
            <div className="h-full bg-park-warning" style={{ width: '25.3%' }} />
          </div>
          <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-park-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-park-success" />
              Motor: <strong className="text-white">310</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-park-warning" />
              Mobil: <strong className="text-white">172</strong>
            </span>
          </div>
        </div>
      </MetricCard>

      {/* Transaksi */}
      <MetricCard
        title="Total Transaksi (Shift Pagi)"
        icon={<ArrowLeftRightIcon className="size-5 text-park-cyan" />}
        iconColor="text-park-cyan"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-4xl font-bold text-white">1,248</span>
          <span className="rounded bg-park-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-park-success">
            +14% vs kmrn
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-park-main">Flow Masuk / Keluar</span>
            <span className="text-park-cyan">698 IN / 550 OUT</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded bg-park-card">
            <div className="h-full bg-park-cyan" style={{ width: '56%' }} />
            <div className="h-full bg-park-blue" style={{ width: '44%' }} />
          </div>
          <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-park-muted">
            <span>
              Rata Durasi: <span className="font-medium text-white">2j 14m</span>
            </span>
            <span className="text-park-success">Aliran Lancar</span>
          </div>
        </div>
      </MetricCard>

      {/* Omzet */}
      <MetricCard
        title="Akumulasi Omzet Hari Ini"
        icon={<BanknoteIcon className="size-5 text-primary" />}
        iconColor="text-primary"
      >
        <div className="flex items-baseline">
          <span className="font-heading text-2xl font-bold tracking-tight text-white">Rp 34.850.000</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex h-2 w-full overflow-hidden rounded bg-park-card">
            <div className="h-full bg-park-success" style={{ width: '42%' }} />
            <div className="h-full bg-park-cyan" style={{ width: '38%' }} />
            <div className="h-full bg-park-blue" style={{ width: '20%' }} />
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[11px]">
            <div className="rounded bg-park-card py-0.5">
              <span className="block text-[9px] text-park-muted">CASH</span>
              <span className="font-semibold text-park-success">42%</span>
            </div>
            <div className="rounded bg-park-card py-0.5">
              <span className="block text-[9px] text-park-muted">QRIS</span>
              <span className="font-semibold text-park-cyan">38%</span>
            </div>
            <div className="rounded bg-park-card py-0.5">
              <span className="block text-[9px] text-park-muted">E-MONEY</span>
              <span className="font-semibold text-park-blue">20%</span>
            </div>
          </div>
        </div>
      </MetricCard>

      {/* Gerbang */}
      <MetricCard
        title="Status Gerbang Loket"
        icon={<WarehouseIcon className="size-5 text-park-warning" />}
        iconColor="text-park-warning"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-4xl font-bold text-park-success">5</span>
          <span className="font-mono text-sm text-white">/ 6 Ready</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between rounded bg-park-card px-2 py-1 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-park-main">
              <span className="size-1.5 animate-ping rounded-full bg-park-warning" />
              Gate Timur 02
            </span>
            <span className="font-bold text-park-warning">128ms LAT</span>
          </div>
          <div className="flex items-center justify-between pt-0.5 font-mono text-[11px] text-park-muted">
            <span className="flex items-center gap-1 text-park-success">
              <span className="size-1.5 rounded-full bg-park-success" />
              Gate Barat In/Out OK
            </span>
            <span>Palang Auto Active</span>
          </div>
        </div>
      </MetricCard>
    </div>
  )
}
