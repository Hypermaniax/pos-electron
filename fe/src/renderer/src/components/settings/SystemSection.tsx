import type React from 'react'
import { useState } from 'react'
import type { AppConfig } from '@shared/types'
import { useConfig } from '../../context/ConfigContext'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { SectionHeader } from '@renderer/components/park-pos'

const label = 'mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground'
const inputCls =
  'h-10 rounded border-border bg-background font-mono text-xs text-foreground placeholder:text-muted-foreground'

export function SystemSection({ config }: { config: AppConfig }): React.JSX.Element {
  const { update } = useConfig()
  const [siteServerUrl, setSiteServerUrl] = useState(config.siteServerUrl)
  const [laneName, setLaneName] = useState(config.laneName)
  const [gateName, setGateName] = useState(config.gateName)
  const [operationalMode, setOperationalMode] = useState<'operator' | 'manless'>(
    config.operationalMode
  )
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(
    Math.round(config.sessionTimeoutSeconds / 60)
  )
  const [printerName, setPrinterName] = useState(config.printerName ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const handleSubmit = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    setMessage(null)
    const result = await update({
      siteServerUrl: siteServerUrl.trim(),
      laneName: laneName.trim(),
      gateName: gateName.trim(),
      operationalMode,
      sessionTimeoutSeconds: Math.max(60, sessionTimeoutMinutes * 60),
      printerName: printerName.trim() ? printerName.trim() : null
    })
    setSaving(false)
    setMessage(
      result.ok
        ? { kind: 'ok', text: 'Konfigurasi tersimpan.' }
        : { kind: 'error', text: result.error ?? 'Gagal menyimpan konfigurasi.' }
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col justify-between gap-3 pt-1 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-400">
              IDENTITAS BOOTH • {config.deviceId.slice(0, 8).toUpperCase()}
            </span>
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] text-muted-foreground">LIVE SYNC READY</span>
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Pengaturan Sistem &amp; Jaringan
          </h1>
          <p className="max-w-3xl font-sans text-xs text-muted-foreground">
            Endpoint site server, identitas loket/gerbang, mode operasional, batas sesi, dan printer
            struk.
          </p>
        </div>
        <Button
          className="self-start bg-orange-500 font-mono text-[11px] font-bold uppercase text-white shadow-md hover:bg-orange-600 lg:self-auto"
          disabled={saving}
          onClick={() => void handleSubmit()}
        >
          {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </Button>
      </div>

      {message && (
        <Alert variant={message.kind === 'ok' ? 'default' : 'destructive'}>
          <AlertDescription className="font-mono text-xs">{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <SectionHeader icon="▤" title="Jaringan & Endpoint" />
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <label className="flex flex-col">
            <span className={label}>Device ID (read-only)</span>
            <Input readOnly value={config.deviceId} className={inputCls + ' opacity-60'} />
          </label>
          <label className="flex flex-col">
            <span className={label}>URL Site Server</span>
            <Input
              value={siteServerUrl}
              onChange={(event) => setSiteServerUrl(event.target.value)}
              required
              className={inputCls}
            />
          </label>
        </div>

        <SectionHeader icon="▚" title="Identitas & Mode Gardu" />
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
          <label className="flex flex-col">
            <span className={label}>Nama Loket</span>
            <Input
              value={laneName}
              onChange={(event) => setLaneName(event.target.value)}
              required
              className={inputCls}
            />
          </label>
          <label className="flex flex-col">
            <span className={label}>Nama Gerbang</span>
            <Input
              value={gateName}
              onChange={(event) => setGateName(event.target.value)}
              required
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Mode Operasional</span>
            <Select
              value={operationalMode}
              onValueChange={(value) =>
                value && setOperationalMode(value as 'operator' | 'manless')
              }
            >
              <SelectTrigger className={inputCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="manless">Manless</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <SectionHeader icon="▤" title="Perangkat & Sesi" />
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <label className="flex flex-col">
            <span className={label}>Batas Tidak Aktif (Menit)</span>
            <Input
              type="number"
              min={1}
              max={1440}
              value={sessionTimeoutMinutes}
              onChange={(event) => setSessionTimeoutMinutes(Number(event.target.value))}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col">
            <span className={label}>Nama Printer (opsional)</span>
            <Input
              value={printerName}
              onChange={(event) => setPrinterName(event.target.value)}
              placeholder="Kosongkan bila tidak ada"
              className={inputCls}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
