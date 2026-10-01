import type React from 'react'
import { useState } from 'react'
import { fetchPersonel, setPersonelActive } from '../lib/server-api'
import type { PersonelRow } from '../lib/server-api'
import { useToast } from '../hooks/useToast'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'

export function PersonelScreen(): React.JSX.Element {
  const toast = useToast()
  const [items, setItems] = useState<PersonelRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = async (): Promise<void> => {
    setLoading(true)
    const result = await fetchPersonel()
    if (result.ok) {
      setItems(result.data.items)
    } else {
      toast(result.error.message, 'error')
    }
    setLoading(false)
  }

  const toggleActive = async (id: string, active: boolean): Promise<void> => {
    const result = await setPersonelActive(id, active)
    if (result.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, active } : item)))
      toast(active ? 'User diaktifkan.' : 'User dinonaktifkan.', 'success')
    } else {
      toast(result.error.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-park-main">Personel & Operator</h1>
        <Button onClick={() => void load()} disabled={loading} variant="outline" className="border-park-border bg-park-tertiary text-park-main hover:bg-park-card">
          {loading ? 'Memuat...' : 'Muat Data'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar Personel</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-park-muted">Belum ada data. Klik "Muat Data" untuk mengambil dari server.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border border-park-border bg-park-tertiary p-3">
                  <div className="space-y-0.5">
                    <p className="font-mono text-xs font-bold text-park-main">{item.name}</p>
                    <p className="font-mono text-[10px] text-park-muted">@{item.username} · {item.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('border-transparent', item.active ? 'bg-park-success/20 text-park-success' : 'bg-park-muted/20 text-park-muted')}>
                      {item.active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void toggleActive(item.id, !item.active)}
                      className="border-park-border bg-park-tertiary text-park-main hover:bg-park-card"
                    >
                      {item.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
