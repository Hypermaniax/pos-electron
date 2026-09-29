import type React from 'react'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/ConfigContext'
import { can, Permissions } from '../lib/permissions'
import { TariffSection } from '../components/settings/TariffSection'
import { SystemSection } from '../components/settings/SystemSection'
import { ActivationSection } from '../components/settings/ActivationSection'
import { ThemeSection } from '../components/settings/ThemeSection'
import { DevicesSection } from '../components/settings/DevicesSection'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'

const TABS = [
  { value: 'tarif', label: 'Tarif & Kebijakan', enabled: true },
  { value: 'sistem', label: 'Sistem & Jaringan', enabled: true },
  { value: 'fitur', label: 'Aktivasi Fitur', enabled: true },
  { value: 'tema', label: 'Tema & Bantuan', enabled: true },
  { value: 'perangkat', label: 'Ping Perangkat', enabled: true }
]

export function SettingsScreen(): React.JSX.Element {
  const { session } = useAuth()
  const { config } = useConfig()

  if (!can(session, Permissions.SettingsManage)) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="font-mono text-xs">
          ANDA TIDAK MEMILIKI HAK AKSES UNTUK MENGUBAH KONFIGURASI.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex min-h-[calc(100%-56px)] flex-col font-mono">
      <Tabs defaultValue="tarif" className="flex min-w-0 flex-col gap-3">
        <TabsList className="w-fit self-start rounded border border-border bg-card font-mono text-[11px]">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} disabled={!tab.enabled}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tarif" className="mt-0 flex flex-col">
          {config ? (
            <TariffSection />
          ) : (
            <p className="text-xs text-muted-foreground">Memuat konfigurasi...</p>
          )}
        </TabsContent>
        <TabsContent value="sistem" className="mt-0 flex flex-col">
          {config ? (
            <SystemSection config={config} />
          ) : (
            <p className="text-xs text-muted-foreground">Memuat konfigurasi...</p>
          )}
        </TabsContent>
        <TabsContent value="fitur" className="mt-0 flex flex-col">
          <ActivationSection />
        </TabsContent>
        <TabsContent value="tema" className="mt-0 flex flex-col">
          <ThemeSection />
        </TabsContent>
        <TabsContent value="perangkat" className="mt-0 flex flex-col">
          <DevicesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
