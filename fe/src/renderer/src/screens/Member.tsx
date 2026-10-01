import type React from 'react'
import { useState } from 'react'
import {
  Ban,
  Banknote,
  CalendarPlus,
  CreditCard,
  Dices,
  Download,
  IdCard,
  Infinity as InfinityIcon,
  Nfc,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  X
} from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { cn } from '@renderer/lib/utils'

type MemberTab = 'member' | 'operator'

interface Member {
  uid: string
  owner: string
  unit: string
  plate: string
  plate2?: string
  tier: string
  vehicleClass: string
  validUntil: string
  taps: number
  blocked?: boolean
}

interface OperatorRow {
  nip: string
  name: string
  role: string
  lane: string
  online: boolean
  statusLine: string
  statusSub: string
  shift: string
  shiftHours: string
  trx: string
  trxSub: string
}

const MEMBER_TIERS = ['VIP Eksekutif', 'Karyawan Tenant', 'Residen Apartemen', 'Dinas / Khusus']
const VEHICLE_CLASSES = ['Mobil (Golongan I)', 'Motor (Golongan II)', 'Truk / Box (Golongan III)']

const OP_ROLES = [
  'Operator Loket',
  'Supervisor Lapangan',
  'Teknisi Hardware',
  'Super Admin'
]
const OP_SHIFTS = ['Shift Pagi (06:00 - 14:00)', 'Shift Siang (14:00 - 22:00)', 'Shift Malam (22:00 - 06:00)']
const OP_LANES = ['Gate Barat 01', 'Gate Barat 02', 'Gate Timur 01', 'All Gates']

// Data lokal (mock): belum ada API backend member/operator.
const INITIAL_MEMBERS: Member[] = [
  { uid: 'RFID-984210394', owner: 'Dr. Adrian Pratama', unit: 'Executive Floor 24 #PH01', plate: 'B 1234 CD', plate2: 'B 8899 VIP', tier: 'VIP Eksekutif', vehicleClass: 'Mobil (Gol I)', validUntil: '2099-12-31', taps: 412 },
  { uid: 'RFID-110293841', owner: 'PT Danendra Logistik', unit: 'Karyawan Tenant L-3', plate: 'B 9021 TGA', tier: 'Tenant Gedung', vehicleClass: 'Mobil (Gol I)', validUntil: '2025-12-31', taps: 188 },
  { uid: 'RFID-771239904', owner: 'Kolonel Suryo W.', unit: 'Tamu Protokoler', plate: 'B 1984 RFS', tier: 'Dinas Khusus', vehicleClass: 'Mobil (Gol I)', validUntil: '2099-12-31', taps: 92 },
  { uid: 'RFID-552199042', owner: 'Maya Handayani', unit: 'Residen Tower B #12A', plate: 'B 4102 KLZ', tier: 'Residen', vehicleClass: 'Motor (Gol II)', validUntil: '2025-08-15', taps: 634 }
]

const INITIAL_OPERATORS: OperatorRow[] = [
  { nip: 'NIP-10928', name: 'Budi Santoso', role: 'OPERATOR LOKET', lane: 'Gate Barat 01 (Keluar Mobil)', online: true, statusLine: 'ONLINE (BOOTH #01)', statusSub: 'Login sejak 13:58 WIB', shift: 'Shift Siang', shiftHours: '14:00 - 22:00', trx: '184 Trx', trxSub: 'Rp 920.000 (Tunai)' },
  { nip: 'NIP-10931', name: 'Siti Aminah', role: 'OPERATOR LOKET', lane: 'Gate Barat 02 (Motor)', online: true, statusLine: 'ONLINE (BOOTH #02)', statusSub: 'Login sejak 14:02 WIB', shift: 'Shift Siang', shiftHours: '14:00 - 22:00', trx: '312 Trx', trxSub: 'Rp 624.000 (Tunai)' },
  { nip: 'NIP-10804', name: 'Hendra Wijaya', role: 'SUPERVISOR LAPANGAN', lane: 'All Gates (Mobile Key)', online: true, statusLine: 'ROAMING SUPERVISION', statusSub: 'Handheld Terminal #H-02', shift: 'Shift Siang', shiftHours: '14:00 - 22:00', trx: '14 Override', trxSub: '3 Tiket Hilang Terverifikasi' },
  { nip: 'NIP-10755', name: 'Rian Kusuma', role: 'OPERATOR LOKET', lane: 'Gate Timur 01', online: false, statusLine: 'OFFLINE (LOGGED OFF)', statusSub: 'Shift Berakhir 14:00 WIB', shift: 'Shift Pagi', shiftHours: 'Settlement Selesai', trx: '482 Trx', trxSub: 'Settled Rp 2.410.000' }
]

const AUDIT_ROWS = [
  { time: '14:38:02 WIB', text: 'Penerimaan Tunai Rp 5.000 [Plat: B 8172 KY]', result: 'SUKSES - PALANG BUKA', tone: 'text-[#22c55e]' },
  { time: '14:35:19 WIB', text: 'Tap Member RFID-984210394 [Dr. Adrian Pratama]', result: 'FREE 100% DISKON', tone: 'text-[#38bdf8]' },
  { time: '14:22:45 WIB', text: 'Buka Palang Darurat (Manual Input Plat Motor)', result: 'OVERRIDE PIN OK', tone: 'text-[#f59e0b]' },
  { time: '14:00:00 WIB', text: 'Kasir Login Shift Siang di POS Booth #01', result: 'START SHIFT', tone: 'text-[#22c55e]' }
]

function randomUid(): string {
  return `RFID-${Math.floor(100000000 + Math.random() * 900000000)}`
}

function formatValidDate(iso: string): { main: string; sub: string; perpetual: boolean } {
  if (iso.startsWith('2099')) return { main: 'Seumur Hidup', sub: 'Non-Expired', perpetual: true }
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return { main: iso, sub: '-', perpetual: false }
  const main = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000)
  return { main, sub: days >= 0 ? `Sisa ${days} Hari` : 'Kedaluwarsa', perpetual: false }
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function MemberScreen(): React.JSX.Element {
  const toast = useToast()
  const [tab, setTab] = useState<MemberTab>('member')

  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [memberSearch, setMemberSearch] = useState('')
  const [uid, setUid] = useState('RFID-984210394')
  const [owner, setOwner] = useState('')
  const [tier, setTier] = useState(MEMBER_TIERS[0])
  const [vehicleClass, setVehicleClass] = useState(VEHICLE_CLASSES[0])
  const [plate1, setPlate1] = useState('')
  const [plate2, setPlate2] = useState('')
  const [validUntil, setValidUntil] = useState('2026-12-31')

  const [operators, setOperators] = useState<OperatorRow[]>(INITIAL_OPERATORS)
  const [opSearch, setOpSearch] = useState('')
  const [opNip, setOpNip] = useState('NIP-99210')
  const [opPin, setOpPin] = useState('772910')
  const [opName, setOpName] = useState('')
  const [opRole, setOpRole] = useState(OP_ROLES[0])
  const [opShift, setOpShift] = useState(OP_SHIFTS[1])
  const [opLane, setOpLane] = useState(OP_LANES[0])
  const [opStatus, setOpStatus] = useState('Aktif')

  const [auditFor, setAuditFor] = useState<string | null>(null)

  const filteredMembers = members.filter((m) => {
    const term = memberSearch.toLowerCase().trim()
    return term === '' || `${m.uid} ${m.plate} ${m.owner}`.toLowerCase().includes(term)
  })
  const filteredOperators = operators.filter((o) => {
    const term = opSearch.toLowerCase().trim()
    return term === '' || `${o.nip} ${o.name}`.toLowerCase().includes(term)
  })

  const handleRandomUid = (): void => {
    const next = randomUid()
    setUid(next)
    toast(`Kartu terdeteksi di scanner: ${next}`, 'info')
  }

  const handleRegisterMember = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!uid.trim() || !owner.trim() || !plate1.trim()) {
      toast('Harap lengkapi nomor RFID, Nama, dan Plat Nomor', 'error')
      return
    }
    setMembers((prev) => [
      { uid: uid.trim(), owner: owner.trim(), unit: 'Baru Didaftarkan', plate: plate1.trim().toUpperCase(), plate2: plate2.trim() ? plate2.trim().toUpperCase() : undefined, tier, vehicleClass, validUntil, taps: 0 },
      ...prev
    ])
    toast(`Member Bebas Parkir ${owner.trim()} (${plate1.trim().toUpperCase()}) Berhasil Didaftarkan!`, 'success')
    handleRandomUid()
    setOwner('')
    setPlate1('')
    setPlate2('')
  }

  const handleBlock = (member: Member): void => {
    if (window.confirm(`Konfirmasi: Blokir kartu RFID ${member.uid} dari akses gerbang otomatis?`)) {
      setMembers((prev) => prev.map((m) => (m.uid === member.uid ? { ...m, blocked: true } : m)))
      toast(`Kartu ${member.uid} dinonaktifkan (BLACKLISTED)`, 'error')
    }
  }

  const handleExtend = (member: Member): void => {
    toast(`Masa aktif ${member.uid} diperpanjang +1 Tahun`, 'success')
  }

  const handleAddOperator = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!opNip.trim() || !opName.trim()) {
      toast('Lengkapi NIP dan Nama Operator', 'error')
      return
    }
    const shift = opShift.split('(')[0].trim()
    const hours = opShift.includes('(') ? opShift.split('(')[1].replace(')', '') : ''
    setOperators((prev) => [
      { nip: opNip.trim(), name: opName.trim(), role: opRole.toUpperCase(), lane: opLane, online: false, statusLine: 'TERJADWAL', statusSub: 'Akun Siap Digunakan', shift, shiftHours: hours, trx: '0 Trx', trxSub: 'Shift Baru' },
      ...prev
    ])
    toast(`Operator ${opName.trim()} (${opNip.trim()}) Berhasil Disimpan!`, 'success')
    setOpName('')
    setOpNip(`NIP-${Math.floor(10000 + Math.random() * 90000)}`)
  }

  const handleResetPin = (name: string): void => {
    const pin = window.prompt(`Masukkan 6 Digit PIN Override Baru untuk ${name}:`, '123456')
    if (pin && pin.trim() !== '') {
      toast(`PIN Operator ${name} berhasil diperbarui`, 'success')
    }
  }

  const handleExportAudit = (): void => {
    const header = 'waktu,aktivitas,hasil\n'
    const body = AUDIT_ROWS.map((r) => `"${r.time}","${r.text}","${r.result}"`).join('\n')
    const url = URL.createObjectURL(new Blob([header + body], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `audit-${(auditFor ?? 'operator').replace(/\s+/g, '-').toLowerCase()}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast('Log audit berhasil di-export ke format CSV', 'success')
    setAuditFor(null)
  }

  const inputClass =
    'w-full bg-[#111111] border border-[#27272a] text-white text-xs px-3 py-2 rounded-md focus:outline-none focus:border-[#4fc1ff] transition-colors placeholder:text-[#a1a1aa]'
  const labelClass = 'text-xs font-medium text-[#a1a1aa]'

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Breadcrumb header + tabs */}
      <div className="flex flex-col justify-between gap-3 bg-[#18181b] py-2 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <span>Workstation</span><span>/</span><span>Otoritas &amp; Akses</span><span>/</span>
            <span className="flex items-center gap-1.5 text-[#22c55e]">
              <span className="size-1.5 rounded-full bg-[#22c55e]" />Terminal Barat Online
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-white">Otoritas Keanggotaan &amp; Personel POS</h1>
            <span className="rounded border border-[#27272a] bg-[#1f1f22] px-2 py-0.5 text-[11px] font-medium text-[#a1a1aa]">Sync Aktif</span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#27272a] bg-[#111111] p-1">
          <button
            type="button"
            onClick={() => setTab('member')}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              tab === 'member' ? 'bg-[#264f78] text-white shadow-sm' : 'text-[#a1a1aa] hover:text-white'
            )}
          >
            <IdCard className="size-[15px]" aria-hidden />
            <span>Member Bebas Parkir</span>
            <span className="rounded bg-[#4fc1ff]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#4fc1ff]">{members.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('operator')}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              tab === 'operator' ? 'bg-[#264f78] text-white shadow-sm' : 'text-[#a1a1aa] hover:text-white'
            )}
          >
            <IdCard className="size-[15px]" aria-hidden />
            <span>Karyawan &amp; Operator</span>
            <span className="rounded bg-[#1f1f22] px-1.5 py-0.5 text-[10px] text-[#a1a1aa]">{operators.length}</span>
          </button>
        </div>
      </div>

      {/* KPI cards (telemetri mock, tanpa API) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-lg border border-[#27272a] bg-[#1e1e1e] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#a1a1aa]">Total Member Non-Pungutan</span>
            <div className="text-2xl font-bold text-white">1,492</div>
            <span className="flex items-center gap-1 text-[11px] text-[#22c55e]">
              <ShieldCheck className="size-[13px]" aria-hidden /> 100% Subsidi Operasional
            </span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg border border-[#27272a] bg-[#111111] text-[#38bdf8]">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#27272a] bg-[#1e1e1e] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#a1a1aa]">Tap-in Hari Ini (Bebas Biaya)</span>
            <div className="text-2xl font-bold text-[#4fc1ff]">648</div>
            <span className="text-[11px] text-[#a1a1aa]">Valuasi: <span className="line-through">Rp 3.240.000</span></span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg border border-[#27272a] bg-[#111111] text-[#4fc1ff]">
            <Nfc className="size-5" aria-hidden />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#27272a] bg-[#1e1e1e] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#a1a1aa]">Operator Aktif (Shift Siang)</span>
            <div className="text-2xl font-bold text-white">08<span className="text-xs font-normal text-[#a1a1aa]"> / 10 Booth</span></div>
            <span className="flex items-center gap-1 text-[11px] text-[#22c55e]">
              <span className="size-1.5 rounded-full bg-[#22c55e]" /> Semua Jalur Normal
            </span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg border border-[#27272a] bg-[#111111] text-[#f59e0b]">
            <Users className="size-5" aria-hidden />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#27272a] bg-[#1e1e1e] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#a1a1aa]">Transaksi Cashier Hari Ini</span>
            <div className="text-2xl font-bold text-[#ffb690]">Rp 48.9M</div>
            <span className="flex items-center gap-1 text-[11px] text-[#a1a1aa]">
              Rerata 6.2s / Kendaraan
            </span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg border border-[#27272a] bg-[#111111] text-[#f97316]">
            <Banknote className="size-5" aria-hidden />
          </div>
        </div>
      </div>

      {tab === 'member' ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Registration form */}
            <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
              <div className="flex flex-col gap-4 rounded-lg border border-[#27272a] bg-[#1e1e1e] p-5">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-[18px] text-[#4fc1ff]" aria-hidden />
                    <h2 className="text-sm font-semibold text-white">Registrasi Kartu Member</h2>
                  </div>
                  <span className="rounded bg-[#22c55e]/15 px-2 py-0.5 text-[11px] font-semibold text-[#22c55e]">Free 100%</span>
                </div>
                <div className="flex items-start gap-2.5 rounded-md border border-[#27272a] bg-[#111111] p-3">
                  <ShieldCheck className="mt-0.5 size-[18px] text-[#22c55e]" aria-hidden />
                  <div className="flex flex-col gap-0.5">
                    <div className="text-xs font-semibold text-white">Bebas Parkir Otomatis (Rp 0)</div>
                    <div className="text-[11px] leading-relaxed text-[#a1a1aa]">Palang pintu terbuka langsung tanpa kalkulasi tarif komersial saat tap-in/out.</div>
                  </div>
                </div>
                <form onSubmit={handleRegisterMember} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                      <label htmlFor="member-uid" className="font-medium">Nomor UID RFID / Kartu</label>
                      <span className="flex items-center gap-1 text-[11px] text-[#4fc1ff]">
                        <span className="size-1.5 animate-pulse rounded-full bg-[#4fc1ff]" /> Sensor Siap
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input id="member-uid" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Ketik UID atau tap scanner..." required type="text" className={cn(inputClass, 'pr-16')} />
                      <button type="button" onClick={handleRandomUid} title="Acak UID dari scanner" className="absolute right-1.5 flex cursor-pointer items-center gap-1 rounded bg-[#1f1f22] px-2.5 py-1 text-xs font-medium text-[#4fc1ff] hover:bg-[#2a2a2d]">
                        <Dices className="size-3.5" aria-hidden /> Acak
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="member-owner" className={labelClass}>Nama Pemilik / Tenant / Unit</label>
                    <input id="member-owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Contoh: PT Danendra Logistik" required type="text" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="member-tier" className={labelClass}>Kategori Member</label>
                      <select id="member-tier" value={tier} onChange={(e) => setTier(e.target.value)} className={inputClass}>
                        {MEMBER_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="member-class" className={labelClass}>Golongan Kendaraan</label>
                      <select id="member-class" value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value)} className={inputClass}>
                        {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="member-plate1" className={labelClass}>Plat Utama</label>
                      <input id="member-plate1" value={plate1} onChange={(e) => setPlate1(e.target.value.toUpperCase())} placeholder="B 1234 CD" required type="text" className={cn(inputClass, 'text-center uppercase tracking-wider')} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="member-plate2" className={labelClass}>Plat Cadangan</label>
                      <input id="member-plate2" value={plate2} onChange={(e) => setPlate2(e.target.value.toUpperCase())} placeholder="Opsional" type="text" className={cn(inputClass, 'text-center uppercase tracking-wider')} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className={labelClass}>Masa Berlaku Kartu</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={validUntil} onChange={(e) => setValidUntil(e.target.value)} type="date" className={cn(inputClass, 'px-2.5')} aria-label="Masa berlaku kartu" />
                      <button type="button" onClick={() => { setValidUntil('2099-12-31'); toast('Masa berlaku diatur Seumur Hidup (Perpetual)', 'success') }} className="flex cursor-pointer items-center justify-center gap-1 rounded-md border border-[#27272a] bg-[#1f1f22] py-2 text-xs font-medium text-[#4fc1ff] transition-colors hover:bg-[#2a2a2d]">
                        <InfinityIcon className="size-[14px]" aria-hidden /><span>Seumur Hidup</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button type="submit" className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#f97316] text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#ea580c]">
                      <Save className="size-4" aria-hidden /><span>Daftarkan Kartu</span>
                    </button>
                    <button type="button" onClick={() => toast('Memuat dialog impor file CSV/Excel RFID Master Data...', 'info')} className="flex h-10 cursor-pointer items-center justify-center gap-1 rounded-md border border-[#27272a] bg-[#111111] px-3 text-xs font-medium text-[#d4d4d4] transition-colors hover:bg-[#1f1f22]">
                      <Upload className="size-4 text-[#a1a1aa]" aria-hidden /><span>Impor</span>
                    </button>
                  </div>
                </form>
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-[#27272a] bg-[#1e1e1e] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Antena Desktop Reader</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#22c55e]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" /> USB COM-4 Online
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col rounded border border-[#27272a] bg-[#111111] p-2">
                    <span className="text-[10px] text-[#a1a1aa]">Device</span>
                    <span className="truncate font-medium text-white">ACR122U</span>
                  </div>
                  <div className="flex flex-col rounded border border-[#27272a] bg-[#111111] p-2">
                    <span className="text-[10px] text-[#a1a1aa]">Baud Rate</span>
                    <span className="font-medium text-white">115200</span>
                  </div>
                  <div className="flex flex-col rounded border border-[#27272a] bg-[#111111] p-2">
                    <span className="text-[10px] text-[#a1a1aa]">Auth Key</span>
                    <span className="font-medium text-[#22c55e]">Decrypted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Member table */}
            <div className="col-span-12 flex flex-col gap-4 xl:col-span-8">
              <div className="flex h-full flex-col rounded-lg border border-[#27272a] bg-[#1e1e1e] p-5">
                <div className="flex flex-col justify-between gap-3 border-b border-[#27272a] pb-4 md:flex-row md:items-center">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-white">Daftar Member Aktif (Bebas Biaya)</h2>
                    <span className="rounded border border-[#27272a] bg-[#111111] px-2 py-0.5 text-xs text-[#a1a1aa]">{filteredMembers.length} kartu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Cari RFID, Plat, Pemilik..." type="text" className="w-64 rounded-md border border-[#27272a] bg-[#111111] py-1.5 pl-8 pr-3 text-xs text-white outline-none transition-colors placeholder:text-[#a1a1aa] focus:border-[#4fc1ff]" />
                      <Search className="absolute left-2.5 top-2 size-[15px] text-[#a1a1aa]" aria-hidden />
                    </div>
                    <button type="button" onClick={() => toast('Daftar member telah disinkronkan dengan Core DB', 'success')} title="Refresh data" className="cursor-pointer rounded-md border border-[#27272a] bg-[#111111] p-1.5 text-[#a1a1aa] transition-colors hover:bg-[#1f1f22] hover:text-white">
                      <RefreshCw className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex-1 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#27272a] font-medium text-[#a1a1aa]">
                        <th className="px-3 py-3">UID RFID</th>
                        <th className="px-3 py-3">Pemilik / Unit</th>
                        <th className="px-3 py-3">Plat Nomor</th>
                        <th className="px-3 py-3">Kategori</th>
                        <th className="px-3 py-3">Masa Berlaku</th>
                        <th className="px-3 py-3 text-center">Tap In/Out</th>
                        <th className="px-3 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#d4d4d4]">
                      {filteredMembers.length === 0 ? (
                        <tr><td colSpan={7} className="px-3 py-8 text-center font-mono text-[#a1a1aa]">Tidak ada member yang cocok.</td></tr>
                      ) : (
                        filteredMembers.map((m) => {
                          const valid = formatValidDate(m.validUntil)
                          return (
                            <tr key={m.uid} className={cn('border-b border-[#27272a]/50 transition-colors hover:bg-[#1f1f22]/50', m.blocked && 'opacity-35')}>
                              <td className="px-3 py-3.5 font-medium text-[#4fc1ff]">{m.uid}</td>
                              <td className="px-3 py-3.5">
                                <div className="font-medium text-white">{m.owner}</div>
                                <div className="text-[11px] text-[#a1a1aa]">{m.unit}</div>
                              </td>
                              <td className="px-3 py-3.5">
                                <div className="inline-block rounded bg-[#111111] px-1.5 py-0.5 text-sm font-bold text-[#ffb690]">{m.plate}</div>
                                {m.plate2 && <span className="mt-0.5 block text-[10px] text-[#a1a1aa]">Cadangan: {m.plate2}</span>}
                              </td>
                              <td className="px-3 py-3.5">
                                <span className="rounded bg-[#22c55e]/20 px-1.5 py-0.5 text-[11px] font-bold text-[#22c55e]">{m.tier}</span>
                                <span className="mt-0.5 block text-[11px] text-[#a1a1aa]">{m.vehicleClass}</span>
                              </td>
                              <td className="px-3 py-3.5 text-xs">
                                <span className={cn('font-bold', valid.perpetual ? 'text-[#22c55e]' : 'text-white')}>{valid.main}</span>
                                <span className="block text-[11px] text-[#a1a1aa]">{valid.sub}</span>
                              </td>
                              <td className="px-3 py-3.5 text-center text-white">{m.taps}x</td>
                              <td className="px-3 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={() => handleExtend(m)} title="Perpanjang Masa" className="cursor-pointer rounded bg-[#1f1f22] p-1 text-[#d4d4d4] transition-colors hover:bg-[#38bdf8] hover:text-[#0a0a0a]">
                                    <CalendarPlus className="size-4" aria-hidden />
                                  </button>
                                  <button type="button" onClick={() => handleBlock(m)} title="Blokir Kartu RFID" disabled={m.blocked} className="cursor-pointer rounded bg-[#1f1f22] p-1 text-[#ef4444] transition-colors hover:bg-[#ef4444] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                                    <Ban className="size-4" aria-hidden />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Operator form */}
            <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
              <div className="rounded-lg bg-[#1b1b1e] p-4 shadow-md">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-1.5 text-sm text-white">
                    <IdCard className="size-[18px] text-[#f59e0b]" aria-hidden />
                    <span>TAMBAH KARYAWAN / AKUN POS</span>
                  </div>
                  <span className="rounded bg-[#264f78] px-1.5 py-0.5 text-xs text-[#4fc1ff]">HAK AKSES BOOTH</span>
                </div>
                <form onSubmit={handleAddOperator} className="mt-1 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="op-nip" className={labelClass}>NIP / ID KARYAWAN</label>
                      <input id="op-nip" value={opNip} onChange={(e) => setOpNip(e.target.value)} placeholder="NIP-202409" required type="text" className={inputClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="op-pin" className={labelClass}>PIN OVERRIDE CEPAT</label>
                      <input id="op-pin" value={opPin} onChange={(e) => setOpPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 Angka" required type="password" maxLength={6} className={cn(inputClass, 'text-center tracking-widest text-[#4fc1ff]')} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="op-name" className={labelClass}>NAMA LENGKAP OPERATOR</label>
                    <input id="op-name" value={opName} onChange={(e) => setOpName(e.target.value)} placeholder="Contoh: Budi Santoso / Siti Aminah" required type="text" className={cn(inputClass, 'text-sm')} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="op-role" className={labelClass}>ROLE &amp; HAK AKSES SISTEM</label>
                    <select id="op-role" value={opRole} onChange={(e) => setOpRole(e.target.value)} className={cn(inputClass, 'text-sm')}>
                      <option value="Operator Loket">Operator Loket (Cashier &amp; Buka Palang)</option>
                      <option value="Supervisor Lapangan">Supervisor Lapangan (Override &amp; Void Tiket)</option>
                      <option value="Teknisi Hardware">Teknisi Hardware (Gate Barrier &amp; Loop Sensor)</option>
                      <option value="Super Admin">Super Admin (Akses Penuh Audit &amp; Settlement)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="op-shift" className={labelClass}>PENUGASAN SHIFT DEFAULT</label>
                    <select id="op-shift" value={opShift} onChange={(e) => setOpShift(e.target.value)} className={cn(inputClass, 'text-sm')}>
                      {OP_SHIFTS.map((s) => <option key={s} value={s}>{s} WIB</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="op-lane" className={labelClass}>LOKASI PENUGASAN GATE</label>
                      <select id="op-lane" value={opLane} onChange={(e) => setOpLane(e.target.value)} className={cn(inputClass, 'text-sm')}>
                        <option value="Gate Barat 01">Gate Barat 01 (Utama)</option>
                        <option value="Gate Barat 02">Gate Barat 02 (Motor)</option>
                        <option value="Gate Timur 01">Gate Timur 01 (Mobil)</option>
                        <option value="All Gates">All Gates (Mobile Floater)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="op-status" className={labelClass}>STATUS REKENING/AKUN</label>
                      <select id="op-status" value={opStatus} onChange={(e) => setOpStatus(e.target.value)} className={cn(inputClass, 'text-sm text-[#22c55e]')}>
                        <option value="Aktif">Aktif (Dapat Login)</option>
                        <option value="Ditangguhkan">Ditangguhkan (Kunci)</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-1">
                    <button type="submit" className="flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-[#f97316] text-sm uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#ea580c]">
                      <UserPlus className="size-[18px]" aria-hidden />
                      <span>SIMPAN AKUN OPERATOR [+]</span>
                    </button>
                  </div>
                </form>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-[#1b1b1e] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">KEBIJAKAN SECURITY LOKET</span>
                  <span className="font-mono text-xs text-[#f59e0b]">AUTH v2.1</span>
                </div>
                <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-[#a1a1aa]">
                  <li>Auto-logout saat idle selama 15 menit tanpa aktivitas scanner.</li>
                  <li>Override pembukaan gerbang manual memerlukan input PIN supervisor.</li>
                  <li>Settlement kasir (setoran tunai) otomatis terkunci di akhir jam shift.</li>
                </ul>
              </div>
            </div>

            {/* Operator table */}
            <div className="col-span-12 flex flex-col gap-4 xl:col-span-8">
              <div className="flex h-full flex-col rounded-lg bg-[#1b1b1e] p-4 shadow-md">
                <div className="flex flex-col justify-between gap-3 pb-2 md:flex-row md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="text-base font-bold text-white">Daftar Operator &amp; Status Shift Berjalan</div>
                    <span className="rounded bg-[#22c55e]/20 px-1.5 py-0.5 text-xs text-[#22c55e]">
                      {operators.filter((o) => o.online).length} ONLINE SEKARANG
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input value={opSearch} onChange={(e) => setOpSearch(e.target.value)} placeholder="Cari NIP, nama operator..." type="text" className="w-56 rounded bg-[#111111] py-1.5 pl-8 pr-3 text-sm text-white outline-none placeholder:text-[#a1a1aa] focus:ring-1 focus:ring-[#4fc1ff]" />
                      <Search className="absolute left-2 top-2 size-4 text-[#a1a1aa]" aria-hidden />
                    </div>
                    <button type="button" onClick={() => toast('Status loket kasir & transaksi shift diperbarui', 'success')} title="Refresh" className="cursor-pointer rounded bg-[#1f1f22] p-1.5 text-white transition-colors hover:bg-[#264f78]">
                      <RefreshCw className="size-[18px]" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#1f1f22] text-xs uppercase text-[#a1a1aa]">
                        <th className="px-3 py-2.5">OPERATOR / NIP</th>
                        <th className="px-3 py-2.5">ROLE &amp; PENUGASAN</th>
                        <th className="px-3 py-2.5">STATUS LOKET</th>
                        <th className="px-3 py-2.5">SHIFT SAAT INI</th>
                        <th className="px-3 py-2.5 text-right">TOTAL TRANSAKSI</th>
                        <th className="px-3 py-2.5 text-right">AKSI CEPAT</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredOperators.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-8 text-center font-mono text-xs text-[#a1a1aa]">Tidak ada operator yang cocok.</td></tr>
                      ) : (
                        filteredOperators.map((o, i) => (
                          <tr key={o.nip} className={cn('transition-colors', i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#111111]', 'hover:bg-[#1f1f22]')}>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className={cn('flex size-7 items-center justify-center rounded-full text-xs font-bold', o.online ? 'bg-[#264f78] text-[#4fc1ff]' : 'bg-[#1f1f22] text-[#ffb690]')}>
                                  {initials(o.name)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-white">{o.name}</span>
                                  <span className="text-xs text-[#a1a1aa]">{o.nip}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="rounded bg-[#264f78] px-1.5 py-0.5 text-xs font-bold text-[#4fc1ff]">{o.role}</span>
                              <span className="mt-0.5 block text-[11px] text-[#a1a1aa]">{o.lane}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={cn('flex items-center gap-1 text-xs font-bold', o.online ? 'text-[#22c55e]' : o.statusLine === 'TERJADWAL' ? 'text-[#f59e0b]' : 'text-[#a1a1aa]')}>
                                <span className={cn('size-2 rounded-full', o.online ? 'bg-[#22c55e]' : o.statusLine === 'TERJADWAL' ? 'bg-[#f59e0b]' : 'bg-[#a1a1aa]')} />
                                {o.statusLine}
                              </span>
                              <span className="block text-[11px] text-[#a1a1aa]">{o.statusSub}</span>
                            </td>
                            <td className="px-3 py-2.5 text-xs">
                              <span className="text-white">{o.shift}</span>
                              <span className="block text-[11px] text-[#a1a1aa]">{o.shiftHours}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-[#22c55e]">
                              <div>{o.trx}</div>
                              <div className="text-[11px] font-normal text-[#a1a1aa]">{o.trxSub}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => handleResetPin(o.name)} title="Reset PIN Override" className="cursor-pointer rounded bg-[#1f1f22] px-2 py-1 text-xs text-white transition-colors hover:bg-[#264f78]">
                                  Reset PIN
                                </button>
                                <button type="button" onClick={() => setAuditFor(o.name)} title="Lihat Audit Log" className="cursor-pointer rounded bg-[#1f1f22] p-1 text-[#4fc1ff] transition-colors hover:bg-[#2a2a2d]">
                                  <ReceiptText className="size-4" aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit modal */}
      {auditFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col gap-4 rounded-lg bg-[#1e1e1e] p-5 shadow-xl">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5 text-base font-bold text-white">
                <ReceiptText className="text-[#4fc1ff]" aria-hidden />
                <span>Audit Log Operator: {auditFor}</span>
              </div>
              <button type="button" onClick={() => setAuditFor(null)} title="Tutup [ESC]" className="cursor-pointer rounded p-1 text-[#a1a1aa] transition-colors hover:bg-[#1f1f22] hover:text-white">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded bg-[#111111] p-2 text-xs text-[#a1a1aa]">
              {AUDIT_ROWS.map((row) => (
                <div key={row.time} className="flex justify-between gap-2 rounded bg-[#131316] px-2 py-1">
                  <span className="shrink-0 text-[#4fc1ff]">{row.time}</span>
                  <span className="flex-1 text-white">{row.text}</span>
                  <span className={cn('shrink-0 font-semibold', row.tone)}>{row.result}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAuditFor(null)} className="cursor-pointer rounded bg-[#1f1f22] px-4 py-2 text-xs text-white transition-colors hover:bg-[#2a2a2d]">
                Tutup Jendela
              </button>
              <button type="button" onClick={handleExportAudit} className="flex cursor-pointer items-center gap-1 rounded bg-[#264f78] px-4 py-2 text-xs text-white transition-colors hover:bg-[#4fc1ff] hover:text-[#0a0a0a]">
                <Download className="size-4" aria-hidden />
                <span>Unduh Log (CSV/PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
