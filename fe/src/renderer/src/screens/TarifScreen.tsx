import type React from 'react'
import { useState } from 'react'
import {
  Bike,
  Car,
  CircleDollarSign,
  Cloud,
  Info,
  Save,
  Settings2,
  Timer,
  Truck,
  Verified
} from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { cn } from '@renderer/lib/utils'

interface TariffRow {
  group: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  firstHour: string
  nextHour: string
  max24: string
  penalty: string
  grace: string
}

interface PolicyToggle {
  key: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  enabled: boolean
  footerLabel: string
  footerValue: string
  footerColor: string
}

const INITIAL_TARIFFS: TariffRow[] = [
  { group: 'Golongan I', description: 'Sepeda Motor < 250cc', icon: Bike, firstHour: 'Rp 2.000', nextHour: 'Rp 1.000', max24: 'Rp 15.000', penalty: 'Rp 25.000', grace: '10 Menit' },
  { group: 'Golongan II', description: 'Mobil / Sedan / SUV', icon: Car, firstHour: 'Rp 5.000', nextHour: 'Rp 3.000', max24: 'Rp 40.000', penalty: 'Rp 50.000', grace: '10 Menit' },
  { group: 'Golongan III', description: 'Bus / Truk / Box R6+', icon: Truck, firstHour: 'Rp 10.000', nextHour: 'Rp 5.000', max24: 'Rp 80.000', penalty: 'Rp 100.000', grace: '10 Menit' }
]

const INITIAL_POLICIES: PolicyToggle[] = [
  {
    key: 'dropoff',
    title: 'Drop-off Gratis',
    description: '10 Menit Pertama bebas biaya keluar gardu.',
    icon: Timer,
    iconColor: 'text-park-cyan',
    enabled: true,
    footerLabel: 'Toleransi Barrier:',
    footerValue: '+60 Detik',
    footerColor: 'text-park-success'
  },
  {
    key: 'weekend',
    title: 'Tarif Weekend & Hari Libur',
    description: 'Penyesuaian surcharge untuk Sabtu, Minggu, & Tanggal Merah.',
    icon: CircleDollarSign,
    iconColor: 'text-park-warning',
    enabled: true,
    footerLabel: 'Surcharge Dinamis:',
    footerValue: '+10% Tarif Normal',
    footerColor: 'text-park-warning'
  },
  {
    key: 'rounding',
    title: 'Kebijakan Pembulatan Waktu',
    description: 'Format pembulatan durasi operasional kalkulasi kasir.',
    icon: Settings2,
    iconColor: 'text-park-blue',
    enabled: true,
    footerLabel: 'Aturan Matematis:',
    footerValue: 'Strict Ceil (Pukul Atas)',
    footerColor: 'text-white'
  },
  {
    key: 'asuransi',
    title: 'Premi Jasa Raharja',
    description: 'Kompensasi asuransi pertanggungan kendaraan parkir.',
    icon: Verified,
    iconColor: 'text-park-success',
    enabled: true,
    footerLabel: 'Besaran Nominal:',
    footerValue: 'Flat Rp 500 / trx',
    footerColor: 'text-park-success'
  }
]

export function TarifScreen(): React.JSX.Element {
  const toast = useToast()
  const tariffs = INITIAL_TARIFFS
  const [policies, setPolicies] = useState<PolicyToggle[]>(INITIAL_POLICIES)
  const [showSimModal, setShowSimModal] = useState(false)
  const [simGolongan, setSimGolongan] = useState('2')
  const [simDurasi, setSimDurasi] = useState('3')
  const [simMenit, setSimMenit] = useState('15')
  const [simWeekend, setSimWeekend] = useState(false)
  const [simAsuransi, setSimAsuransi] = useState(true)
  const [simResult, setSimResult] = useState({ total: 'Rp 14.500', breakdown: 'Jam Ke-1 + 3 Jam Ceil' })

  const handleSave = (): void => {
    toast('SKEMA DIPERBARUI (CRC 0x9AF41B8)', 'success')
    toast('Berhasil sinkronisasi skema baru ke Gardu 01, Gardu 02 & Kiosk.', 'success')
  }

  const handleQuickEdit = (group: string): void => {
    toast(`MEMBUAT ATURAN: ${group.toUpperCase()}`, 'info')
    toast(`Mode parameter spesifik dibuka untuk ${group}`, 'info')
  }

  const togglePolicy = (key: string): void => {
    setPolicies((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    )
  }

  const recalculateSim = (): void => {
    const g = parseInt(simGolongan, 10)
    const jam = parseInt(simDurasi, 10) || 0
    const menit = parseInt(simMenit, 10) || 0
    const isWeekend = simWeekend
    const isAsuransi = simAsuransi

    let firstHour = 2000
    let nextHour = 1000
    let max24 = 15000

    if (g === 2) {
      firstHour = 5000
      nextHour = 3000
      max24 = 40000
    } else if (g === 3) {
      firstHour = 10000
      nextHour = 5000
      max24 = 80000
    }

    if (jam === 0 && menit <= 10) {
      const total = isAsuransi ? 500 : 0
      setSimResult({
        total: `Rp ${total.toLocaleString('id-ID')}`,
        breakdown: 'Bebas Biaya (Drop-off Grace Period)'
      })
      return
    }

    let extraHours = jam
    if (menit > 0) {
      extraHours += 1
    }

    let parkingCharge = 0
    if (extraHours <= 1) {
      parkingCharge = firstHour
    } else {
      parkingCharge = firstHour + (extraHours - 1) * nextHour
    }

    if (parkingCharge > max24) {
      parkingCharge = max24
    }

    if (isWeekend) {
      parkingCharge = Math.round(parkingCharge * 1.1)
    }

    if (isAsuransi) {
      parkingCharge += 500
    }

    setSimResult({
      total: `Rp ${parkingCharge.toLocaleString('id-ID')}`,
      breakdown: `${extraHours} Jam Total Terhitung${isWeekend ? ' (+10% Libur)' : ''}`
    })
  }

  const handleSimChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value)
    setTimeout(recalculateSim, 0)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 pt-1 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-park-card px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-park-cyan">
              Modul Konfigurasi Pusat • REV 2025.04
            </span>
            <span className="size-1.5 animate-pulse rounded-full bg-park-success" />
            <span className="text-xs text-park-muted">LIVE SYNC READY</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Pengaturan Tarif & Kebijakan Parkir
          </h1>
          <p className="max-w-3xl text-sm text-park-muted">
            Kelola struktur matriks tarif berjenjang, penalti denda tiket hilang, grace period, dan aturan pembulatan durasi operasional seluruh gardu.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => {
              setShowSimModal(true)
              setTimeout(recalculateSim, 0)
            }}
            className="flex items-center gap-1.5 rounded bg-park-card px-4 py-2.5 text-sm font-medium uppercase text-park-main transition-colors hover:bg-park-cyan/20 hover:text-white"
          >
            <CircleDollarSign className="size-4 text-park-cyan" />
            <span>Simulasi Hitung Tarif</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded bg-park-cta px-4 py-2.5 text-sm font-medium uppercase text-white shadow-md transition-colors hover:bg-orange-500"
          >
            <Save className="size-4" />
            <span>Simpan Perubahan Tarif</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-park-primary p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-park-card text-park-success">
            <Verified className="size-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs text-park-muted">
              <span>STATUS SKEMA TARIF OPERASIONAL</span>
              <span className="rounded bg-park-card px-1.5 py-0.5 text-xs font-semibold text-park-success">VALIDATED</span>
            </div>
            <div className="mt-0.5 text-lg font-bold text-white">
              Aktif (Perda Parkir No. 14/2024)
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col text-left md:text-right">
            <span className="text-xs text-park-muted">CHECKSUM CRC32</span>
            <span className="font-mono text-sm font-bold tracking-wider text-park-blue">0x9AF41B8</span>
          </div>
          <div className="hidden h-8 w-px bg-park-card md:block" />
          <div className="flex items-center gap-2 rounded bg-park-card px-4 py-2">
            <span className="size-2.5 rounded-full bg-park-success" />
            <div className="flex flex-col">
              <span className="text-xs text-park-muted">SYNC STATUS</span>
              <span className="text-sm font-medium text-white">Terhubung Otomatis ke semua POS Booth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tariff Table */}
      <div className="flex flex-col overflow-hidden rounded-xl bg-park-primary shadow-sm">
        <div className="flex flex-col items-start justify-between gap-2 bg-park-secondary/50 p-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Info className="size-5 text-park-blue" />
            <h2 className="text-lg font-bold text-white">Matriks Tarif Golongan Kendaraan</h2>
          </div>
          <span className="text-xs text-park-muted">3 GOLONGAN TERDEFINISI • MODE EDIT INLINE AKTIF</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-park-tertiary text-xs uppercase tracking-wider text-park-muted">
              <tr>
                <th className="px-6 py-3">Golongan Kendaraan</th>
                <th className="px-4 py-3 text-right">Jam Pertama</th>
                <th className="px-4 py-3 text-right">Per Jam Berikutnya</th>
                <th className="px-4 py-3 text-right">Maksimal / 24 Jam</th>
                <th className="px-4 py-3 text-right">Denda Tiket Hilang</th>
                <th className="px-4 py-3 text-center">Grace Period</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="text-park-main">
              {tariffs.map((row, index) => (
                <tr
                  key={row.group}
                  className={cn(
                    'transition-colors hover:bg-park-card',
                    index % 2 === 0 ? 'bg-park-primary' : 'bg-park-secondary/30'
                  )}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <row.icon className="size-5 text-park-blue" />
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{row.group}</span>
                        <span className="text-xs text-park-muted">{row.description}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      defaultValue={row.firstHour}
                      className="w-28 rounded bg-park-secondary px-2 py-1 text-right text-sm text-white outline-none focus:bg-park-cyan/10 focus:text-park-cyan"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      defaultValue={row.nextHour}
                      className="w-28 rounded bg-park-secondary px-2 py-1 text-right text-sm text-white outline-none focus:bg-park-cyan/10 focus:text-park-cyan"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      defaultValue={row.max24}
                      className="w-28 rounded bg-park-secondary px-2 py-1 text-right text-sm text-white outline-none focus:bg-park-cyan/10 focus:text-park-cyan"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      defaultValue={row.penalty}
                      className="w-28 rounded bg-park-secondary px-2 py-1 text-right text-sm text-park-warning outline-none focus:bg-park-cyan/10 focus:text-park-cyan"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded bg-park-card px-2 py-1 text-sm text-park-cyan">{row.grace}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded bg-park-card px-2 py-0.5 text-xs font-semibold tracking-wider text-park-success">AKTIF</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleQuickEdit(row.group)}
                      className="rounded bg-park-card px-3 py-1 text-xs uppercase text-white transition-colors hover:bg-park-cyan/20"
                    >
                      Atur Aturan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between bg-park-tertiary px-6 py-2 text-xs text-park-muted">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-park-blue" />
            <span>Perubahan angka langsung tersimpan lokal sebagai draft hingga tombol SIMPAN ditekan.</span>
          </div>
          <span className="font-mono font-semibold text-park-blue">VALIDATION RULE: STRICT NON-ZERO</span>
        </div>
      </div>

      {/* Policy Settings */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-park-blue" />
            <h2 className="text-lg font-bold text-white">Pengaturan Kebijakan Tambahan</h2>
          </div>
          <span className="text-xs text-park-muted">4 PARAMETER SISTEM TERAPLIKASI</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {policies.map((policy) => (
            <div key={policy.key} className="flex flex-col justify-between rounded-xl bg-park-primary p-5 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded bg-park-card">
                    <policy.icon className={cn('size-5', policy.iconColor)} />
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={policy.enabled}
                      onChange={() => togglePolicy(policy.key)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-park-card after:absolute after:top-[2px] after:left-[2px] after:size-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-park-cta peer-checked:after:translate-x-full" />
                  </label>
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">{policy.title}</h3>
                  <p className="mt-1 text-sm text-park-muted">{policy.description}</p>
                </div>
                {policy.key === 'rounding' && (
                  <div className="flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-park-main">
                      <input type="radio" name="rounding_unit" value="30" className="accent-park-cta" />
                      <span>30 Menit</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
                      <input type="radio" name="rounding_unit" value="60" defaultChecked className="accent-park-cta" />
                      <span>60 Menit Penuh</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-b-xl border-t border-park-border/30 pt-3 text-xs">
                <span className="text-park-muted">{policy.footerLabel}</span>
                <span className={cn('font-mono font-semibold', policy.footerColor)}>{policy.footerValue}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-park-secondary p-4 shadow-sm md:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-park-card text-park-cyan">
            <Cloud className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-park-muted">OPERATIONAL AUDIT TRAIL</span>
            <span className="text-sm font-medium text-white">
              Terakhir disinkronkan oleh <span className="font-mono font-bold text-park-cyan">SUP_ADITYA</span> pada 14:38:09 WIB
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded bg-park-card px-3 py-1 text-xs font-semibold text-park-success">
          <span className="size-2 rounded-full bg-park-success" />
          SIAP DEPLOY INSTAN KE GARDU KELUAR POS
        </div>
      </div>

      {/* Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col gap-4 rounded-xl bg-park-primary p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-5 text-park-cyan" />
                <h3 className="text-lg font-bold text-white">Simulasi Hitung Biaya Parkir</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="flex size-8 items-center justify-center rounded bg-park-card text-park-muted transition-colors hover:bg-park-error hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-park-muted">
              Uji coba validasi perhitungan tarif secara realtime berdasarkan parameter matriks yang sedang dikonfigurasi.
            </p>
            <div className="flex flex-col gap-3 rounded-lg bg-park-tertiary p-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-park-muted">GOLONGAN KENDARAAN</label>
                <select
                  value={simGolongan}
                  onChange={handleSimChange(setSimGolongan)}
                  className="rounded bg-park-secondary p-2 text-sm text-white outline-none"
                >
                  <option value="1">Golongan I - Sepeda Motor (&lt; 250cc)</option>
                  <option value="2">Golongan II - Mobil / Sedan / SUV</option>
                  <option value="3">Golongan III - Bus / Truk / Box R6+</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-park-muted">DURASI PARKIR (JAM)</label>
                  <input
                    type="number"
                    min="0"
                    max="72"
                    value={simDurasi}
                    onChange={handleSimChange(setSimDurasi)}
                    className="rounded bg-park-secondary p-2 text-sm text-white outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-park-muted">TAMBAHAN MENIT</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={simMenit}
                    onChange={handleSimChange(setSimMenit)}
                    className="rounded bg-park-secondary p-2 text-sm text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-park-main">
                  <input
                    type="checkbox"
                    checked={simWeekend}
                    onChange={(e) => {
                      setSimWeekend(e.target.checked)
                      setTimeout(recalculateSim, 0)
                    }}
                    className="accent-park-cta"
                  />
                  <span>Hitung Hari Libur (+10%)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-park-main">
                  <input
                    type="checkbox"
                    checked={simAsuransi}
                    onChange={(e) => {
                      setSimAsuransi(e.target.checked)
                      setTimeout(recalculateSim, 0)
                    }}
                    className="accent-park-cta"
                  />
                  <span>+Asuransi Rp 500</span>
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-park-card p-4">
              <div className="flex items-center justify-between text-xs text-park-muted">
                <span>HASIL ESTIMASI BILLING POS:</span>
                <span className="font-mono font-medium text-park-blue">{simResult.breakdown}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg text-park-muted">TOTAL</span>
                <span className="text-2xl font-bold tracking-tight text-park-success">{simResult.total}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={recalculateSim}
                className="w-full rounded bg-park-cta py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-orange-500"
              >
                Kalkulasi Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
