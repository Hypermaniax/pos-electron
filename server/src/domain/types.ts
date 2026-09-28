/**
 * Kontrak domain backend. Salinan lokal dari `src/shared/types.ts` agar track
 * backend dapat dikerjakan tanpa mengimpor runtime dari aplikasi Electron.
 */

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING_QR'
  | 'PENDING_EMONEY'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'

export type PaymentMethod = 'cash' | 'qr' | 'emoney'

export type SessionStatus = 'ACTIVE' | 'CLOSED'

export type ShiftStatus = 'OPEN' | 'CLOSED'

export type GateStatus = 'SUCCESS' | 'FAILED' | 'TIMEOUT'

export type OperationalMode = 'operator' | 'manless'

export interface OperatorProfile {
  id: string
  username: string
  name: string
  role: string
  permissions: string[]
}

export interface SessionState {
  token: string
  operator: OperatorProfile
  expiresAt: string
}

export interface ParkingSession {
  id: string
  ticketNumber: string
  plateNumber: string
  vehicleType: string
  entryTime: string
  durationMinutes: number
  amount: number
  sessionStatus: SessionStatus
  paymentStatus: PaymentStatus
  laneIn: string
  canExit: boolean
}

export interface PaymentTransaction {
  id: string
  shiftId: string | null
  sessionId: string
  ticketNumber: string
  plateNumber: string
  vehicleType: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  reference: string
  operatorId: string
  operatorName: string
  createdAt: string
  paidAt: string | null
  cancelReason: string | null
}

export interface QrIntent {
  id: string
  sessionId: string
  ticketNumber: string
  amount: number
  qrString: string
  status: PaymentStatus
  createdAt: string
  expiresAt: string
}

export interface EmoneyIntent {
  id: string
  sessionId: string
  ticketNumber: string
  amount: number
  status: PaymentStatus
  createdAt: string
  expiresAt: string
  resultCode: string | null
  message: string | null
  cardMasked: string | null
}

export interface Shift {
  id: string
  deviceId: string
  laneName: string
  openedById: string
  openedByName: string
  openedAt: string
  closedAt: string | null
  status: ShiftStatus
  openingCash: number
}

export interface ShiftSummary {
  cashCount: number
  cashTotal: number
  qrSuccessCount: number
  qrTotal: number
  qrFailedCount: number
  emoneySuccessCount: number
  emoneyTotal: number
  cancelledCount: number
  totalToDeposit: number
}

export interface GateResult {
  status: GateStatus
  message: string
  correlationId: string
  sessionId: string
  openedAt: string | null
}

export interface AuditLog {
  id: string
  correlationId: string
  actorId: string | null
  actorName: string | null
  action: string
  entityType: string | null
  entityId: string | null
  reason: string | null
  deviceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface SearchInput {
  mode: 'manual' | 'scan'
  ticketNumber?: string
  plateNumber?: string
  payload?: string
}
