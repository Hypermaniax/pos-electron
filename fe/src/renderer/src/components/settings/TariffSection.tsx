import type React from 'react'
import { useMemo, useState } from 'react'
import { ParkModal } from '../park-pos/ParkModal'
import { calculateAmount } from '../../lib/tariff-preview'
import { formatCurrency } from '../../lib/format'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { cn } from '@renderer/lib/utils'

const GROUPS = [
  {
    id: '1',
    name: 'Golongan I',
    detail: 'Sepeda Motor < 250cc',
    rates: { first: 2000, next: 2000, max: null, fine: null }
  },
  {
    id: '2',
    name: 'Golongan II',
    detail: 'Mobil / Sedan / SUV',
    rates: { first: 3000, next: 3000, max: null, fine: null }
  },
  {
    id: '3',
    name: 'Golongan III+',
    detail: 'Truk / Bus / Box R6+',
    rates: { first: 5000, next: 5000, max: null, fine: null }
  }
]

interface SimInput {
  groupId: string
  hours: number
  minutes: number
}

const CeilBadge = (): React.JSX.Element => (
  <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-400">
    CEIL RULE
  </span>
)

export function TariffSection(): React.JSX.Element {
  const [simOpen, setSimOpen] = useState(false)
  const [sim, setSim] = useState<SimInput>({ groupId: '2', hours: 3, minutes: 15 })
  const [rounding, setRounding] = useState('60')
  const [toggles, setToggles] = useState({ dropoff: false, weekend: false, insurance: false })

  const simResult = useMemo(
    () => calculateAmount(Number(sim.groupId), sim.hours, sim.minutes, rounding),
    [sim.groupId, sim.hours, sim.minutes, rounding]
  )

  return (
    <div className="flex flex-col gap-3">
      {/* ── Header ── */}
      <div className="flex flex-col justify-between gap-3 pt-1 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-400">
              MODUL KONFIGURASI PUSAT • REV 2025.04
            </span>
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] text-muted-foreground">LIVE SYNC READY</span>
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Pengaturan Tarif &amp; Kebijakan Parkir
          </h1>
          <p className="max-w-3xl font-sans text-xs text-muted-foreground">
            Kelola struktur matriks tarif berjenjang, penalti denda tiket hilang, grace period, dan
            aturan pembulatan durasi operasional seluruh gardu.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button
            variant="outline"
            className="border-border bg-background font-mono text-[11px] uppercase hover:bg-muted/50"
            onClick={() => setSimOpen(true)}
          >
            Simulasi Hitung Tarif
          </Button>
          <Button
            className="bg-orange-500 font-mono text-[11px] font-bold uppercase text-white shadow-md hover:bg-orange-600"
            disabled
            title="Backend belum menyediakan endpoint CRUD tarif"
          >
            Simpan Perubahan Tarif
          </Button>
        </div>
      </div>

      {/* ── Status Skema ── */}
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded border border-border bg-background font-mono text-lg font-bold text-emerald-400">
            ✓
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span>STATUS SKEMA TARIF OPERASIONAL</span>
              <span className="rounded bg-background px-1.5 py-0.5 font-semibold text-emerald-400">
                READ-ONLY
              </span>
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
              Aktif — kalkulasi flat/jam dari server
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col text-left md:text-right">
            <span className="font-mono text-[10px] text-muted-foreground">SUMBER TRUTH</span>
            <span className="font-mono text-xs font-bold tracking-wider text-cyan-400">
              server/domain/tariff.ts
            </span>
          </div>
          <span className="hidden h-8 w-px bg-border md:block" />
          <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-muted-foreground">SYNC STATUS</span>
              <span className="font-mono text-xs text-foreground">
                Kalkulasi kasir memakai rule ini
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Matriks Tarif ── */}
      <div className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-border bg-background/60 p-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-cyan-400">▦</span>
            <h2 className="font-heading text-sm font-bold text-foreground">
              Matriks Tarif Golongan Kendaraan
            </h2>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            3 GOLONGAN TERDEFINISI • MODE LIHAT SAJA
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left font-mono text-xs">
            <thead className="bg-black/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Golongan Kendaraan</th>
                <th className="px-3 py-3 text-right">Jam Pertama</th>
                <th className="px-3 py-3 text-right">Per Jam Berikutnya</th>
                <th className="px-3 py-3 text-right">Maksimal / 24 Jam</th>
                <th className="px-3 py-3 text-right">Denda Tiket Hilang</th>
                <th className="px-3 py-3 text-center">Grace Period</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {GROUPS.map((group, index) => (
                <tr
                  key={group.id}
                  className={cn(
                    'transition-colors hover:bg-background',
                    index % 2 === 0 ? 'bg-card' : 'bg-background/40'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg text-cyan-400">◆</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{group.name}</span>
                        <span className="text-[10px] text-muted-foreground">{group.detail}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-block rounded bg-background px-2 py-1 text-right font-bold text-foreground">
                      {formatCurrency(group.rates.first)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-block rounded bg-background px-2 py-1 text-right font-bold text-foreground">
                      {formatCurrency(group.rates.next)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-muted-foreground">—</td>
                  <td className="px-3 py-3 text-right font-bold text-muted-foreground">—</td>
                  <td className="px-3 py-3 text-center">
                    <span className="rounded border border-border bg-background px-2 py-1 text-cyan-400">
                      Tidak diterapkan
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-semibold tracking-wider text-emerald-400">
                      AKTIF
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-start justify-between gap-1 bg-black/40 px-4 py-2 font-mono text-[11px] text-muted-foreground sm:flex-row sm:items-center">
          <span className="flex items-center gap-2">
            <span className="text-cyan-400">ⓘ</span>
            <span>
              Backend belum menyediakan endpoint CRUD tarif — nilai diambil dari rule kalkulasi
              server dan belum mendukung tarif berjenjang/maksimal/denda.
            </span>
          </span>
          <span className="font-semibold text-cyan-400">VALIDATION RULE: STRICT NON-ZERO</span>
        </div>
      </div>

      {/* ── Kebijakan Tambahan ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
            <span className="text-cyan-400">⌄</span> Pengaturan Kebijakan Tambahan
          </h2>
          <span className="font-mono text-[11px] text-muted-foreground">
            PARAMETER BELUM DIDUKUNG BACKEND
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded border border-border bg-background text-cyan-400">
                  ◷
                </span>
                <SwitchPreview
                  checked={toggles.dropoff}
                  onChange={(next) => setToggles((prev) => ({ ...prev, dropoff: next }))}
                />
              </div>
              <div>
                <h3 className="font-sans text-sm font-semibold text-foreground">Drop-off Gratis</h3>
                <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                  10 menit pertama bebas biaya keluar gardu.
                </p>
              </div>
            </div>
            <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between rounded-b-lg border-t border-border bg-background/60 px-4 py-2 font-mono text-[11px]">
              <span className="text-muted-foreground">Toleransi Barrier:</span>
              <span className="font-semibold text-muted-foreground">belum didukung</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded border border-border bg-background text-amber-400">
                  ☼
                </span>
                <SwitchPreview
                  checked={toggles.weekend}
                  onChange={(next) => setToggles((prev) => ({ ...prev, weekend: next }))}
                />
              </div>
              <div>
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  Tarif Weekend &amp; Hari Libur
                </h3>
                <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                  Surcharge biaya untuk hari libur nasional.
                </p>
              </div>
            </div>
            <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between rounded-b-lg border-t border-border bg-background/60 px-4 py-2 font-mono text-[11px]">
              <span className="text-muted-foreground">Surcharge Dinamis:</span>
              <span className="font-semibold text-muted-foreground">belum didukung</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded border border-border bg-background text-cyan-400">
                  ⏱
                </span>
                <CeilBadge />
              </div>
              <div>
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  Kebijakan Pembulatan Waktu
                </h3>
                <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                  Format pembulatan durasi kalkulasi kasir server.
                </p>
              </div>
              <div className="mt-1 flex items-center gap-3 font-mono text-[11px]">
                {[
                  { value: '30', label: '30 Menit' },
                  { value: '60', label: '60 Menit Penuh' }
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-1.5 text-muted-foreground"
                  >
                    <input
                      type="radio"
                      name="rounding_unit"
                      checked={rounding === option.value}
                      onChange={() => setRounding(option.value)}
                      className="accent-orange-500"
                    />
                    <span className={rounding === option.value ? 'text-foreground' : undefined}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between rounded-b-lg border-t border-border bg-background/60 px-4 py-2 font-mono text-[11px]">
              <span className="text-muted-foreground">Aturan Matematis:</span>
              <span className="font-mono font-semibold text-foreground">
                Strict Ceil (Pukul Atas)
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded border border-border bg-background text-emerald-400">
                  ✚
                </span>
                <SwitchPreview
                  checked={toggles.insurance}
                  onChange={(next) => setToggles((prev) => ({ ...prev, insurance: next }))}
                />
              </div>
              <div>
                <h3 className="font-sans text-sm font-semibold text-foreground">Premi Asuransi</h3>
                <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                  Kompensasi pertanggungan kendaraan parkir.
                </p>
              </div>
            </div>
            <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between rounded-b-lg border-t border-border bg-background/60 px-4 py-2 font-mono text-[11px]">
              <span className="text-muted-foreground">Besaran Nominal:</span>
              <span className="font-semibold text-muted-foreground">belum didukung</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Audit trail ── */}
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-background p-3 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-cyan-400">
            ⇄
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              OPERATIONAL AUDIT TRAIL
            </span>
            <span className="font-mono text-xs text-foreground">
              Skema tarif bersifat kode sumber server — perubahan lewat konfigurasi runtime belum
              tersedia.
            </span>
          </div>
        </div>
        <span className="flex w-fit items-center gap-1.5 rounded border border-border bg-card px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
          CRUD TARIF MENUNGGU ENDPOINT BACKEND
        </span>
      </div>

      {/* ── Simulasi Modal ── */}
      <ParkModal
        open={simOpen}
        icon="Σ"
        title="Simulasi Hitung Biaya Parkir"
        onClose={() => setSimOpen(false)}
      >
        <div className="flex flex-col gap-2.5">
          <p className="font-sans text-[11px] text-muted-foreground">
            Uji coba validasi perhitungan sesuai rule kalkulasi server saat ini (flat per jam,
            strict ceil — belum menerapkan grace period/surcharge/asuransi).
          </p>
          <div className="flex flex-col gap-2.5 rounded border border-border bg-background p-3">
            <label className="flex flex-col gap-1 font-mono text-[10px] uppercase text-muted-foreground">
              GOLONGAN KENDARAAN
              <Select
                value={sim.groupId}
                onValueChange={(value) => value && setSim({ ...sim, groupId: value })}
              >
                <SelectTrigger className="rounded border-border bg-card font-mono text-xs text-foreground">
                  <SelectValue placeholder="Pilih golongan" />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} — {group.detail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 font-mono text-[10px] uppercase text-muted-foreground">
                DURASI PARKIR (JAM)
                <Input
                  type="number"
                  min={0}
                  max={72}
                  value={sim.hours}
                  onChange={(event) => setSim({ ...sim, hours: Number(event.target.value) })}
                  className="h-9 rounded border-border bg-card font-mono text-xs text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-[10px] uppercase text-muted-foreground">
                TAMBAHAN MENIT
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={sim.minutes}
                  onChange={(event) => setSim({ ...sim, minutes: Number(event.target.value) })}
                  className="h-9 rounded border-border bg-card font-mono text-xs text-foreground"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4 font-mono text-[11px] text-muted-foreground">
              <label className="flex cursor-not-allowed items-center gap-1.5 opacity-50">
                <input type="checkbox" disabled /> Hitung Hari Libur (+10%)
              </label>
              <label className="flex cursor-not-allowed items-center gap-1.5 opacity-50">
                <input type="checkbox" disabled /> + Asuransi Rp 500
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded border border-amber-500/40 bg-amber-500/5 p-3 font-mono">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>HASIL ESTIMASI BILLING POS:</span>
              <span className="font-medium text-cyan-400">{simResult.breakdown}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-heading text-sm font-bold text-muted-foreground">TOTAL</span>
              <span className="font-heading text-2xl font-bold tracking-tight text-emerald-400">
                {formatCurrency(simResult.total)}
              </span>
            </div>
          </div>
          <Button
            className="w-full bg-orange-500 py-2.5 font-mono text-[11px] font-bold uppercase text-white hover:bg-orange-600"
            onClick={() => setSim((prev) => ({ ...prev }))}
          >
            Kalkulasi Ulang
          </Button>
        </div>
      </ParkModal>
    </div>
  )
}

function SwitchPreview({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (next: boolean) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        checked ? 'bg-orange-500' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'mx-0.5 size-5 rounded-full bg-foreground transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
