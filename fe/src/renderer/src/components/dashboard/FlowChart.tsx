import type React from 'react'
import { ActivityIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'

const HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']

const IN_DATA = [135, 110, 60, 30, 75, 45, 25, 70, 40, 95, 105]
const OUT_DATA = [145, 140, 120, 90, 100, 80, 55, 45, 35, 65, 70]

function buildPath(data: number[]): string {
  return data.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * 90},${y}`).join(' ')
}

function buildArea(data: number[]): string {
  const line = data.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * 90},${y}`).join(' ')
  return `${line} L900,150 L0,150 Z`
}

export function FlowChart(): React.JSX.Element {
  return (
    <Card className="bg-park-primary shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <ActivityIcon className="size-5 text-park-cyan" />
          <CardTitle className="text-base">Arus Kendaraan Masuk & Keluar Per Jam</CardTitle>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-park-card px-3 py-1 font-mono text-[10px]">
          <span className="flex items-center gap-1.5 text-white">
            <span className="size-2.5 rounded-sm bg-park-cyan" />
            Masuk (In)
          </span>
          <span className="flex items-center gap-1.5 text-white">
            <span className="size-2.5 rounded-sm bg-park-cta" />
            Keluar (Out)
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-park-muted">Throughput periodik operasional loket hari ini (06:00 - 15:00 WIB)</p>

        {/* SVG Chart */}
        <div className="relative mt-2 flex h-48 flex-col justify-end">
          <svg className="h-40 w-full overflow-visible" viewBox="0 0 900 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradIn" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradOut" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="30" x2="900" y2="30" stroke="#333338" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="0" y1="80" x2="900" y2="80" stroke="#333338" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="0" y1="130" x2="900" y2="130" stroke="#333338" strokeWidth="1" strokeDasharray="3,3" />

            {/* IN area & line */}
            <path d={buildArea(IN_DATA)} fill="url(#gradIn)" />
            <path d={buildPath(IN_DATA)} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

            {/* OUT area & line */}
            <path d={buildArea(OUT_DATA)} fill="url(#gradOut)" />
            <path d={buildPath(OUT_DATA)} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />

            {/* Peak indicators */}
            <circle cx="270" cy="30" r="4" fill="#38bdf8" className="animate-pulse" />
            <circle cx="540" cy="25" r="4" fill="#38bdf8" />
            <circle cx="720" cy="35" r="4" fill="#f97316" />
          </svg>

          {/* X Axis */}
          <div className="flex w-full justify-between pt-2 font-mono text-[10px] text-park-muted">
            {HOURS.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
        </div>

        {/* Micro metrics */}
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
          {[
            { label: 'Waktu Sibuk (Peak)', value: '11:00 - 12:30 WIB', color: 'text-white' },
            { label: 'Volume Terbesar', value: '184 Kendaraan/Jam', color: 'text-park-cyan' },
            { label: 'Kecepatan Palang', value: '1.8 Detik / Tap', color: 'text-park-success' },
            { label: 'Kendaraan Menginap', value: '14 Unit Aktif', color: 'text-park-warning' }
          ].map((m) => (
            <div key={m.label} className="flex flex-col rounded-lg bg-park-card p-2">
              <span className="text-[9px] text-park-muted">{m.label}</span>
              <span className={`mt-0.5 font-mono text-[11px] font-bold ${m.color}`}>{m.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
