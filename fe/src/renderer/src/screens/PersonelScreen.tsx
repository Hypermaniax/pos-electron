import type React from 'react'
import { useEffect, useState } from 'react'
import { useToast } from '../hooks/useToast'
import { fetchPersonel, setPersonelActive } from '../lib/server-api'
import type { PersonelRow } from '../lib/server-api'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

interface MemberDraft {
  uid: string
  name: string
  unit: string
  plate: string
  plate2: string
  tier: string
  vehicleClass: string
  valid: string
  taps: number
}

const MEMBER_TIERS = ['VIP Eksekutif', 'Karyawan Tenant', 'Residen Apartemen', 'Dinas / Khusus']

const MEMBER_VEHICLE_CLASSES = [
  'Mobil (Golongan I)',
  'Motor (Golongan II)',
  'Truk / Box (Golongan III)'
]

const SAMPLE_MEMBERS: MemberDraft[] = [
  {
    uid: 'RFID-984210394',
    name: 'Dr. Adrian Pratama',
    unit: 'Executive Floor 24 #PH01',
    plate: 'B 1234 CD',
    plate2: 'B 8899 VIP',
    tier: 'VIP Eksekutif',
    vehicleClass: 'Mobil (Gol I)',
    valid: 'Seumur Hidup',
    taps: 412
  },
  {
    uid: 'RFID-110293841',
    name: 'PT Danendra Logistik',
    unit: 'Karyawan Tenant L-3',
    plate: 'B 9021 TGA',
    plate2: '',
    tier: 'Tenant Gedung',
    vehicleClass: 'Mobil (Gol I)',
    valid: '31 Des 2025',
    taps: 188
  },
  {
    uid: 'RFID-771239904',
    name: 'Kolonel Suryo W.',
    unit: 'Tamu Protokoler',
    plate: 'B 1984 RFS',
    plate2: '',
    tier: 'Dinas Khusus',
    vehicleClass: 'Mobil (Gol I)',
    valid: 'Seumur Hidup',
    taps: 92
  },
  {
    uid: 'RFID-552199042',
    name: 'Maya Handayani',
    unit: 'Residen Tower B #12A',
    plate: 'B 4102 KLZ',
    plate2: '',
    tier: 'Residen',
    vehicleClass: 'Motor (Gol II)',
    valid: '15 Agu 2025',
    taps: 634
  }
]

function StatCard({
  label,
  value,
  hint,
  valueClass = 'text-foreground'
}: {
  label: string
  value: string
  hint: string
  valueClass?: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded border border-border bg-card p-4">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-2xl font-bold ${valueClass}`}>{value}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>
    </div>
  )
}

function MemberBoard(): React.JSX.Element {
  const toast = useToast()
  const [members, setMembers] = useState<MemberDraft[]>(SAMPLE_MEMBERS)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({
    uid: 'RFID-000000000',
    name: '',
    unit: '',
    plate: '',
    plate2: '',
    tier: MEMBER_TIERS[0],
    vehicleClass: MEMBER_VEHICLE_CLASSES[0],
    valid: '2026-12-31'
  })

  const filtered = members.filter((member) =>
    `${member.uid} ${member.name} ${member.plate} ${member.unit}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )

  const register = (): void => {
    if (!form.uid || !form.name || !form.plate) {
      toast('Lengkapi nomor RFID, pemilik, dan plat nomor.', 'error')
      return
    }
    setMembers((prev) => [
      {
        uid: form.uid,
        name: form.name,
        unit: form.unit || 'Baru didaftarkan',
        plate: form.plate.toUpperCase(),
        plate2: form.plate2.toUpperCase(),
        tier: form.tier,
        vehicleClass: form.vehicleClass,
        valid: form.valid,
        taps: 0
      },
      ...prev
    ])
    toast(
      'Kartu terdaftar sementara di layar — endpoint CRUD member belum tersedia di backend.',
      'info'
    )
    setForm((prev) => ({ ...prev, uid: '', name: '', plate: '', plate2: '', unit: '' }))
  }

  const block = (uid: string): void => {
    setMembers((prev) =>
      prev.map((member) => (member.uid === uid ? { ...member, taps: -1 } : member))
    )
    toast(
      `Kartu ${uid} ditandai blokir lokal — status blacklist belum tersinkron ke palang.`,
      'info'
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total Member Non-Pungutan"
          value={String(members.length)}
          hint="100% subsidi — data lokal, belum sync"
        />
        <StatCard label="Tap-in Hari Ini" value="—" hint="valuasi bebas biaya: belum tersedia" />
        <StatCard
          label="Operator Aktif (Shift)"
          value="—"
          hint="statistik shift: lihat tab karyawan"
        />
        <StatCard
          label="Transaksi Kasier Hari Ini"
          value="—"
          hint="rerata kecepatan: belum tersedia"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-4">
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-mono text-sm font-semibold text-foreground">
                Registrasi Kartu Member
              </h2>
              <span className="rounded bg-park-success/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-park-success">
                Free 100%
              </span>
            </div>
            <div className="flex items-start gap-2.5 rounded-md border border-border bg-park-secondary p-3 text-foreground">
              <span className="mt-0.5 text-lg text-park-success">✓</span>
              <div className="flex flex-col gap-0.5">
                <div className="font-mono text-xs font-semibold">Bebas Parkir Otomatis (Rp 0)</div>
                <div className="text-[11px] leading-relaxed text-muted-foreground">
                  Palang pintu terbuka langsung tanpa kalkulasi tarif komersial saat tap-in/out —
                  aturan ini belum didukung rule engine server.
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                Nomor UID RFID / Kartu
                <Input
                  className="font-mono"
                  value={form.uid}
                  placeholder="Tap scanner atau ketik UID"
                  onChange={(event) => setForm((prev) => ({ ...prev, uid: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                Nama Pemilik / Tenant / Unit
                <Input
                  value={form.name}
                  placeholder="Contoh: Dr. Adrian Pratama (Penthouse)"
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                Unit / Departemen
                <Input
                  value={form.unit}
                  placeholder="Opsional"
                  onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                  Kategori Member
                  <Select
                    value={form.tier}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, tier: String(value) }))}
                  >
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier} className="font-mono text-xs">
                          {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                  Golongan Kendaraan
                  <Select
                    value={form.vehicleClass}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, vehicleClass: String(value) }))
                    }
                  >
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_VEHICLE_CLASSES.map((vehicleClass) => (
                        <SelectItem
                          key={vehicleClass}
                          value={vehicleClass}
                          className="font-mono text-xs"
                        >
                          {vehicleClass}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                  Plat Utama
                  <Input
                    className="text-center font-mono font-bold uppercase"
                    value={form.plate}
                    placeholder="B 1234 CD"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, plate: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                  Plat Cadangan
                  <Input
                    className="text-center font-mono uppercase"
                    value={form.plate2}
                    placeholder="Opsional"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, plate2: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                Masa Berlaku Kartu
                <Input
                  type="date"
                  className="font-mono"
                  value={form.valid}
                  onChange={(event) => setForm((prev) => ({ ...prev, valid: event.target.value }))}
                />
              </label>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  className="flex-1 font-mono"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      uid: 'RFID-' + Math.floor(100000000 + Math.random() * 900000000)
                    }))
                    toast('Simulasi tap scanner: nomor acak diisi ke form.', 'info')
                  }}
                  type="button"
                >
                  ⇊ Simulasi Tap
                </Button>
                <Button className="flex-1 font-mono" onClick={register} type="button">
                  Daftarkan Kartu
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground">
                Antena Desktop Reader
              </span>
              <span className="font-mono text-[11px] font-medium text-park-warning">
                STANDBY — USB belum tersedia
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="flex flex-col rounded border border-border bg-park-secondary p-2">
                <span className="text-[10px] text-muted-foreground">Device</span>
                <span className="truncate font-medium">ACR122U</span>
              </div>
              <div className="flex flex-col rounded border border-border bg-park-secondary p-2">
                <span className="text-[10px] text-muted-foreground">Baud Rate</span>
                <span>115200</span>
              </div>
              <div className="flex flex-col rounded border border-border bg-park-secondary p-2">
                <span className="text-[10px] text-muted-foreground">Auth Key</span>
                <span className="text-muted-foreground">—</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-lg border border-border bg-card p-5 xl:col-span-8">
          <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-sm font-semibold text-foreground">
                Daftar Member Aktif (Bebas Biaya)
              </h2>
              <span className="rounded border border-border bg-park-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {members.length} kartu
              </span>
            </div>
            <Input
              className="font-mono text-xs md:w-64"
              placeholder="Cari RFID, plat, pemilik..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-3">UID RFID</th>
                  <th className="px-3 py-3">Pemilik / Unit</th>
                  <th className="px-3 py-3">Plat Nomor</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3">Masa Berlaku</th>
                  <th className="px-3 py-3 text-center">Tap In/Out</th>
                  <th className="px-3 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr
                    key={member.uid}
                    className={`border-b border-border/50 transition-colors hover:bg-park-secondary ${
                      member.taps < 0 ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="px-3 py-3.5 font-medium text-primary">{member.uid}</td>
                    <td className="px-3 py-3.5">
                      <div className="font-semibold text-foreground">{member.name || '—'}</div>
                      <div className="text-[11px] text-muted-foreground">{member.unit || '—'}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded bg-park-secondary px-2 py-0.5 font-bold">
                        {member.plate}
                      </span>
                      {member.plate2 ? (
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          Cadangan: {member.plate2}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded bg-park-success/15 px-2 py-0.5 text-[11px] font-medium text-park-success">
                        {member.tier}
                      </span>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {member.vehicleClass}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-medium text-park-success">
                        {member.valid === '2099-12-31' ? 'Seumur Hidup' : member.valid}
                      </span>
                      <div className="text-[11px] text-muted-foreground">Status lokal</div>
                    </td>
                    <td className="px-3 py-3.5 text-center font-medium">
                      {member.taps < 0 ? 'BLOKIR' : `${member.taps}x`}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 font-mono text-[11px]"
                          onClick={() =>
                            toast(
                              `Perpanjang ${member.uid}: belum tersedia — endpoint member belum ada.`,
                              'info'
                            )
                          }
                        >
                          ⟳ Perpanjang
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 font-mono text-[11px] text-park-error"
                          onClick={() => block(member.uid)}
                        >
                          ⊘ Blokir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center font-mono text-xs text-muted-foreground"
                    >
                      TIDAK ADA MEMBER YANG SESUAI PENCARIAN.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted-foreground">
            <span>
              Menampilkan {filtered.length} dari {members.length} kartu — sumber data lokal
              sementara
            </span>
            <span>CRUD member menunggu endpoint backend</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function OperatorBoard(): React.JSX.Element {
  const toast = useToast()
  const [rows, setRows] = useState<PersonelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      setLoading(true)
      const result = await fetchPersonel()
      if (cancelled) return
      if (result.ok) {
        setRows(result.data.items)
        setError(null)
      } else {
        setError(result.error.message)
        setRows([])
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [reloadTick])

  const filtered = rows.filter((row) =>
    `${row.name} ${row.username} ${row.role}`.toLowerCase().includes(query.toLowerCase())
  )
  const activeCount = rows.filter((row) => row.active).length

  const toggleActive = async (row: PersonelRow): Promise<void> => {
    setBusyId(row.id)
    const result = await setPersonelActive(row.id, !row.active)
    if (result.ok) {
      const updated = result.data
      setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast(
        `${updated.name} ${updated.active ? 'diaktifkan (dapat login)' : 'dinonaktifkan (dilangkau logout auto)'}.`,
        'success'
      )
    } else {
      toast(result.error.message, 'error')
    }
    setBusyId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total Petugas Terdaftar"
          value={loading ? '…' : String(rows.length)}
          hint="data nyata dari site server (tabel users)"
        />
        <StatCard
          label="Rekening Aktif"
          value={loading ? '…' : String(activeCount)}
          hint="status aktif = boleh login"
        />
        <StatCard
          label="On-Duty Shift Berjalan"
          value="—"
          hint="penugasan gate/shift: belum tersedia"
        />
        <StatCard label="Kepatuhan Kas Laci" value="—" hint="rekap kas: belum tersedia" />
      </div>

      <div className="flex flex-col rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-sm font-semibold text-foreground">
              Daftar Operator (Akun Sistem)
            </h2>
            <span className="rounded border border-border bg-park-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {rows.length} akun
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="font-mono text-xs md:w-64"
              placeholder="Cari nama / username / role..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              className="font-mono"
              onClick={() => setReloadTick((prev) => prev + 1)}
            >
              ⟳ Refresh
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="py-6 text-center font-mono text-xs text-muted-foreground">
            MEMUAT DATA PERSONEL...
          </div>
        ) : error ? (
          <div className="py-6 text-center font-mono text-xs text-park-error">
            {error.toUpperCase()}
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-park-secondary text-muted-foreground uppercase">
                  <th className="px-3 py-2.5">Nama / Username</th>
                  <th className="px-3 py-2.5">Role Sistem</th>
                  <th className="px-3 py-2.5">ID Akun</th>
                  <th className="px-3 py-2.5">Permission</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 transition-colors hover:bg-park-secondary"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-foreground">{row.name}</div>
                      <div className="text-[11px] text-muted-foreground">@{row.username}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-park-secondary px-1.5 py-0.5 font-bold uppercase text-primary">
                        {row.role}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{row.id}</td>
                    <td className="px-3 text-[11px] text-muted-foreground">
                      {row.permissions.join(', ') || '—'}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-bold ${
                          row.active
                            ? 'bg-park-success/15 text-park-success'
                            : 'bg-park-secondary text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${row.active ? 'animate-pulse bg-park-success' : 'bg-muted-foreground'}`}
                        />
                        {row.active ? 'AKTIF (BOLEH LOGIN)' : 'DINONAKTIFKAN'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 font-mono text-[11px]"
                          disabled={busyId === row.id}
                          onClick={() => void toggleActive(row)}
                        >
                          {busyId === row.id ? '...' : row.active ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 font-mono text-[11px]"
                          onClick={() =>
                            toast(
                              `Reset PIN ${row.name}: belum tersedia — CRUD akun belum didukung backend.`,
                              'info'
                            )
                          }
                        >
                          Reset PIN
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 font-mono text-[11px]"
                          onClick={() =>
                            toast(
                              `Audit log ${row.name}: aktif secara nyata via tab Riwayat > Audit server.`,
                              'info'
                            )
                          }
                        >
                          Audit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center font-mono text-xs text-muted-foreground"
                    >
                      TIDAK ADA AKUN YANG SESUAI PENCARIAN.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted-foreground">
          <span>Daftar total: {rows.length} akun terdaftar di site server</span>
          <span className="text-primary">
            Penjadwalan shift &amp; penugasan gate menunggu endpoint
          </span>
        </div>
      </div>
    </div>
  )
}

export function PersonelScreen(): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6 font-mono">
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-card p-5 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-xs text-primary">
            <span className="inline-block size-2 rounded-full bg-primary" />
            <span className="uppercase tracking-widest">Otoritas &amp; Akses</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Otoritas Keanggotaan &amp; Personel POS
          </h1>
        </div>
        <span className="w-fit rounded border border-border bg-park-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          Tab Operator = data nyata server • Tab Member = data lokal sementara
        </span>
      </div>

      <Tabs defaultValue="member" className="flex min-h-0 flex-1 flex-col gap-3">
        <TabsList className="w-fit rounded border border-border bg-card font-mono text-[11px]">
          <TabsTrigger value="member">Member Bebas Parkir</TabsTrigger>
          <TabsTrigger value="operator">Karyawan &amp; Operator</TabsTrigger>
        </TabsList>
        <TabsContent value="member" className="mt-0">
          <MemberBoard />
        </TabsContent>
        <TabsContent value="operator" className="mt-0">
          <OperatorBoard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
