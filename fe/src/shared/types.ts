export type OperationalMode = 'operator' | 'manless'

export interface AppConfig {
  siteServerUrl: string
  deviceId: string
  laneName: string
  gateName: string
  operationalMode: OperationalMode
  sessionTimeoutSeconds: number
  printerName: string | null
}

export interface OperatorProfile {
  id: string
  username: string
  name: string
  role: string
  permissions: string[]
}

export interface SessionState {
  operator: OperatorProfile
  expiresAt: string
}

export interface ApiError {
  code: string
  message: string
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export type PaymentStatus =
  'UNPAID' | 'PENDING_QR' | 'PENDING_EMONEY' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED'

export type PaymentMethod = 'cash' | 'qr' | 'emoney'

export type SessionStatus = 'ACTIVE' | 'CLOSED'

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

export type ShiftStatus = 'OPEN' | 'CLOSED'

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
  cancelledCount: number
  totalToDeposit: number
}

export type GateStatus = 'SUCCESS' | 'FAILED' | 'TIMEOUT'

export interface GateResult {
  status: GateStatus
  message: string
  correlationId: string
}

export interface SearchInput {
  mode: 'manual' | 'scan'
  ticketNumber?: string
  plateNumber?: string
  payload?: string
}
