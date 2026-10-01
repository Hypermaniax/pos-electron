import type React from 'react'
import { HeartPulseIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

interface LaneStatus {
  name: string
  detail: string
  status: 'ONLINE' | 'WARNING' | 'CONNECTED'
  statusColor: string
  dotColor: string
  animatePing?: boolean
}

const LANES: LaneStatus[] = [
  { name: 'Exit Lane 01 (Utama)', detail: 'PRINTER: OK • GATE: OK • COM3', status: 'ONLINE', statusColor: 'text-park-success', dotColor: 'bg-park-success' },
  { name: 'Exit Lane 02 (Otomatis)', detail: 'ANPR CAM: DIRTY LENS / BLUR', status: 'WARNING', statusColor: 'text-park-warning', dotColor: 'bg-park-warning', animatePing: true },
  { name: 'Entry Lane 01 (Manless)', detail: 'DISPENSER: OK • ROLLS: 88%', status: 'ONLINE', statusColor: 'text-park-success', dotColor: 'bg-park-success' },
  { name: 'Entry Lane 02 (Manless)', detail: 'DISPENSER: OK • ROLLS: 94%', status: 'ONLINE', statusColor: 'text-park-success', dotColor: 'bg-park-success' },
  { name: 'Central Server Sync', detail: 'SYNC-DELAY: 12ms • HTTPS SSL', status: 'CONNECTED', statusColor: 'text-park-cyan', dotColor: 'bg-park-success' }
]

export function DeviceStatus(): React.JSX.Element {
  return (
    <Card className="bg-park-primary shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <HeartPulseIcon className="size-5 text-secondary" />
          <CardTitle className="text-base">Status Jalur & Device</CardTitle>
        </div>
        <span className="size-2.5 rounded-full bg-park-success" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="-mt-1 text-xs text-park-muted">
          Kondisi komunikasi serial COM, kamera OCR/ANPR, barrier gate controller, dan central sync link.
        </p>
        <div className="mt-1 flex flex-col gap-2">
          {LANES.map((lane) => (
            <div key={lane.name} className="flex items-center justify-between rounded-lg bg-park-card p-3">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', lane.dotColor, lane.animatePing && 'animate-ping')} />
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-semibold text-white">{lane.name}</span>
                  <span className={cn('font-mono text-[10px]', lane.statusColor)}>{lane.detail}</span>
                </div>
              </div>
              <span className={cn('rounded bg-park-primary px-2 py-0.5 font-mono text-[10px] font-bold', lane.statusColor)}>
                {lane.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
