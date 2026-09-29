import { useState } from 'react'
import type React from 'react'
import { ParkModal } from '../park-pos/ParkModal'
import { useToast } from '@renderer/hooks/useToast'

type SopTab = 'tiket' | 'palang' | 'qris'

const SOP_TABS: Array<{
  key: SopTab
  label: string
  title: string
  titleClass: string
  items: React.ReactNode[]
}> = [
  {
    key: 'tiket',
    label: 'Tiket Hilang',
    title: 'Prosedur Tiket Hilang (Denda + Tarif Parkir):',
    titleClass: 'text-cyan-400',
    items: [
      <>Minta pengemudi menunjukkan STNK asli sesuai plat nomor kendaraan.</>,
      <>Cek rekaman ANPR kamera masuk berdasarkan perkiraan jam dan nomor plat.</>,
      <>
        Gunakan mode <strong className="font-mono text-foreground">[F4] Input Manual</strong> untuk
        mencocokkan plat nomor.
      </>,
      <>
        Tekan <strong className="font-mono text-amber-400">[F11] Override Supervisor</strong> bila
        memerlukan input denda khusus tiket hilang.
      </>
    ]
  },
  {
    key: 'palang',
    label: 'Palang Macet',
    title: 'Prosedur Palang Macet / Barrier Loop Fail:',
    titleClass: 'text-amber-400',
    items: [
      <>Pastikan kendaraan sudah melunasi pembayaran parkir.</>,
      <>
        Tekan tombol darurat{' '}
        <strong className="font-mono text-emerald-400">[F9] Buka Palang</strong> untuk force pulse
        relay COM3.
      </>,
      <>
        Jika motorik palang tetap tidak bergerak, periksa saklar manual limit switch di dalam kabin
        barrier gate.
      </>,
      <>Panggil pengawas lapangan / teknisi bila motor servo macet mekanik.</>
    ]
  },
  {
    key: 'qris',
    label: 'Kendala QRIS/Tap',
    title: 'Prosedur Gagal Saldo / QRIS Timeout:',
    titleClass: 'text-blue-400',
    items: [
      <>Bila saldo pelanggan terpotong namun status UNPAID: catat No. RRN perbankan nasabah.</>,
      <>
        Gunakan tombol <strong className="font-mono text-foreground">Simulasi Sukses</strong> hanya
        jika verifikasi mutasi EDC bank telah terbit.
      </>,
      <>
        Tawarkan alternatif bayar tunai <strong className="font-mono text-foreground">[F5]</strong>{' '}
        atau kartu E-Money bank lain.
      </>
    ]
  }
]

export function HelpModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  const [tab, setTab] = useState<SopTab>('tiket')
  const toast = useToast()
  const active = SOP_TABS.find((item) => item.key === tab) ?? SOP_TABS[0]

  return (
    <ParkModal
      open={open}
      onClose={onClose}
      icon="?"
      title="Pusat Bantuan & SOP Loket [F1]"
      subtitle="Prosedur Operasi Standar Exit Gate & Penanganan Masalah"
      maxWidth="max-w-xl"
    >
      <div className="grid grid-cols-3 gap-1 rounded border border-border bg-background p-1 text-xs">
        {SOP_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded px-2 py-1.5 transition-all ${
              item.key === tab
                ? 'bg-primary/20 font-bold text-foreground'
                : 'font-medium text-muted-foreground hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-[160px] flex-col justify-start gap-2 rounded border border-border bg-background p-3 text-xs">
        <p className={`font-mono text-xs font-bold ${active.titleClass}`}>{active.title}</p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {active.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <button
          type="button"
          onClick={() =>
            toast('Interkom SPV belum tersedia di build ini — hubungi Pengawas Lapangan.', 'info')
          }
          className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-2 font-mono text-xs font-bold text-foreground shadow transition-all hover:bg-primary/15 active:scale-95"
        >
          <span aria-hidden>☎</span>
          <span>Panggil Interkom SPV</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border bg-background px-4 py-2 text-xs text-muted-foreground transition-all hover:bg-card hover:text-white active:scale-95"
        >
          Tutup [ESC]
        </button>
      </div>
    </ParkModal>
  )
}
