import type React from 'react'
import { useState } from 'react'
import type { AppConfig } from '@shared/types'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { can, Permissions } from '../lib/permissions'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

interface SettingsFormProps {
  config: AppConfig
  onSave: (patch: Partial<AppConfig>) => Promise<{ ok: boolean; error?: string }>
}

function SettingsForm({ config, onSave }: SettingsFormProps): React.JSX.Element {
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

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage(null)
    const result = await onSave({
      siteServerUrl: siteServerUrl.trim(),
      laneName: laneName.trim(),
      gateName: gateName.trim(),
      operationalMode,
      sessionTimeoutSeconds: Math.max(60, sessionTimeoutMinutes * 60),
      printerName: printerName.trim() ? printerName.trim() : null
    })
    setSaving(false)
    if (result.ok) {
      setMessage({ kind: 'ok', text: 'Konfigurasi tersimpan.' })
    } else {
      setMessage({ kind: 'error', text: result.error ?? 'Gagal menyimpan konfigurasi.' })
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <FieldGroup className="gap-4">
            {message && (
              <Alert variant={message.kind === 'ok' ? 'default' : 'destructive'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="deviceId">Identitas device</FieldLabel>
              <Input id="deviceId" readOnly value={config.deviceId} />
            </Field>

            <Field>
              <FieldLabel htmlFor="siteServerUrl">URL Site Server (belum digunakan)</FieldLabel>
              <Input
                id="siteServerUrl"
                value={siteServerUrl}
                onChange={(event) => setSiteServerUrl(event.target.value)}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="laneName">Nama loket</FieldLabel>
                <Input
                  id="laneName"
                  value={laneName}
                  onChange={(event) => setLaneName(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="gateName">Nama gerbang</FieldLabel>
                <Input
                  id="gateName"
                  value={gateName}
                  onChange={(event) => setGateName(event.target.value)}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="operationalMode">Mode operasional</FieldLabel>
              <Select
                value={operationalMode}
                onValueChange={(value) => setOperationalMode(value as 'operator' | 'manless')}
              >
                <SelectTrigger id="operationalMode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="manless">Manless</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="sessionTimeout">Batas tidak aktif (menit)</FieldLabel>
              <Input
                id="sessionTimeout"
                type="number"
                min={1}
                max={1440}
                value={sessionTimeoutMinutes}
                onChange={(event) => setSessionTimeoutMinutes(Number(event.target.value))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="printerName">Nama printer (opsional)</FieldLabel>
              <Input
                id="printerName"
                value={printerName}
                onChange={(event) => setPrinterName(event.target.value)}
                placeholder="Kosongkan bila tidak ada"
              />
            </Field>

            <div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export function SettingsScreen(): React.JSX.Element {
  const { session } = useAuth()
  const { config, update } = useConfig()

  if (!can(session, Permissions.SettingsManage)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Anda tidak memiliki hak akses untuk mengubah konfigurasi.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Perubahan konfigurasi sensitif membutuhkan hak akses teknisi atau supervisor.
        </p>
      </div>

      {config ? (
        <SettingsForm config={config} onSave={update} />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Memuat konfigurasi...
          </CardContent>
        </Card>
      )}
    </div>
  )
}
