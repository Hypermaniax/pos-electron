import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { useFKeyBindings } from '../hooks/useFKeyBindings'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { cn } from '@renderer/lib/utils'

type RoleKey = 'operator' | 'supervisor' | 'teknisi'

interface RolePreset {
  key: RoleKey
  label: string
  shortcut: string
  dot: string
  desc: string
  username: string
  password: string
  previewTitle: string
  previewDesc: string
  previewTag: string
  previewTagClass: string
  leftMode: string
  scope: string
  panelDesc: string
}

const ROLE_PRESETS: RolePreset[] = [
  {
    key: 'operator',
    label: 'Operator',
    shortcut: 'OPR',
    dot: 'bg-emerald-500',
    desc: 'Loket Kasir & Pintu',
    username: 'operator',
    password: 'operator123',
    previewTitle: 'Tujuan: Loket Operator',
    previewDesc:
      'Membuka sesi transaksi loket keluar, pemindaian karcis, kalkulasi tarif, cetak struk, dan buka barrier.',
    previewTag: 'OPERATOR',
    previewTagClass: 'bg-emerald-100 text-emerald-800',
    leftMode: 'Operator Aktif',
    scope: 'Exit Lane & Payment',
    panelDesc:
      'Aplikasi loket untuk menampilkan tagihan, menerima pembayaran, dan membuka palang pintu otomatis.'
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    shortcut: 'SPV',
    dot: 'bg-blue-500',
    desc: 'Full Dashboard + Loket',
    username: 'supervisor',
    password: 'supervisor123',
    previewTitle: 'Tujuan: Dashboard Admin & Master SPV',
    previewDesc:
      'Akses penuh ke seluruh modul Dashboard: Rekap Pendapatan, Log Transaksi, Override Tarif, plus Loket Operator.',
    previewTag: 'SUPERVISOR',
    previewTagClass: 'bg-blue-100 text-blue-800',
    leftMode: 'Supervisor Mode',
    scope: 'Full Privileges + POS',
    panelDesc:
      'Mode Supervisor: memiliki kewenangan pembatalan tiket, koreksi tarif denda, rekonsiliasi kas, dan monitoring loket.'
  },
  {
    key: 'teknisi',
    label: 'Teknisi',
    shortcut: 'ENG',
    dot: 'bg-orange-500',
    desc: 'Perangkat & Sistem',
    username: 'teknisi',
    password: 'teknisi123',
    previewTitle: 'Tujuan: Perangkat & Pengaturan Sistem',
    previewDesc:
      'Akses teknis: Telemetri hardware, konfigurasi COM port barrier, ping thermal printer, dan pengujian loop sensor.',
    previewTag: 'TEKNISI',
    previewTagClass: 'bg-orange-100 text-orange-800',
    leftMode: 'Maintenance Mode',
    scope: 'Device & System Diagnostics',
    panelDesc:
      'Mode Teknisi: diagnostik hardware palang, kalibrasi sensor induktif loop, status port serial, dan pengujian cetak.'
  }
]

function LeftRow({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-800/60 pb-2 text-xs last:border-b-0">
      <span className="text-neutral-500">{label}</span>
      {children}
    </div>
  )
}

export function LoginScreen(): React.JSX.Element {
  const { session, login, error, endReason, clearEndReason } = useAuth()
  const { config } = useConfig()
  const navigate = useNavigate()

  const [currentRole, setCurrentRole] = useState<RoleKey>('operator')
  const [username, setUsername] = useState(ROLE_PRESETS[0].username)
  const [password, setPassword] = useState(ROLE_PRESETS[0].password)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('id-ID', { hour12: false })
  )
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('id-ID', { hour12: false }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const enterSubmit = (): void => {
    if (submitting) return
    clearEndReason()
    void (async () => {
      setSubmitting(true)
      const result = await login(username.trim(), password)
      setSubmitting(false)
      if (result.ok) {
        setPassword('')
        navigate('/', { replace: true })
      }
    })()
  }

  useFKeyBindings({
    enter: enterSubmit,
    escape: () => clearEndReason(),
    f5: () => undefined
  })

  if (session) {
    return <Navigate to="/" replace />
  }

  const preset = ROLE_PRESETS.find((preset) => preset.key === currentRole) ?? ROLE_PRESETS[0]

  const selectRole = (key: RoleKey): void => {
    setCurrentRole(key)
    const data = ROLE_PRESETS.find((item) => item.key === key)
    if (!data) return
    setUsername(data.username)
    setPassword(data.password)
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    enterSubmit()
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-[#0c0d10] text-neutral-200 antialiased">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-3/5 items-center justify-center">
        <div className="size-[560px] rounded-full bg-orange-500/5 blur-3xl" />
      </div>

      {/* Main workspace */}
      <main className="relative flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[920px] overflow-hidden rounded-2xl border border-neutral-800 bg-[#131418] shadow-2xl md:flex-row">
          <div className="flex flex-col md:flex-row">
            {/* LEFT PANEL */}
            <section className="flex flex-col justify-between border-b border-neutral-800 bg-[#111216] p-8 md:w-[44%] md:border-b-0 md:border-r">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-white font-mono text-2xl font-black tracking-tighter text-neutral-900 shadow-lg">
                    P
                  </div>
                  <div>
                    <h1 className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-white">
                      POS Parkir{' '}
                      <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
                    </h1>
                    <p className="text-xs text-neutral-400">Terminal Kendali Loket</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-neutral-300/80">{preset.panelDesc}</p>

                <div className="flex items-start gap-2.5 rounded-lg border border-neutral-800 bg-[#18191f] p-3.5 text-xs leading-snug text-neutral-300">
                  <span aria-hidden className="mt-0.5 font-mono text-sm text-orange-400">
                    Ⓘ
                  </span>
                  <div>
                    <p className="font-medium text-neutral-200">Terhubung Site Server</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      {config?.siteServerUrl ?? '-'} · Autentikasi multi-role aktif.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <LeftRow label="Loket">
                    <span className="font-mono text-xs font-semibold text-neutral-100">
                      {config?.laneName ?? '-'}
                    </span>
                  </LeftRow>
                  <LeftRow label="Gerbang">
                    <span className="font-mono text-xs font-semibold text-neutral-100">
                      {config?.gateName ?? '-'}
                    </span>
                  </LeftRow>
                  <LeftRow label="Mode Kerja">
                    <span className="inline-flex items-center rounded border border-orange-500/20 bg-neutral-800 px-2 py-0.5 font-mono text-[11px] font-medium text-orange-400">
                      {preset.leftMode}
                    </span>
                  </LeftRow>
                  <LeftRow label="Akses Kanal">
                    <span className="text-right font-mono text-[11px] text-neutral-300">
                      {preset.scope}
                    </span>
                  </LeftRow>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-neutral-800/60 pt-6 font-mono text-[11px] text-neutral-500">
                <span>
                  Barrier Controller:{' '}
                  <strong className="font-medium text-emerald-400">Ready</strong>
                </span>
                <span>COM3 · 9600 bps</span>
              </div>
            </section>

            {/* RIGHT PANEL — white form card */}
            <section className="flex flex-col justify-between bg-white p-8 text-neutral-900 md:w-[56%]">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-bold tracking-tight text-neutral-900">
                      Masuk
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Gunakan akun yang terdaftar untuk membuka sesi kerja.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1">
                    <span className="size-2 rounded-full bg-neutral-800" />
                    <span className="whitespace-nowrap text-[11px] font-medium text-neutral-700">
                      {config?.operationalMode === 'manless'
                        ? 'Mode Manless'
                        : 'Mode Lokal · Data Site'}
                    </span>
                  </div>
                </div>

                {endReason && (
                  <Alert className="mb-3">
                    <AlertDescription>{endReason}</AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Preset roles */}
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      Pilih Akun Preset
                    </span>
                    <span className="text-[11px] text-neutral-400">Klik untuk isi otomatis</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLE_PRESETS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectRole(item.key)}
                        className={cn(
                          'flex flex-col gap-1 rounded-lg border p-2 text-left text-xs transition-all',
                          item.key === currentRole
                            ? 'border-neutral-400 bg-neutral-100 font-medium text-neutral-900 ring-2 ring-neutral-900'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                        )}
                      >
                        <span className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                            <span className={cn('size-2 rounded-full', item.dot)} />
                            {item.label}
                          </span>
                          <span className="rounded border border-neutral-200 bg-white/80 px-1 font-mono text-[9px] text-neutral-400">
                            {item.shortcut}
                          </span>
                        </span>
                        <span className="text-[10px] leading-tight text-neutral-500">
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3.5">
                  <div>
                    <label
                      className="mb-1 block text-xs font-semibold text-neutral-800"
                      htmlFor="username"
                    >
                      Nama pengguna
                    </label>
                    <input
                      id="username"
                      ref={usernameRef}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      placeholder="cth. operator"
                      required
                      className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 font-mono text-sm text-neutral-900 shadow-sm transition-all placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-800" htmlFor="password">
                        Kata sandi
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-[11px] text-neutral-500 transition-colors hover:text-neutral-900"
                      >
                        {showPassword ? 'Sembunyikan' : 'Lihat sandi'}
                      </button>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Kata sandi"
                      required
                      className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 font-mono text-sm tracking-wider text-neutral-900 shadow-sm transition-all placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs transition-colors">
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                      <span aria-hidden className="text-base text-emerald-600">
                        ⏏
                      </span>
                      <span>{preset.previewTitle}</span>
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                        preset.previewTagClass
                      )}
                    >
                      {preset.previewTag}
                    </span>
                  </div>
                  <p className="-mt-2.5 px-1 text-[11px] leading-snug text-neutral-500">
                    {preset.previewDesc}
                  </p>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-md transition-all hover:bg-black focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 group active:bg-neutral-950 disabled:opacity-60"
                  >
                    <span>{submitting ? 'Memproses...' : 'Masuk Workstation'}</span>
                    <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
                      Enter ↵
                    </kbd>
                    {!submitting && (
                      <span
                        aria-hidden
                        className="transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[11px] text-neutral-400">
                <span>
                  Site ID: <strong className="font-semibold">PKR-CGK-01</strong>
                </span>
                <span className="font-mono text-neutral-500">{clock} WIB</span>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Bottom status bar */}
      <footer className="flex h-7 shrink-0 select-none items-center justify-between border-t border-neutral-800 bg-[#0a0a0d] px-4 font-mono text-[11px] text-neutral-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-neutral-300">Terminal Ready</span>
          </span>
          <span className="text-neutral-700">|</span>
          <span>
            RFID Reader: <span className="text-neutral-300">Connected</span>
          </span>
          <span className="text-neutral-700">|</span>
          <span>
            Thermal Printer: <span className="text-neutral-300">Paper OK</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>[F1] Bantuan</span>
          <span>[F5] Refresh Port</span>
          <span>[ESC] Tutup Sesi</span>
          <span className="text-neutral-300">{clock} WIB</span>
        </div>
      </footer>
    </div>
  )
}
