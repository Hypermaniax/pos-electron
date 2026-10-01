import type React from 'react'
import { useState } from 'react'
import { createSession } from '../lib/server-api'
import { useToast } from '../hooks/useToast'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Label } from '@renderer/components/ui/label'

export function CheckInScreen(): React.JSX.Element {
  const toast = useToast()
  const [plateNumber, setPlateNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('Mobil')
  const [laneIn, setLaneIn] = useState('Masuk 1')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!plateNumber.trim()) return
    setBusy(true)
    const result = await createSession({ plateNumber, vehicleType, laneIn })
    setBusy(false)
    if (result.ok) {
      toast(`Sesi parkir dibuat: ${result.data.ticketNumber}`, 'success')
      setPlateNumber('')
    } else {
      toast(result.error.message, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-heading text-xl font-bold text-park-main">Gate Masuk</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sesi Parkir Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plate" className="text-xs text-park-muted">Plat Nomor</Label>
              <Input
                id="plate"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="B 1234 XYZ"
                className="border-park-border bg-park-tertiary text-park-main"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle" className="text-xs text-park-muted">Jenis Kendaraan</Label>
              <select
                id="vehicle"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded border border-park-border bg-park-tertiary px-3 py-2 text-sm text-park-main"
              >
                <option value="Motor">Motor</option>
                <option value="Mobil">Mobil</option>
                <option value="Truk">Truk</option>
                <option value="Bus">Bus</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lane" className="text-xs text-park-muted">Lane Masuk</Label>
              <select
                id="lane"
                value={laneIn}
                onChange={(e) => setLaneIn(e.target.value)}
                className="w-full rounded border border-park-border bg-park-tertiary px-3 py-2 text-sm text-park-main"
              >
                <option value="Masuk 1">Masuk 1</option>
                <option value="Masuk 2">Masuk 2</option>
                <option value="Masuk 3">Masuk 3</option>
              </select>
            </div>
            <Button type="submit" disabled={busy || !plateNumber.trim()} className="w-full bg-park-cta font-mono text-sm font-bold text-black hover:bg-orange-500">
              {busy ? 'Memproses...' : 'Buat Sesi Parkir'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
