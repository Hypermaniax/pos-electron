import type React from 'react'
import { ReceiptIcon, CarIcon, BikeIcon, TruckIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'

interface Transaction {
  time: string
  plate: string
  gate: string
  type: 'Mobil' | 'Motor' | 'Truk/Box'
  duration: string
  amount: string
  method: string
  methodColor: string
}

const TRANSACTIONS: Transaction[] = [
  { time: '14:37:42', plate: 'B 1892 UKX', gate: 'EXIT-01', type: 'Mobil', duration: '01:45:12', amount: 'Rp 12.000', method: 'QRIS BCA', methodColor: 'text-park-cyan' },
  { time: '14:36:18', plate: 'D 4591 ACQ', gate: 'EXIT-02', type: 'Motor', duration: '03:10:04', amount: 'Rp 6.000', method: 'TUNAI PAS', methodColor: 'text-primary' },
  { time: '14:34:55', plate: 'B 2098 ZFL', gate: 'EXIT-01', type: 'Mobil', duration: '00:48:20', amount: 'Rp 8.000', method: 'E-MONEY MANDIRI', methodColor: 'text-park-blue' },
  { time: '14:32:02', plate: 'F 3108 AA', gate: 'EXIT-01', type: 'Motor', duration: '04:12:49', amount: 'Rp 8.000', method: 'QRIS SHOPEE', methodColor: 'text-park-cyan' },
  { time: '14:30:11', plate: 'B 9801 SSB', gate: 'EXIT-02', type: 'Truk/Box', duration: '01:05:00', amount: 'Rp 20.000', method: 'TUNAI LOKET', methodColor: 'text-primary' }
]

function VehicleIcon({ type }: { type: Transaction['type'] }): React.JSX.Element {
  switch (type) {
    case 'Motor':
      return <BikeIcon className="size-4 text-park-muted" />
    case 'Truk/Box':
      return <TruckIcon className="size-4 text-park-muted" />
    default:
      return <CarIcon className="size-4 text-park-muted" />
  }
}

export function TransactionsTable(): React.JSX.Element {
  return (
    <Card className="bg-park-primary shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <ReceiptIcon className="size-5 text-park-success" />
          <CardTitle className="text-base">5 Transaksi Terakhir Selesai</CardTitle>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">
          Auto-Update Live Feed
        </Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-park-tertiary hover:bg-park-tertiary">
              <TableHead className="font-mono text-[10px] text-park-muted">Waktu</TableHead>
              <TableHead className="font-mono text-[10px] text-park-muted">Plat Nomor</TableHead>
              <TableHead className="font-mono text-[10px] text-park-muted">Gate POS</TableHead>
              <TableHead className="font-mono text-[10px] text-park-muted">Jenis</TableHead>
              <TableHead className="font-mono text-[10px] text-park-muted">Durasi</TableHead>
              <TableHead className="text-right font-mono text-[10px] text-park-muted">Total Tarif</TableHead>
              <TableHead className="text-center font-mono text-[10px] text-park-muted">Metode</TableHead>
              <TableHead className="text-center font-mono text-[10px] text-park-muted">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TRANSACTIONS.map((tx) => (
              <TableRow key={tx.plate} className="hover:bg-park-card/40">
                <TableCell className="font-mono text-xs text-park-main">{tx.time}</TableCell>
                <TableCell className="font-mono text-xs font-bold tracking-wider text-white">{tx.plate}</TableCell>
                <TableCell className="font-mono text-xs text-park-cyan">{tx.gate}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-park-main">
                    <VehicleIcon type={tx.type} />
                    {tx.type}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-park-main">{tx.duration}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-white">{tx.amount}</TableCell>
                <TableCell className="text-center">
                  <span className={`rounded bg-park-card px-2 py-0.5 font-mono text-[10px] font-bold ${tx.methodColor}`}>
                    {tx.method}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="rounded bg-park-success/20 px-2 py-0.5 font-mono text-[10px] font-bold text-park-success">
                    LUNAS
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
