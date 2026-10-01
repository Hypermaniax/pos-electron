import type React from 'react'
import { useState } from 'react'
import { useShift } from '../context/ShiftContext'
import { useToast } from '../hooks/useToast'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { formatCurrency } from '../lib/format'

export function ShiftScreen(): React.JSX.Element {
  const { shift, summary, openShift, closeShift } = useShift()
  const toast = useToast()
  const [openingCash, setOpeningCash] = useState('')
  const [busy, setBusy] = useState(false)

  const handleOpen = async (): Promise<void> => {
    const amount = parseInt(openingCash, 10)
    if (isNaN(amount) || amount < 0) {
      toast('Masukkan jumlah kas awal yang valid.', 'error')
      return
    }
    setBusy(true)
    const result = await openShift(amount)
    setBusy(false)
    if (result.ok) {
      toast('Shift dibuka.', 'success')
      setOpeningCash('')
    } else {
      toast(result.error ?? 'Gagal membuka shift.', 'error')
    }
  }

  const handleClose = async (): Promise<void> => {
    setBusy(true)
    const result = await closeShift()
    setBusy(false)
    if (result.ok) {
      toast('Shift ditutup.', 'success')
    } else {
      toast(result.error ?? 'Gagal menutup shift.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-bold text-park-main">Manajemen Shift</h1>

      {!shift ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Buka Shift Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-park-muted">Kas Awal (Rp)</label>
              <Input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0"
                className="border-park-border bg-park-tertiary text-park-main"
              />
            </div>
            <Button onClick={() => void handleOpen()} disabled={busy || !openingCash} className="w-full bg-park-success font-mono text-sm font-bold text-black hover:bg-emerald-500">
              {busy ? 'Memproses...' : 'Buka Shift'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Shift Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-park-muted">ID Shift</span>
                  <span className="text-park-main">{shift.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-park-muted">Dibuka oleh</span>
                  <span className="text-park-main">{shift.openedByName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-park-muted">Waktu Buka</span>
                  <span className="text-park-main">{new Date(shift.openedAt).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-park-muted">Kas Awal</span>
                  <span className="text-park-main">{formatCurrency(shift.openingCash)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ringkasan Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded border border-park-border bg-park-tertiary p-3">
                    <p className="font-mono text-[10px] text-park-muted">Cash</p>
                    <p className="font-mono text-lg font-bold text-park-main">{summary.cashCount}</p>
                    <p className="font-mono text-xs text-park-success">{formatCurrency(summary.cashTotal)}</p>
                  </div>
                  <div className="rounded border border-park-border bg-park-tertiary p-3">
                    <p className="font-mono text-[10px] text-park-muted">QR Berhasil</p>
                    <p className="font-mono text-lg font-bold text-park-main">{summary.qrSuccessCount}</p>
                    <p className="font-mono text-xs text-park-success">{formatCurrency(summary.qrTotal)}</p>
                  </div>
                  <div className="rounded border border-park-border bg-park-tertiary p-3">
                    <p className="font-mono text-[10px] text-park-muted">QR Gagal</p>
                    <p className="font-mono text-lg font-bold text-park-error">{summary.qrFailedCount}</p>
                  </div>
                  <div className="rounded border border-park-border bg-park-tertiary p-3">
                    <p className="font-mono text-[10px] text-park-muted">Pembatalan</p>
                    <p className="font-mono text-lg font-bold text-park-error">{summary.cancelledCount}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded border border-park-warning/50 bg-park-warning/10 p-3">
                  <span className="font-mono text-xs text-park-main">Total Harus Disetor</span>
                  <span className="font-mono text-lg font-bold text-park-warning">{formatCurrency(summary.totalToDeposit)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={() => void handleClose()} disabled={busy} className="w-full bg-park-error font-mono text-sm font-bold text-white hover:bg-red-500">
            {busy ? 'Memproses...' : 'Tutup Shift'}
          </Button>
        </>
      )}
    </div>
  )
}
