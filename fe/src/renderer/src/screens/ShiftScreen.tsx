import type React from 'react'
import { useState } from 'react'
import type { ShiftSummary } from '@shared/types'
import { useAuth } from '../context/AuthContext'
import { useShift } from '../context/ShiftContext'
import { formatCurrency, formatDateTime } from '../lib/format'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'

function SummaryGrid({ summary }: { summary: ShiftSummary }): React.JSX.Element {
  const items = [
    { label: 'Transaksi tunai', value: `${summary.cashCount}x` },
    { label: 'Total tunai', value: formatCurrency(summary.cashTotal) },
    { label: 'QR berhasil', value: `${summary.qrSuccessCount}x` },
    { label: 'Total QR', value: formatCurrency(summary.qrTotal) },
    { label: 'QR gagal/kedaluwarsa', value: `${summary.qrFailedCount}x` },
    { label: 'Pembatalan', value: `${summary.cancelledCount}x` }
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-muted p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-semibold">{item.value}</p>
        </div>
      ))}
      <div className="rounded-lg bg-primary p-4 text-primary-foreground sm:col-span-2 lg:col-span-3">
        <p className="text-xs text-primary-foreground/70">Total cash yang harus disetor</p>
        <p className="mt-1 text-2xl font-bold">{formatCurrency(summary.totalToDeposit)}</p>
      </div>
    </div>
  )
}

export function ShiftScreen(): React.JSX.Element {
  const { session } = useAuth()
  const { shift, summary, openShift, closeShift } = useShift()
  const [openingCash, setOpeningCash] = useState('0')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const handleOpen = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    const result = await openShift(Number(openingCash) || 0)
    setBusy(false)
    setMessage(
      result.ok
        ? { kind: 'ok', text: 'Shift berhasil dibuka.' }
        : { kind: 'error', text: result.error ?? 'Gagal membuka shift.' }
    )
  }

  const handleClose = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    setMessage(null)
    const result = await closeShift()
    setBusy(false)
    setMessage(
      result.ok
        ? { kind: 'ok', text: 'Shift ditutup. Ringkasan tercatat untuk audit.' }
        : { kind: 'error', text: result.error ?? 'Gagal menutup shift.' }
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight">Shift</h1>
        <p className="text-sm text-muted-foreground">
          Kelola shift pada loket ini. Tutup shift diblokir bila masih ada transaksi menggantung.
        </p>
      </div>

      {message && (
        <Alert variant={message.kind === 'ok' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {!shift ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Buka shift</CardTitle>
            <p className="text-sm text-muted-foreground">
              Operator {session?.operator.name ?? '-'} akan membuka shift pada loket ini.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleOpen(event)}>
              <FieldGroup className="gap-4">
                <Field className="max-w-xs">
                  <FieldLabel htmlFor="openingCash">Kas awal</FieldLabel>
                  <Input
                    id="openingCash"
                    type="number"
                    min={0}
                    step={1000}
                    value={openingCash}
                    onChange={(event) => setOpeningCash(event.target.value)}
                  />
                </Field>
                <div>
                  <Button type="submit" disabled={busy}>
                    {busy ? 'Membuka...' : 'Buka shift'}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-sm">Shift aktif</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dibuka oleh {shift.openedByName} pada {formatDateTime(shift.openedAt)}
                  </p>
                </div>
                <Button variant="destructive" onClick={() => void handleClose()} disabled={busy}>
                  {busy ? 'Menutup...' : 'Tutup shift'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">Loket</dt>
                  <dd className="text-sm font-medium">{shift.laneName}</dd>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">Kas awal</dt>
                  <dd className="text-sm font-medium">{formatCurrency(shift.openingCash)}</dd>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">Waktu buka</dt>
                  <dd className="text-sm font-medium">{formatDateTime(shift.openedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ringkasan shift</CardTitle>
            </CardHeader>
            <CardContent>
              {summary ? (
                <SummaryGrid summary={summary} />
              ) : (
                <p className="text-sm text-muted-foreground">Memuat ringkasan...</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
