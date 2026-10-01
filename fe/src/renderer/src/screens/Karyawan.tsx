import type React from 'react'
import { useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CarFront,
  ChevronDown,
  ClipboardList,
  Download,
  IdCard,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  Wrench
} from 'lucide-react'
import { useShift } from '../context/ShiftContext'
import { useToast } from '../hooks/useToast'
import { formatCurrency } from '../lib/format'
import { cn } from '@renderer/lib/utils'

type DutyStatus = 'ON DUTY' | 'SIAP SHIFT' | 'STANDBY' | 'OFF DUTY'
type EmployeeRole = 'Operator Loket' | 'Supervisor Loket' | 'Teknisi Lapangan'
type EmployeeFilter = 'all' | 'onduty' | 'offduty' | 'spv'

interface Employee {
  nip: string
  name: string
  role: EmployeeRole
  booth: string
  shift: string
  status: DutyStatus
}

interface AuditEntry {
  id: number
  time: string
  tag: string
  tagTone: 'ok' | 'warn' | 'info'
  title: string
  amount?: string
  sub: string
}

// Roster lokal (mock): belum ada API backend roster/duty.
const INITIAL_EMPLOYEES: Employee[] = [
  { nip: 'NIP-2024-001', name: 'Budi Santoso', role: 'Operator Loket', booth: 'Gate Exit Barat 01', shift: 'Shift Pagi (06:00 - 14:00)', status: 'ON DUTY' },
  { nip: 'NIP-2024-004', name: 'Rian Ardiansyah', role: 'Operator Loket', booth: 'Gate Exit Barat 02', shift: 'Shift Pagi (06:00 - 14:00)', status: 'ON DUTY' },
  { nip: 'NIP-2024-009', name: 'Siti Rahmawati', role: 'Operator Loket', booth: 'Gate Entry Timur 01', shift: 'Shift Siang (14:00 - 22:00)', status: 'SIAP SHIFT' },
  { nip: 'NIP-2024-012', name: 'Hendra Wijaya', role: 'Supervisor Loket', booth: 'Supervisi All Booth', shift: 'Shift Full (Audit & Override)', status: 'ON DUTY' },
  { nip: 'NIP-2024-015', name: 'Dani Prasetyo', role: 'Teknisi Lapangan', booth: 'Maintenance Hardware', shift: 'On-Call / Standby', status: 'STANDBY' },
  { nip: 'NIP-2024-008', name: 'Agus Setiawan', role: 'Operator Loket', booth: 'Gate Exit Timur 02', shift: 'Shift Malam (22:00 - 06:00)', status: 'OFF DUTY' }
]

const INITIAL_AUDIT: AuditEntry[] = [
  { id: 1, time: '14:38:12', tag: 'EXIT BOOTH 01', tagTone: 'ok', title: 'Budi Santoso: Tutup transaksi tunai', amount: 'Rp 15.000', sub: 'Plat: B 1842 UXX • Tiket #TK-99214' },
  { id: 2, time: '14:35:45', tag: 'SUPERVISOR OVERRIDE', tagTone: 'warn', title: 'Hendra Wijaya: Override supervisor tiket hilang disetujui', sub: 'Lokasi: Gate Exit Barat 02 • Biaya Denda Terbit' },
  { id: 3, time: '14:00:03', tag: 'SHIFT HANDOVER', tagTone: 'info', title: 'Pergantian Shift Pagi ke Siang berhasil disinkronkan ke Central Cloud.', sub: 'Laci kas awal diverifikasi Rp 500.000 (Float Balance)' }
]

const ROLE_OPTIONS = [
  { value: 'op', label: 'Operator Kasir (Standar Booth)', role: 'Operator Loket' },
  { value: 'spv', label: 'Supervisor (Audit & Emergency Override)', role: 'Supervisor Loket' },
  { value: 'tek', label: 'Teknisi Lapangan (Konfigurasi Barrier & Sensor)', role: 'Teknisi Lapangan' }
] as const

const GATE_OPTIONS = [
  { value: 'exit-01', label: 'Exit Gate Barat 01 (POS Booth 1)', booth: 'Gate Exit Barat 01' },
  { value: 'exit-02', label: 'Exit Gate Barat 02 (POS Booth 2)', booth: 'Gate Exit Barat 02' },
  { value: 'entry-01', label: 'Entry Gate Timur 01 (Dispenser Tiket)', booth: 'Gate Entry Timur 01' },
  { value: 'all-spv', label: 'Supervisi & Monitoring (All Gates)', booth: 'Supervisi All Booth' }
] as const

const SHIFT_OPTIONS = [
  { value: 'Pagi', label: 'Pagi', hours: '06 - 14', full: 'Shift Pagi (06:00 - 14:00)' },
  { value: 'Siang', label: 'Siang', hours: '14 - 22', full: 'Shift Siang (14:00 - 22:00)' },
  { value: 'Malam', label: 'Malam', hours: '22 - 06', full: 'Shift Malam (22:00 - 06:00)' }
] as const

const PAGE_SIZE = 6

function RoleBadge({ role }: { role: EmployeeRole }): React.JSX.Element {
  if (role === 'Supervisor Loket') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-[#f97316]/20 px-2 py-0.5 text-xs font-bold text-[#f97316]">
        <ShieldCheck className="size-[13px]" aria-hidden /> Supervisor Loket
      </span>
    )
  }
  if (role === 'Teknisi Lapangan') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-[#7bd0ff]/10 px-2 py-0.5 text-xs text-[#7bd0ff]">
        <Wrench className="size-[13px]" aria-hidden /> Teknisi Lapangan
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[#353438] px-2 py-0.5 text-xs text-[#d4d4d4]">
      <Banknote className="size-[13px] text-[#569cd6]" aria-hidden /> Operator Loket
    </span>
  )
}

function StatusPill({ status }: { status: DutyStatus }): React.JSX.Element {
  if (status === 'ON DUTY') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-[#14532d80] px-2.5 py-0.5 text-xs font-bold text-[#22c55e]">
        <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" /> ON DUTY
      </span>
    )
  }
  if (status === 'SIAP SHIFT') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-[#0c4a6e80] px-2.5 py-0.5 text-xs font-bold text-[#38bdf8]">
        <span className="size-1.5 rounded-full bg-[#38bdf8]" /> SIAP SHIFT
      </span>
    )
  }
  if (status === 'STANDBY') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-[#2a2a2d] px-2.5 py-0.5 text-xs text-[#a1a1aa]">
        <span className="size-1.5 rounded-full bg-[#a1a1aa]" /> STANDBY
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-[#353438] px-2.5 py-0.5 text-xs text-[#a1a1aa]">
      <span className="size-1.5 rounded-full bg-[#353438]" /> OFF DUTY
    </span>
  )
}

export function KaryawanScreen(): React.JSX.Element {
  const toast = useToast()
  const { summary } = useShift()
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<EmployeeFilter>('all')
  const [page, setPage] = useState(1)
  const [audit, setAudit] = useState<AuditEntry[]>(INITIAL_AUDIT)
  const [auditSeq, setAuditSeq] = useState(INITIAL_AUDIT.length + 1)

  const [assignNip, setAssignNip] = useState(INITIAL_EMPLOYEES[0].nip)
  const [assignRole, setAssignRole] = useState<string>('op')
  const [assignGate, setAssignGate] = useState<string>('exit-01')
  const [assignShift, setAssignShift] = useState<string>('Pagi')
  const [permEmergency, setPermEmergency] = useState(true)
  const [permCash, setPermCash] = useState(true)

  const pushAudit = (tag: string, tagTone: AuditEntry['tagTone'], title: string, sub: string): void => {
    setAudit((prev) => [
      { id: auditSeq, time: new Date().toTimeString().split(' ')[0], tag, tagTone, title, sub },
      ...prev
    ])
    setAuditSeq((n) => n + 1)
  }

  const operatorCount = employees.filter((e) => e.role === 'Operator Loket').length
  const spvCount = employees.filter((e) => e.role === 'Supervisor Loket').length
  const tekCount = employees.filter((e) => e.role === 'Teknisi Lapangan').length
  const onDutyCount = employees.filter((e) => e.status === 'ON DUTY').length
  const offDutyCount = employees.filter((e) => e.status === 'OFF DUTY').length
  const shiftTx = (summary?.cashCount ?? 0) + (summary?.qrSuccessCount ?? 0)

  const filtered = employees.filter((e) => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'onduty' && e.status === 'ON DUTY') ||
      (filter === 'offduty' && e.status === 'OFF DUTY') ||
      (filter === 'spv' && e.role === 'Supervisor Loket')
    const term = query.toLowerCase().trim()
    return matchFilter && (term === '' || `${e.name} ${e.nip} ${e.booth}`.toLowerCase().includes(term))
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleExport = (): void => {
    const header = 'nip,nama,role,booth,shift,status\n'
    const body = employees.map((e) => [e.nip, `"${e.name}"`, `"${e.role}"`, `"${e.booth}"`, `"${e.shift}"`, e.status].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([header + body], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'data-petugas.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast('Data petugas diunduh sebagai CSV.', 'success')
  }

  const handleAdd = (): void => {
    const nextNum = employees.reduce((max, e) => {
      const match = e.nip.match(/(\d+)$/)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0) + 1
    const nip = `NIP-2024-${String(nextNum).padStart(3, '0')}`
    const name = `Petugas Baru ${nextNum}`
    setEmployees((prev) => [...prev, { nip, name, role: 'Operator Loket', booth: '-', shift: '-', status: 'OFF DUTY' }])
    setAssignNip(nip)
    pushAudit('REGISTRASI', 'info', `${name} (${nip}) ditambahkan ke roster.`, 'Lengkapi penugasan shift via form cepat.')
    toast('Karyawan baru ditambahkan. Lengkapi penugasan via form.', 'success')
  }

  const handleEdit = (employee: Employee): void => {
    setAssignNip(employee.nip)
    const roleOpt = ROLE_OPTIONS.find((o) => o.role === employee.role)
    if (roleOpt) setAssignRole(roleOpt.value)
    const gateOpt = GATE_OPTIONS.find((o) => o.booth === employee.booth)
    if (gateOpt) setAssignGate(gateOpt.value)
    const shiftOpt = SHIFT_OPTIONS.find((o) => employee.shift.includes(o.value))
    if (shiftOpt) setAssignShift(shiftOpt.value)
    toast(`Mengubah penugasan: ${employee.name}`, 'info')
  }

  const handleShiftFocus = (employee: Employee): void => {
    setAssignNip(employee.nip)
    toast(`Pilih jadwal shift untuk ${employee.name}, lalu simpan.`, 'info')
  }

  const handleAssign = (e: React.FormEvent): void => {
    e.preventDefault()
    const role = ROLE_OPTIONS.find((o) => o.value === assignRole)?.role ?? 'Operator Loket'
    const booth = GATE_OPTIONS.find((o) => o.value === assignGate)?.booth ?? '-'
    const shift = SHIFT_OPTIONS.find((o) => o.value === assignShift)?.full ?? '-'
    setEmployees((prev) =>
      prev.map((emp) => (emp.nip === assignNip ? { ...emp, role, booth, shift, status: 'SIAP SHIFT' as DutyStatus } : emp))
    )
    const name = employees.find((emp) => emp.nip === assignNip)?.name ?? assignNip
    pushAudit('SHIFT ASSIGN', 'info', `${name} ditempatkan di ${booth} (${shift}).`, `Izin: palang darurat ${permEmergency ? 'ON' : 'OFF'} • rekonsiliasi kas ${permCash ? 'ON' : 'OFF'}`)
    toast('Penugasan shift berhasil disinkronkan ke operator & gate!', 'success')
  }

  const selectClass =
    'w-full appearance-none bg-[#111111] text-white text-sm px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#4fc1ff] cursor-pointer'

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 p-4 pb-6">
      {/* 1. Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#1b1b1e] p-5 shadow-md xl:flex-row xl:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#f97316]">
            <span className="inline-block size-2 rounded-full bg-[#f97316]" />
            <span>Personnel Orchestration &amp; Access Control • 10 Booth Managed</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Manajemen Karyawan &amp; Operator Loket</h1>
          <p className="max-w-4xl text-sm text-[#a1a1aa]">
            Pengelolaan akun petugas loket, pembagian jadwal shift kerja, penetapan hak akses/permission (Operator, Supervisor, Teknisi), dan pemantauan status kehadiran aktif.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex cursor-pointer items-center gap-1.5 rounded bg-[#2a2a2d] px-4 py-2.5 text-sm text-[#d4d4d4] transition-all hover:bg-[#353438] active:scale-[0.98]"
          >
            <Download className="size-[18px]" aria-hidden />
            <span>Ekspor Data Petugas</span>
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="flex cursor-pointer items-center gap-1.5 rounded bg-[#f97316] px-4 py-2.5 text-sm uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#ea580c] active:scale-[0.98]"
          >
            <UserPlus className="size-[18px]" aria-hidden />
            <span className="font-bold">+ Tambah Karyawan Baru</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-lg bg-[#1b1b1e] p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs uppercase tracking-wider">Total Petugas Terdaftar</span>
            <IdCard className="size-5 text-[#4fc1ff]" aria-hidden />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl text-white">{employees.length}</span>
            <span className="text-sm text-[#a1a1aa]">Personel</span>
          </div>
          <div className="mt-2 flex items-center justify-between pt-1">
            <span className="rounded bg-[#2a2a2d] px-2 py-0.5 text-xs text-[#4fc1ff]">
              {operatorCount} Operator • {spvCount} Spv • {tekCount} Tek
            </span>
            <span className="text-xs font-semibold text-[#22c55e]">100% OK</span>
          </div>
        </div>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-lg bg-[#1b1b1e] p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs uppercase tracking-wider">Operator Bertugas Aktif</span>
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[#22c55e]" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl text-[#22c55e]">{onDutyCount}</span>
            <span className="text-sm text-white">Petugas On-Duty</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 pt-1 text-xs text-[#a1a1aa]">
            <span>Shift Siang 14:00 - 22:00</span>
          </div>
        </div>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-lg bg-[#1b1b1e] p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs uppercase tracking-wider">Total Transaksi Shift Berjalan</span>
            <CarFront className="size-5 text-[#7bd0ff]" aria-hidden />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl text-white">{shiftTx.toLocaleString('id-ID')}</span>
            <span className="text-sm text-[#a1a1aa]">Kendaraan</span>
          </div>
          <div className="mt-2 flex items-center justify-between pt-1 text-xs">
            <span className="text-[#a1a1aa]">Rerata Kecepatan:</span>
            <span className="rounded bg-[#2a2a2d] px-1.5 py-0.5 font-bold text-[#4fc1ff]">6.2s / transaksi</span>
          </div>
        </div>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-lg bg-[#1b1b1e] p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs uppercase tracking-wider">Tingkat Kepatuhan Kas</span>
            <BadgeCheck className="size-5 text-[#22c55e]" aria-hidden />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl text-white">100%</span>
            <span className="text-sm text-[#22c55e]">Valid</span>
          </div>
          <div className="mt-2 flex items-center justify-between pt-1 text-xs">
            <span className="text-[#a1a1aa]">Selisih Kas Laci:</span>
            <span className="font-bold text-[#22c55e]">{formatCurrency(0)} (Sesuai)</span>
          </div>
        </div>
      </div>

      {/* 3. 2-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* LEFT: Table */}
        <div className="flex flex-col gap-2 lg:col-span-8">
          <div className="flex flex-col items-stretch justify-between gap-2 rounded-lg bg-[#1b1b1e] p-2 shadow-sm sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-2.5 top-1/2 size-[18px] -translate-y-1/2 text-[#a1a1aa]" aria-hidden />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Cari Nama, NIP, atau Booth..."
                type="text"
                className="w-full rounded bg-[#111111] py-2 pl-9 pr-2 text-sm text-white transition-all placeholder:text-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#4fc1ff]"
              />
            </div>
            <div className="flex items-center overflow-x-auto rounded bg-[#0e0e11] p-1">
              {(
                [
                  { key: 'all', label: `Semua (${employees.length})` },
                  { key: 'onduty', label: `Shift Aktif (${onDutyCount})` },
                  { key: 'offduty', label: `Off Duty (${offDutyCount})` },
                  { key: 'spv', label: `Supervisor (${spvCount})` }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setFilter(tab.key)
                    setPage(1)
                  }}
                  className={cn(
                    'cursor-pointer whitespace-nowrap rounded px-3 py-1 text-xs transition-colors',
                    filter === tab.key
                      ? 'bg-[#264f78] font-bold text-white shadow-sm'
                      : 'text-[#a1a1aa] hover:bg-[#2a2a2d] hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-[#1b1b1e] shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="select-none bg-[#0e0e11] text-xs uppercase tracking-wider text-[#a1a1aa]">
                    <th className="px-4 py-2.5">NIP / ID</th>
                    <th className="px-4 py-2.5">Nama Petugas</th>
                    <th className="px-4 py-2.5">Role &amp; Akses</th>
                    <th className="px-4 py-2.5">Penugasan Booth</th>
                    <th className="px-4 py-2.5">Jadwal Shift</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-[#d4d4d4]">
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center font-mono text-xs text-[#a1a1aa]">
                        Tidak ada karyawan yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    visible.map((employee, index) => (
                      <tr key={employee.nip} className={cn('transition-colors', index % 2 === 0 ? 'bg-[#18181b]' : 'bg-[#1f1f22]', 'hover:bg-[#2a2a2d]')}>
                        <td className="px-4 py-2.5 text-sm font-semibold text-[#4fc1ff]">{employee.nip}</td>
                        <td className="px-4 py-2.5 font-medium text-white">{employee.name}</td>
                        <td className="px-4 py-2.5"><RoleBadge role={employee.role} /></td>
                        <td className={cn('px-4 py-2.5 text-sm', employee.role === 'Supervisor Loket' ? 'font-semibold text-[#f59e0b]' : employee.role === 'Teknisi Lapangan' ? 'text-[#a1a1aa]' : 'text-white')}>
                          {employee.booth}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#a1a1aa]">{employee.shift}</td>
                        <td className="px-4 py-2.5 text-center"><StatusPill status={employee.status} /></td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <button type="button" onClick={() => handleEdit(employee)} className="mr-1 cursor-pointer rounded bg-[#1f1f22] px-2 py-1 text-xs text-white transition-colors hover:bg-[#264f78]">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleShiftFocus(employee)} className="cursor-pointer rounded bg-[#1f1f22] px-2 py-1 text-xs text-white transition-colors hover:bg-[#f97316]">
                            Shift
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex select-none items-center justify-between bg-[#0e0e11] p-2 text-xs text-[#a1a1aa]">
              <span>
                Menampilkan <strong className="text-white">{visible.length}</strong> dari <strong className="text-white">{filtered.length}</strong> karyawan terdaftar
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn(
                      'flex size-7 cursor-pointer items-center justify-center rounded transition-colors',
                      page === n ? 'bg-[#264f78] font-bold text-white' : 'text-[#d4d4d4] hover:bg-[#2a2a2d]'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Assign form + Audit log */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="flex flex-col gap-2 rounded-lg bg-[#1b1b1e] p-4 shadow-md">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <ClipboardList className="size-[18px] text-[#f97316]" aria-hidden />
                <span>Form Cepat Penugasan Shift &amp; Role</span>
              </div>
              <span className="rounded bg-[#f97316]/20 px-1.5 py-0.5 text-xs font-bold text-[#f97316]">HOT-ASSIGN</span>
            </div>
            <form onSubmit={handleAssign} className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="karyawan-select" className="text-xs text-[#a1a1aa]">PILIH PETUGAS KARYAWAN</label>
                <div className="relative">
                  <select id="karyawan-select" value={assignNip} onChange={(e) => setAssignNip(e.target.value)} className={selectClass}>
                    {employees.map((e) => (
                      <option key={e.nip} value={e.nip}>{e.name} ({e.nip})</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#a1a1aa]" aria-hidden />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="karyawan-role" className="text-xs text-[#a1a1aa]">ROLE &amp; TINGKAT AKSES</label>
                <div className="relative">
                  <select id="karyawan-role" value={assignRole} onChange={(e) => setAssignRole(e.target.value)} className={selectClass}>
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#a1a1aa]" aria-hidden />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="karyawan-gate" className="text-xs text-[#a1a1aa]">LOKET / GATE PENUGASAN</label>
                <div className="relative">
                  <select id="karyawan-gate" value={assignGate} onChange={(e) => setAssignGate(e.target.value)} className={selectClass}>
                    {GATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#a1a1aa]" aria-hidden />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#a1a1aa]">JADWAL JAM SHIFT</span>
                <div className="grid grid-cols-3 gap-1">
                  {SHIFT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setAssignShift(o.value)}
                      className={cn(
                        'cursor-pointer rounded px-2 py-1.5 text-center text-xs',
                        assignShift === o.value
                          ? 'bg-[#264f78] font-bold text-white'
                          : 'bg-[#2a2a2d] text-[#a1a1aa] hover:bg-[#353438]'
                      )}
                    >
                      {o.label}<br /><span className="text-[10px] font-normal opacity-80">{o.hours}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <label className="flex cursor-pointer items-center justify-between rounded bg-[#1f1f22] p-1.5 transition-colors hover:bg-[#2a2a2d]">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Buka Palang Darurat [F11]</span>
                    <span className="text-[10px] text-[#a1a1aa]">Supervisor bypass manual</span>
                  </div>
                  <input type="checkbox" checked={permEmergency} onChange={(e) => setPermEmergency(e.target.checked)} className="size-4 cursor-pointer accent-[#f97316]" />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded bg-[#1f1f22] p-1.5 transition-colors hover:bg-[#2a2a2d]">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Rekonsiliasi Kas Laci</span>
                    <span className="text-[10px] text-[#a1a1aa]">Akses tutup kasir &amp; setor shift</span>
                  </div>
                  <input type="checkbox" checked={permCash} onChange={(e) => setPermCash(e.target.checked)} className="size-4 cursor-pointer accent-[#f97316]" />
                </label>
              </div>
              <button type="submit" className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-[#f97316] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#ea580c] active:scale-[0.98]">
                <Save className="size-[18px]" aria-hidden />
                <span>Simpan Penugasan Shift</span>
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-[#1b1b1e] p-4 shadow-md">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <span className="size-2 animate-ping rounded-full bg-[#22c55e]" />
                <span>Live Log Audit Aktivitas Kasir</span>
              </div>
              <span className="text-xs text-[#4fc1ff]">SYNC STREAM</span>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {audit.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-0.5 rounded bg-[#0e0e11] p-2.5">
                  <div className="flex items-center justify-between text-[#a1a1aa]">
                    <span className={cn('font-bold', entry.tagTone === 'warn' ? 'text-[#f59e0b]' : entry.tagTone === 'info' ? 'text-[#569cd6]' : 'text-[#4fc1ff]')}>
                      [{entry.time}]
                    </span>
                    <span className={cn(
                      'rounded px-1.5 py-px text-[10px] font-bold',
                      entry.tagTone === 'ok' && 'bg-[#2a2a2d] text-[#22c55e]',
                      entry.tagTone === 'warn' && 'bg-[#f59e0b]/20 text-[#f59e0b]',
                      entry.tagTone === 'info' && 'bg-[#264f78] text-white'
                    )}>
                      {entry.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white">
                    {entry.title}
                    {entry.amount && <span className="font-bold text-[#22c55e]"> {entry.amount}</span>}
                  </p>
                  <span className="text-[11px] text-[#a1a1aa]">{entry.sub}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-[#a1a1aa]">
              <span className="flex items-center gap-1">
                <BadgeCheck className="size-[14px] text-[#22c55e]" aria-hidden />
                Audit Trail SHA-256 Aktif
              </span>
              <button type="button" onClick={() => toast('Arsip log penuh tersedia di menu Riwayat.', 'info')} className="cursor-pointer text-[#4fc1ff] hover:underline">
                Lihat Semua Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
