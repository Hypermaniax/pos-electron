import type React from 'react'
import { ZapIcon, BadgeIcon, StoreIcon, MegaphoneIcon, ChevronRightIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'

interface QuickAction {
  title: string
  description: string
  icon: React.ReactNode
  iconColor: string
}

const ACTIONS: QuickAction[] = [
  {
    title: 'Buka Sesi Shift Baru',
    description: 'Tutup shift berjalan & serah terima',
    icon: <BadgeIcon className="size-4" />,
    iconColor: 'text-park-cyan'
  },
  {
    title: 'Cek Kas Fisik Laci',
    description: 'Buka laci kasir tunai (Audit Cash)',
    icon: <StoreIcon className="size-4" />,
    iconColor: 'text-primary'
  },
  {
    title: 'Broadcast Pengumuman',
    description: 'Kirim teks VMS atau peringatan audio',
    icon: <MegaphoneIcon className="size-4" />,
    iconColor: 'text-park-warning'
  }
]

export function QuickActions(): React.JSX.Element {
  const handleAction = (title: string): void => {
    console.info('[PARK-OS SuperAdmin Command Triggered]:', title)
  }

  return (
    <Card className="bg-park-primary shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ZapIcon className="size-5 text-park-cta" />
          <CardTitle className="text-base">Quick Actions Supervisor</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.title}
            variant="ghost"
            className="w-full justify-between bg-park-card p-3 text-left hover:bg-park-card/60"
            onClick={() => handleAction(action.title)}
          >
            <div className="flex items-center gap-2">
              <span className={`rounded bg-park-base p-2 ${action.iconColor}`}>{action.icon}</span>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold">{action.title}</span>
                <span className="text-[11px] text-park-muted">{action.description}</span>
              </div>
            </div>
            <ChevronRightIcon className="size-4 text-park-muted" />
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
