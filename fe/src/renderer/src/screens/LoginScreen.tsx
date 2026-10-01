import type React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CarFront } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { homeRouteFor } from '../lib/permissions'
import { cn } from '@renderer/lib/utils'

const PRESET_ROLES = [
  { role: 'Operator', username: 'operator', password: 'operator123', short: 'OPR', color: 'emerald' },
  { role: 'Supervisor', username: 'supervisor', password: 'supervisor123', short: 'SPV', color: 'sky' },
  { role: 'Teknisi', username: 'teknisi', password: 'teknisi123', short: 'ENG', color: 'amber' }
] as const

type PresetRole = (typeof PRESET_ROLES)[number]['role']
type Preset = (typeof PRESET_ROLES)[number]

const ROLE_META: Record<
  PresetRole,
  {
    presetLabel: string
    badge: string
    badgeClass: string
    scope: string
    desc: string
    destination: string
    dotClass: string
  }
> = {
  Operator: {
    presetLabel: 'Operator Loket',
    badge: 'OPERATOR',
    badgeClass: 'bg-emerald-500/20 text-emerald-400',
    scope: 'Khusus Loket Kasir',
    desc: 'Operator hanya bisa login dan langsung membuka halaman Loket dengan semua fungsinya. Akses Dashboard Admin dibatasi penuh.',
    destination: 'Tujuan: Halaman Loket Operator Langsung',
    dotClass: 'bg-emerald-400'
  },
  Supervisor: {
    presetLabel: 'Supervisor',
    badge: 'SUPERVISOR',
    badgeClass: 'bg-sky-500/20 text-sky-400',
    scope: 'Operasional, Tarif, Member, Karyawan, SOP + Buka Loket & Override',
    desc: 'Supervisor login bisa membuka dashboard (menu operasional, tarif, bayar, member, karyawan, SOP), buka loket [F12], dan override PIN di loket. DILARANG membuka Manajemen Perangkat dan Pengaturan Sistem.',
    destination: 'Tujuan: Dashboard Admin',
    dotClass: 'bg-sky-400'
  },
  Teknisi: {
    presetLabel: 'Teknisi',
    badge: 'TEKNISI',
    badgeClass: 'bg-amber-500/20 text-amber-400',
    scope: 'Hanya Manajemen Perangkat [02] & Pengaturan Sistem [07]',
    desc: 'Teknisi login hanya bisa akses ke dashboard halaman Manajemen Perangkat [02] dan Pengaturan Sistem [07]. Menu operasional lain dan loket terkunci.',
    destination: 'Tujuan: Dashboard Admin',
    dotClass: 'bg-amber-400'
  }
}

export function LoginScreen(): React.JSX.Element {
  const { login, error } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('operator')
  const [password, setPassword] = useState('operator123')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<PresetRole>('Operator')

  const submitWith = async (user: string, pass: string): Promise<void> => {
    setLoading(true)
    const result = await login(user, pass)
    setLoading(false)
    if (result.ok) {
      navigate(homeRouteFor(result.session ?? null), { replace: true })
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await submitWith(username, password)
  }

  const applyPreset = (preset: Preset): void => {
    setUsername(preset.username)
    setPassword(preset.password)
    setSelectedRole(preset.role)
  }

  const meta = ROLE_META[selectedRole]

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#131316] via-[#101014] to-[#0a0a0d] p-4 lg:p-8">
      <div className="flex w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-[#2e2e38] bg-[#1a1a20] shadow-2xl md:flex-row">
        {/* Left Info Box */}
        <section className="flex w-full flex-col justify-between border-b border-[#2e2e38] bg-[#15151a] p-7 md:w-[42%] md:border-b-0 md:border-r">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-white font-mono text-2xl font-black text-neutral-900 shadow-lg">
                P
              </div>
              <div>
                <h1 className="flex items-center gap-2 font-heading text-xl font-bold text-white">
                  PARK-OS Terminal
                  <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                </h1>
                <p className="font-mono text-xs text-neutral-400">Kendali Exit Gate &amp; Pos Kasir</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-neutral-300">
              Sistem workstation terdistribusi untuk gerbang keluar parkir dengan aturan hak akses role yang ketat.
            </p>
            <div className="flex items-start gap-2.5 rounded-xl border border-[#2e2e38] bg-[#22222a] p-3 text-xs text-neutral-300">
              <div>
                <p className="font-semibold text-neutral-100">Otorisasi Role-Based</p>
                <p className="mt-0.5 text-[11px] leading-snug text-neutral-400">
                  Hak akses dibatasi otomatis: Operator ke Loket, Admin/SPV ke Operasional &amp; Override, Teknisi ke Hardware &amp; Sistem.
                </p>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 font-mono text-xs">
              <div className="flex justify-between border-b border-[#2e2e38]/60 py-1">
                <span className="text-neutral-400">Lokasi:</span>
                <span className="font-bold text-white">Gate Barat (Exit 01)</span>
              </div>
              <div className="flex justify-between border-b border-[#2e2e38]/60 py-1">
                <span className="text-neutral-400">Preset Aktif:</span>
                <span className="font-bold text-emerald-400">{meta.presetLabel}</span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="shrink-0 text-neutral-400">Hak Akses:</span>
                <span className="text-right text-neutral-300">{meta.scope}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between border-t border-[#2e2e38]/60 pt-4 font-mono text-[11px] text-neutral-400">
            <span>
              Barrier: <strong className="text-emerald-400">COM3 Ready</strong>
            </span>
            <span>Baud: 9600 bps</span>
          </div>
        </section>

        {/* Right Login Form */}
        <section className="flex w-full flex-col justify-between bg-[#1a1a20] p-7 text-neutral-100 md:w-[58%]">
          <div>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold text-white">Masuk Workstation</h2>
                <p className="mt-1 text-xs text-neutral-400">Pilih profil role atau gunakan akun terdaftar:</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#2e2e38] bg-[#22222a] px-2.5 py-1">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-[11px] text-neutral-300">Ready</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Pilih role preset instan
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {PRESET_ROLES.map((preset) => {
                  const active = selectedRole === preset.role
                  return (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-xl border p-2.5 text-left transition-all',
                        active
                          ? 'border-[#f97316] bg-[#f97316]/10 text-white ring-2 ring-[#f97316]'
                          : 'border-[#2e2e38] bg-[#22222a] text-neutral-300 hover:border-neutral-500'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-bold">
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              preset.color === 'emerald' && 'bg-emerald-400',
                              preset.color === 'sky' && 'bg-sky-400',
                              preset.color === 'amber' && 'bg-amber-400'
                            )}
                          />
                          {preset.role}
                        </span>
                        <span className="rounded bg-black/50 px-1 py-0.5 text-[9px]">{preset.short}</span>
                      </div>
                      <span className={cn('mt-1 block text-[10px]', active ? 'text-neutral-300' : 'text-neutral-400')}>
                        {preset.role === 'Operator'
                          ? 'Khusus Loket'
                          : preset.role === 'Supervisor'
                            ? 'Admin + Loket'
                            : 'Hardware/Sistem'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              <div>
                <label htmlFor="username" className="mb-1 block text-xs font-semibold text-neutral-300">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-[#2e2e38] bg-[#101014] px-3.5 py-2 font-mono text-sm text-white focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-neutral-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="font-mono text-[11px] text-[#f97316] hover:underline"
                  >
                    {showPassword ? 'Tutup' : 'Lihat'}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-[#2e2e38] bg-[#101014] px-3.5 py-2 font-mono text-sm text-white focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
                />
              </div>

              <div className="rounded-lg border border-[#2e2e38] bg-[#22222a] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-neutral-200">
                    <CarFront className="size-4 text-emerald-400" aria-hidden />
                    {meta.destination}
                  </span>
                  <span className={cn('rounded px-2 py-0.5 font-mono text-[10px] font-bold', meta.badgeClass)}>
                    {meta.badge}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-neutral-400">{meta.desc}</p>
              </div>

              {error && (
                <p className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f97316] py-3 font-mono text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{loading ? 'Memproses...' : 'Masuk Sesuai Role'}</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
