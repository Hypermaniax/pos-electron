import type React from 'react'
import type { GateResult } from '@shared/types'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

interface GatePanelProps {
  result: GateResult | null
  canOpen: boolean
  busy: boolean
  simulate: string
  onSimulateChange: (value: string) => void
  onOpen: () => void
  onRetry: () => void
}

export function GatePanel({
  result,
  canOpen,
  busy,
  simulate,
  onSimulateChange,
  onOpen,
  onRetry
}: GatePanelProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Palang pintu</CardTitle>
        <p className="text-xs text-muted-foreground">
          Perintah dikirim ke backend operasional dan hanya aktif setelah pembayaran lunas.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void onOpen()} disabled={!canOpen || busy}>
            {busy ? 'Mengirim...' : 'Buka palang'}
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Simulasi hasil
            <Select value={simulate} onValueChange={(value) => onSimulateChange(value ?? 'none')}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Berhasil</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!canOpen && (
          <p className="text-xs text-muted-foreground">
            Tombol nonaktif karena pembayaran belum lunas.
          </p>
        )}

        {result && (
          <Alert variant={result.status === 'FAILED' ? 'destructive' : 'default'}>
            <AlertTitle>{result.message}</AlertTitle>
            <AlertDescription>Correlation ID: {result.correlationId}</AlertDescription>
            {result.status !== 'SUCCESS' && (
              <div className="col-start-2 mt-2">
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Coba lagi
                </Button>
              </div>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
