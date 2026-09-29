import type React from 'react'
import { useEffect, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { Switch } from '@renderer/components/ui/switch'
import { useConfig } from '../../context/ConfigContext'
import { formatTime } from '../../lib/format'
import { Kbd } from '../park-pos'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type ThemeMode = 'dark' | 'light' | 'auto'

const MODES: { id: ThemeMode; icon: string; label: string; desc: string }[] = [
  {
    id: 'dark',
    icon: '◐',
    label: 'Tema Gelap (Dark Mode)',
    desc: 'Direkomendasikan untuk ruang loket berkanopi redup, shift malam, serta mengurangi kelelahan visual operator saat transaksi panjang.'
  },
  {
    id: 'light',
    icon: '◑',
    label: 'Tema Terang (Light Mode)',
    desc: 'Kontras tinggi untuk loket drive-thru outdoor dengan paparan sinar matahari terik, menjaga visibilitas plat nomor dan nominal transaksi.'
  },
  {
    id: 'auto',
    icon: '⏱',
    label: 'Sinkronisasi Waktu Otomatis',
    desc: ''
  }
]

export function ThemeSection(): React.JSX.Element {
  const toast = useToast()
  const { config } = useConfig()
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('pos-theme') as ThemeMode) ?? 'auto'
  )
  const [fade, setFade] = useState(true)
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    const tick = (): void => setTime(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const select = (next: ThemeMode): void => {
    setMode(next)
    localStorage.setItem('pos-theme', next)
    if (next === 'dark') toast('Mode Tema Gelap Dipilih (Manual)', 'info')
    if (next === 'light') toast('Mode Tema Terang Dipilih (Manual)', 'info')
    if (next === 'auto') toast('Sinkronisasi Waktu Otomatis Aktif (06:00 - 18:00 WIB)', 'success')
  }

  const hour = time ? time.getHours() : 12
  const autoIsLight = hour >= 6 && hour < 18
  const effectiveLabel =
    mode === 'auto'
      ? autoIsLight
        ? 'TEMA TERANG'
        : 'TEMA GELAP'
      : mode === 'dark'
        ? 'TEMA GELAP'
        : 'TEMA TERANG'
  const dayProgress =
    time === null ? 70 : Math.round(((hour * 60 + time.getMinutes() - 360) / 720) * 100)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-background text-2xl text-orange-500">
            ⚙
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                Modul Konsol 07 &amp; 08
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                Live Runtime
              </span>
            </div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Preferensi Tampilan &amp; Pusat Bantuan [F1]
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <span className="uppercase tracking-wider">Hotkey:</span>
            <span className="flex items-center gap-2 text-foreground">
              <Kbd label="F1" color="accent" /> Bantuan <span className="text-border">•</span>{' '}
              <Kbd label="F11" color="warning" /> Emergency
            </span>
          </div>
          <Button
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 font-mono text-[11px] text-foreground hover:bg-sky-500/20"
            onClick={() =>
              toast(
                'Diagnostik jaringan tersedia pada tab "Ping Perangkat" (menunggu slice berikutnya).',
                'info'
              )
            }
          >
            ⏤ Cek Jaringan
          </Button>
        </div>
      </div>

      {/* Bagian 1 */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 font-heading text-base font-semibold text-foreground">
          <span className="size-2 rounded-full bg-orange-500" /> Bagian 1: Pengaturan Tema &amp;
          Visual Workstation
        </h2>
        <span className="rounded border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          LOKET ID: {(config?.laneName ?? 'BARAT-BOOTH-01').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {MODES.map((item) => {
          const selected = mode === item.id
          const isAuto = item.id === 'auto'
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => select(item.id)}
                className={cn(
                  'group relative flex h-full w-full flex-col justify-between rounded-xl border p-5 text-left shadow-sm transition-all duration-200',
                  selected && isAuto
                    ? 'border-2 border-sky-500/60 shadow-lg'
                    : selected
                      ? 'border-cyan-500/50 bg-background'
                      : 'border-border/60 hover:border-sky-500/50'
                )}
              >
                {selected && isAuto && (
                  <span className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-black shadow-sm">
                    ★ AKTIF BERJALAN
                  </span>
                )}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex size-9 items-center justify-center rounded-lg border border-border bg-background',
                          item.id === 'dark' && 'text-sky-400',
                          item.id === 'light' && 'text-amber-400',
                          item.id === 'auto' && 'text-sky-400'
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="text-base font-semibold text-foreground">{item.label}</span>
                    </div>
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full border',
                        selected ? 'border-sky-500 bg-sky-500' : 'border-border bg-background'
                      )}
                    >
                      {selected && <span className="text-[12px] font-bold text-black">✓</span>}
                    </span>
                  </div>
                  {isAuto ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">06:00 - 18:00 WIB</span>
                        <span className="flex items-center gap-1.5 font-medium text-amber-400">
                          ☀ Terang (Light)
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-2">
                        <span className="text-muted-foreground">18:00 - 06:00 WIB</span>
                        <span className="flex items-center gap-1.5 font-medium text-sky-400">
                          ☾ Gelap (Dark)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                  )}
                </div>
                {isAuto && (
                  <div className="mt-4 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Status saat ini:</span>
                      <span className="font-semibold text-amber-400">
                        {effectiveLabel} ({time ? `${formatTime(time).slice(0, 5)} WIB` : '--:--'})
                      </span>
                    </div>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-input">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{ width: `${Math.min(100, Math.max(0, dayProgress))}%` }}
                      />
                    </div>
                    <span className="self-end text-[11px] text-cyan-400">
                      {autoIsLight ? 'Beralih ke Gelap' : 'Beralih ke Terang'} pada 18:00 / 06:00
                      WIB
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Preferensi disimpan lokal — aplikasi masih memakai tema gelap tetap (token
                      light belum tersedia).
                    </span>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Fade control */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-cyan-400">
            ◔
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Transisi Halus Otomatis (Fade Transition Engine)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Mencegah lonjakan kontras seketika saat rotasi shift fajar/senja melalui interpolasi
              warna berangsur.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[11px]">
            <span className="text-muted-foreground">DURASI FADE:</span>
            <span className="font-semibold text-foreground">45 DETIK</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={fade} onCheckedChange={(next) => setFade(Boolean(next))} />
            <span
              className={cn(
                'text-[11px] font-semibold',
                fade ? 'text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {fade ? 'AKTIF' : 'NON-AKTIF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
