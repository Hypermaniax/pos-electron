import { Permissions } from '@shared/permissions'
import type {
  OperatorProfile,
  ParkingSession,
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  QrIntent,
  Shift
} from '@shared/types'

export interface DemoUser {
  password: string
  profile: OperatorProfile
}

export const DEMO_USERS: DemoUser[] = [
  {
    password: 'operator123',
    profile: {
      id: 'usr_operator',
      username: 'operator',
      name: 'Budi Santoso',
      role: 'Operator',
      permissions: [
        Permissions.SessionView,
        Permissions.PaymentCash,
        Permissions.PaymentQr,
        Permissions.PaymentCancel,
        Permissions.GateOpen,
        Permissions.ReceiptPrint,
        Permissions.ReceiptReprint,
        Permissions.ShiftManage,
        Permissions.HistoryView
      ]
    }
  },
  {
    password: 'supervisor123',
    profile: {
      id: 'usr_supervisor',
      username: 'supervisor',
      name: 'Siti Rahayu',
      role: 'Supervisor',
      permissions: Object.values(Permissions)
    }
  },
  {
    password: 'teknisi123',
    profile: {
      id: 'usr_teknisi',
      username: 'teknisi',
      name: 'Andi Pratama',
      role: 'Teknisi',
      permissions: [Permissions.SessionView, Permissions.SettingsManage]
    }
  }
]

const RATES: Record<string, number> = {
  Motor: 2000,
  Mobil: 3000,
  Truk: 5000,
  Bus: 7000
}

export function vehicleRate(vehicleType: string): number {
  return RATES[vehicleType] ?? 3000
}

export function calculateAmount(vehicleType: string, entryTime: string, now = Date.now()): number {
  const minutes = Math.max(1, Math.ceil((now - new Date(entryTime).getTime()) / 60_000))
  const hours = Math.max(1, Math.ceil(minutes / 60))
  return vehicleRate(vehicleType) * hours
}

export interface RawSession {
  id: string
  ticketNumber: string
  plateNumber: string
  vehicleType: string
  entryTime: string
  sessionStatus: 'ACTIVE' | 'CLOSED'
  paymentStatus: PaymentStatus
  laneIn: string
  amount: number | null
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

export const rawSessions: RawSession[] = [
  {
    id: 'ses_0001',
    ticketNumber: 'TKT-20260928-0001',
    plateNumber: 'B 1234 XYZ',
    vehicleType: 'Mobil',
    entryTime: minutesAgo(135),
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: 'Masuk 1',
    amount: null
  },
  {
    id: 'ses_0002',
    ticketNumber: 'TKT-20260928-0002',
    plateNumber: 'D 5678 ABC',
    vehicleType: 'Motor',
    entryTime: minutesAgo(42),
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: 'Masuk 2',
    amount: null
  },
  {
    id: 'ses_0003',
    ticketNumber: 'TKT-20260928-0003',
    plateNumber: 'B 9999 ZZ',
    vehicleType: 'Truk',
    entryTime: minutesAgo(305),
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: 'Masuk 1',
    amount: null
  },
  {
    id: 'ses_0004',
    ticketNumber: 'TKT-20260928-0004',
    plateNumber: 'B 1234 XYZ',
    vehicleType: 'Mobil',
    entryTime: minutesAgo(28),
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: 'Masuk 3',
    amount: null
  },
  {
    id: 'ses_0005',
    ticketNumber: 'TKT-20260928-0005',
    plateNumber: 'F 1111 AA',
    vehicleType: 'Mobil',
    entryTime: minutesAgo(190),
    sessionStatus: 'CLOSED',
    paymentStatus: 'PAID',
    laneIn: 'Masuk 2',
    amount: 12000
  },
  {
    id: 'ses_0006',
    ticketNumber: 'TKT-20260928-0006',
    plateNumber: 'BE 2222 BB',
    vehicleType: 'Motor',
    entryTime: minutesAgo(70),
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: 'Masuk 1',
    amount: null
  }
]

export const transactions: PaymentTransaction[] = []
export const qrIntents: QrIntent[] = []
export const shifts: Shift[] = []

let counter = 1000

export function nextId(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}

const AMOUNT_CACHE = new Map<string, number>()

export function resolveAmount(session: RawSession): number {
  if (session.amount !== null) return session.amount
  const cached = AMOUNT_CACHE.get(session.id)
  if (cached !== undefined) return cached
  const amount = calculateAmount(session.vehicleType, session.entryTime)
  AMOUNT_CACHE.set(session.id, amount)
  return amount
}

export function toParkingSession(session: RawSession): ParkingSession {
  const minutes = Math.max(1, Math.ceil((Date.now() - new Date(session.entryTime).getTime()) / 60_000))
  return {
    id: session.id,
    ticketNumber: session.ticketNumber,
    plateNumber: session.plateNumber,
    vehicleType: session.vehicleType,
    entryTime: session.entryTime,
    durationMinutes: minutes,
    amount: resolveAmount(session),
    sessionStatus: session.sessionStatus,
    paymentStatus: session.paymentStatus,
    laneIn: session.laneIn
  }
}

export const idempotency = new Map<string, unknown>()

export function methodLabel(method: PaymentMethod): string {
  if (method === 'cash') return 'Tunai'
  if (method === 'qr') return 'QR'
  return 'E-Money'
}
