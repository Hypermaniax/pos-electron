import type {
  GateResult,
  OperatorProfile,
  ParkingSession,
  PaymentStatus,
  PaymentTransaction,
  QrIntent,
  Result,
  SearchInput,
  SessionState,
  Shift,
  ShiftSummary
} from '@shared/types'
import { DEMO_USERS, nextId, rawSessions, toParkingSession, resolveAmount, transactions, qrIntents, shifts, idempotency } from '../mock/store'

const DELAY_MS = 300
const SESSION_KEY = 'pos.demo.session'
const QR_TTL_MS = 120_000
const QR_AUTO_PAY_MS = 8_000

function wait(ms = DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

function fail<T>(code: string, message: string): Result<T> {
  return { ok: false, error: { code, message } }
}

function normalize(value: string): string {
  return value.toUpperCase().replace(/\s+/g, ' ').trim()
}

function compact(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '')
}

function findRaw(sessionId: string): (typeof rawSessions)[number] | undefined {
  return rawSessions.find((session) => session.id === sessionId)
}

export function parseScanPayload(
  payload: string
): { ticketNumber: string; plateNumber: string } | null {
  const trimmed = payload.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { ticket?: unknown; plate?: unknown }
      if (parsed.ticket && parsed.plate) {
        return { ticketNumber: String(parsed.ticket), plateNumber: String(parsed.plate) }
      }
    } catch {
      return null
    }
    return null
  }
  const parts = trimmed
    .split(/[|;,\t]/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    return { ticketNumber: parts[0], plateNumber: parts[1] }
  }
  if (/^TKT-/i.test(trimmed)) {
    return { ticketNumber: trimmed, plateNumber: '' }
  }
  return null
}

export async function login(username: string, password: string): Promise<Result<SessionState>> {
  await wait(400)
  const demo = DEMO_USERS.find((user) => user.profile.username === username)
  if (!demo || demo.password !== password) {
    return fail('INVALID_CREDENTIALS', 'Nama pengguna atau kata sandi salah.')
  }
  const session: SessionState = {
    operator: demo.profile,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return ok(session)
}

export function restore(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as SessionState
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await wait(150)
  localStorage.removeItem(SESSION_KEY)
}

export async function verifySession(): Promise<SessionState | null> {
  await wait(100)
  return restore()
}

export async function searchSessions(input: SearchInput): Promise<Result<ParkingSession[]>> {
  await wait()

  if (input.mode === 'scan') {
    const parsed = parseScanPayload(input.payload ?? '')
    if (!parsed) {
      return fail('SCAN_INVALID', 'Payload scan tidak dapat dibaca. Coba pindai ulang tiket.')
    }
    const matches = rawSessions.filter((session) => {
      if (parsed.ticketNumber && compact(session.ticketNumber) === compact(parsed.ticketNumber)) {
        return true
      }
      if (parsed.plateNumber && compact(session.plateNumber) === compact(parsed.plateNumber)) {
        return true
      }
      return false
    })
    return ok(matches.map(toParkingSession))
  }

  const query = normalize(input.plateNumber ?? input.ticketNumber ?? '')
  if (!query) {
    return fail('VALIDATION', 'Masukkan nomor tiket atau nomor plat kendaraan.')
  }
  const matches = rawSessions.filter((session) => {
    return (
      normalize(session.ticketNumber).includes(query) ||
      compact(session.plateNumber).includes(compact(query))
    )
  })
  return ok(matches.map(toParkingSession))
}

export async function getSession(sessionId: string): Promise<Result<ParkingSession>> {
  await wait(120)
  const raw = findRaw(sessionId)
  if (!raw) return fail('NOT_FOUND', 'Sesi parkir tidak ditemukan.')
  return ok(toParkingSession(raw))
}

export async function createSession(input: {
  plateNumber: string
  vehicleType: string
  laneIn: string
}): Promise<Result<ParkingSession>> {
  await wait(300)
  const id = nextId('ses')
  const ticketNumber = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(-4)}`
  const session: ParkingSession = {
    id,
    ticketNumber,
    plateNumber: input.plateNumber,
    vehicleType: input.vehicleType,
    entryTime: new Date().toISOString(),
    durationMinutes: 0,
    amount: 0,
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: input.laneIn
  }
  rawSessions.push({
    id,
    ticketNumber,
    plateNumber: input.plateNumber,
    vehicleType: input.vehicleType,
    entryTime: session.entryTime,
    sessionStatus: 'ACTIVE',
    paymentStatus: 'UNPAID',
    laneIn: input.laneIn,
    amount: null
  })
  return ok(session)
}

export async function payCash(
  sessionId: string,
  amountReceived: number,
  idempotencyKey: string,
  operator: OperatorProfile
): Promise<Result<PaymentTransaction>> {
  const cached = idempotency.get(idempotencyKey)
  if (cached) return ok(cached as PaymentTransaction)

  await wait(450)
  const raw = findRaw(sessionId)
  if (!raw) return fail('NOT_FOUND', 'Sesi parkir tidak ditemukan.')
  if (raw.paymentStatus === 'PAID') {
    return fail('ALREADY_PAID', 'Tagihan ini sudah lunas dan tidak dapat dibayar ulang.')
  }
  const amount = resolveAmount(raw)
  if (!Number.isFinite(amountReceived) || amountReceived < amount) {
    return fail('INSUFFICIENT_AMOUNT', 'Uang diterima kurang dari total tagihan.')
  }

  const transaction: PaymentTransaction = {
    id: nextId('trx'),
    shiftId: activeShiftId(),
    sessionId: raw.id,
    ticketNumber: raw.ticketNumber,
    plateNumber: raw.plateNumber,
    vehicleType: raw.vehicleType,
    method: 'cash',
    amount,
    status: 'PAID',
    reference: `CASH-${nextId('ref').toUpperCase()}`,
    operatorId: operator.id,
    operatorName: operator.name,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    cancelReason: null
  }
  transactions.push(transaction)
  raw.amount = amount
  raw.paymentStatus = 'PAID'
  raw.sessionStatus = 'CLOSED'
  idempotency.set(idempotencyKey, transaction)
  return ok(transaction)
}

interface QrTimers {
  expire: ReturnType<typeof setTimeout>
  autoPay: ReturnType<typeof setTimeout>
}

const qrTimers = new Map<string, QrTimers>()

function clearQrTimers(intentId: string): void {
  const timers = qrTimers.get(intentId)
  if (!timers) return
  clearTimeout(timers.expire)
  clearTimeout(timers.autoPay)
  qrTimers.delete(intentId)
}

function markQrPaid(intent: QrIntent, operator: OperatorProfile): void {
  if (intent.status !== 'PENDING_QR') return
  const raw = findRaw(intent.sessionId)
  intent.status = 'PAID'
  if (raw) {
    raw.paymentStatus = 'PAID'
    raw.sessionStatus = 'CLOSED'
    raw.amount = intent.amount
  }
  transactions.push({
    id: nextId('trx'),
    shiftId: activeShiftId(),
    sessionId: intent.sessionId,
    ticketNumber: intent.ticketNumber,
    plateNumber: raw?.plateNumber ?? '-',
    vehicleType: raw?.vehicleType ?? '-',
    method: 'qr',
    amount: intent.amount,
    status: 'PAID',
    reference: `QR-${nextId('ref').toUpperCase()}`,
    operatorId: operator.id,
    operatorName: operator.name,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    cancelReason: null
  })
  clearQrTimers(intent.id)
}

export async function createQrIntent(
  sessionId: string,
  operator: OperatorProfile
): Promise<Result<QrIntent>> {
  const raw = findRaw(sessionId)
  if (!raw) return fail('NOT_FOUND', 'Sesi parkir tidak ditemukan.')
  if (raw.paymentStatus === 'PAID') {
    return fail('ALREADY_PAID', 'Tagihan ini sudah lunas dan tidak dapat dibayar ulang.')
  }
  const existing = qrIntents.find(
    (intent) => intent.sessionId === sessionId && intent.status === 'PENDING_QR'
  )
  if (existing) return ok({ ...existing })

  await wait(450)
  const amount = resolveAmount(raw)
  const now = Date.now()
  const intent: QrIntent = {
    id: nextId('qri'),
    sessionId: raw.id,
    ticketNumber: raw.ticketNumber,
    amount,
    qrString: `pos://pay?ticket=${encodeURIComponent(raw.ticketNumber)}&amount=${amount}&ref=${nextId('qri')}`,
    status: 'PENDING_QR',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QR_TTL_MS).toISOString()
  }
  qrIntents.push(intent)
  raw.paymentStatus = 'PENDING_QR'

  const expire = setTimeout(() => {
    if (intent.status !== 'PENDING_QR') return
    intent.status = 'EXPIRED'
    const session = findRaw(intent.sessionId)
    if (session && session.paymentStatus === 'PENDING_QR') session.paymentStatus = 'UNPAID'
    transactions.push({
      id: nextId('trx'),
      shiftId: activeShiftId(),
      sessionId: intent.sessionId,
      ticketNumber: intent.ticketNumber,
      plateNumber: session?.plateNumber ?? '-',
      vehicleType: session?.vehicleType ?? '-',
      method: 'qr',
      amount: intent.amount,
      status: 'EXPIRED',
      reference: `QR-${nextId('ref').toUpperCase()}`,
      operatorId: operator.id,
      operatorName: operator.name,
      createdAt: new Date().toISOString(),
      paidAt: null,
      cancelReason: null
    })
    clearQrTimers(intent.id)
  }, QR_TTL_MS)

  const autoPay = setTimeout(() => markQrPaid(intent, operator), QR_AUTO_PAY_MS)
  qrTimers.set(intent.id, { expire, autoPay })

  return ok({ ...intent })
}

export async function getQrIntent(intentId: string): Promise<Result<QrIntent>> {
  const intent = qrIntents.find((candidate) => candidate.id === intentId)
  if (!intent) return fail('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
  return ok({ ...intent })
}

export async function cancelQrIntent(
  intentId: string,
  reason: string,
  operator: OperatorProfile
): Promise<Result<QrIntent>> {
  await wait(300)
  const intent = qrIntents.find((candidate) => candidate.id === intentId)
  if (!intent) return fail('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
  if (intent.status !== 'PENDING_QR') {
    return fail('INVALID_STATE', 'QR ini tidak dapat dibatalkan karena statusnya sudah final.')
  }
  clearQrTimers(intent.id)
  intent.status = 'CANCELLED'
  const raw = findRaw(intent.sessionId)
  if (raw && raw.paymentStatus === 'PENDING_QR') raw.paymentStatus = 'UNPAID'
  transactions.push({
    id: nextId('trx'),
    shiftId: activeShiftId(),
    sessionId: intent.sessionId,
    ticketNumber: intent.ticketNumber,
    plateNumber: raw?.plateNumber ?? '-',
    vehicleType: raw?.vehicleType ?? '-',
    method: 'qr',
    amount: intent.amount,
    status: 'CANCELLED',
    reference: `QR-${nextId('ref').toUpperCase()}`,
    operatorId: operator.id,
    operatorName: operator.name,
    createdAt: new Date().toISOString(),
    paidAt: null,
    cancelReason: reason
  })
  return ok({ ...intent })
}

export async function simulateQrPaid(intentId: string): Promise<Result<QrIntent>> {
  const intent = qrIntents.find((candidate) => candidate.id === intentId)
  if (!intent) return fail('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
  markQrPaid(intent, { id: 'system', username: 'system', name: 'System', role: 'System', permissions: [] })
  return ok({ ...intent })
}

export async function openGate(
  sessionId: string,
  idempotencyKey: string,
  simulate: 'none' | 'failed' | 'timeout' = 'none'
): Promise<Result<GateResult>> {
  const cached = idempotency.get(idempotencyKey)
  if (cached) return ok(cached as GateResult)

  await wait(500)
  const raw = findRaw(sessionId)
  if (!raw) return fail('NOT_FOUND', 'Sesi parkir tidak ditemukan.')
  if (raw.paymentStatus !== 'PAID') {
    return fail('GATE_NOT_ALLOWED', 'Palang hanya dapat dibuka setelah pembayaran lunas.')
  }

  const correlationId = nextId('corr')
  const result: GateResult =
    simulate === 'failed'
      ? {
          status: 'FAILED',
          message: 'Perintah buka palang ditolak perangkat gerbang.',
          correlationId
        }
      : simulate === 'timeout'
        ? {
            status: 'TIMEOUT',
            message: 'Perangkat gerbang tidak merespons tepat waktu.',
            correlationId
          }
        : { status: 'SUCCESS', message: 'Palang pintu berhasil dibuka.', correlationId }

  if (result.status === 'SUCCESS') {
    raw.sessionStatus = 'CLOSED'
    idempotency.set(idempotencyKey, result)
  }
  return ok(result)
}

export async function getReceipt(transactionId: string): Promise<Result<PaymentTransaction>> {
  const transaction = transactions.find((candidate) => candidate.id === transactionId)
  if (!transaction) return fail('NOT_FOUND', 'Bukti pembayaran tidak ditemukan.')
  return ok(transaction)
}

export function activeShiftId(): string | null {
  return shifts.find((shift) => shift.status === 'OPEN')?.id ?? null
}

export async function getActiveShift(): Promise<Shift | null> {
  await wait(150)
  return shifts.find((shift) => shift.status === 'OPEN') ?? null
}

export async function openShift(
  openingCash: number,
  operator: OperatorProfile,
  deviceId: string,
  laneName: string
): Promise<Result<Shift>> {
  await wait(350)
  if (activeShiftId()) return fail('SHIFT_OPEN', 'Masih ada shift yang aktif pada POS ini.')
  const shift: Shift = {
    id: nextId('shf'),
    deviceId,
    laneName,
    openedById: operator.id,
    openedByName: operator.name,
    openedAt: new Date().toISOString(),
    closedAt: null,
    status: 'OPEN',
    openingCash
  }
  shifts.push(shift)
  return ok(shift)
}

function summarize(shiftId: string | null): ShiftSummary {
  const relevant = transactions.filter((transaction) => transaction.shiftId === shiftId)
  const cash = relevant.filter((t) => t.method === 'cash' && t.status === 'PAID')
  const qrPaid = relevant.filter((t) => t.method === 'qr' && t.status === 'PAID')
  const qrFailed = relevant.filter(
    (t) => t.method === 'qr' && (t.status === 'FAILED' || t.status === 'EXPIRED')
  )
  const cancelled = relevant.filter((t) => t.status === 'CANCELLED')
  const cashTotal = cash.reduce((total, t) => total + t.amount, 0)
  return {
    cashCount: cash.length,
    cashTotal,
    qrSuccessCount: qrPaid.length,
    qrTotal: qrPaid.reduce((total, t) => total + t.amount, 0),
    qrFailedCount: qrFailed.length,
    cancelledCount: cancelled.length,
    totalToDeposit: cashTotal
  }
}

export async function getShiftSummary(shiftId: string): Promise<ShiftSummary> {
  await wait(150)
  return summarize(shiftId)
}

export async function closeShift(
  shiftId: string
): Promise<Result<{ summary: ShiftSummary; shift: Shift }>> {
  await wait(400)
  const shift = shifts.find((candidate) => candidate.id === shiftId)
  if (!shift) return fail('NOT_FOUND', 'Shift tidak ditemukan.')
  const pending = rawSessions.some(
    (session) =>
      session.paymentStatus === 'PENDING_QR' || session.paymentStatus === 'PENDING_EMONEY'
  )
  if (pending) {
    return fail(
      'PENDING_TRANSACTION',
      'Masih ada transaksi menggantung. Selesaikan atau batalkan sebelum menutup shift.'
    )
  }
  const summary = summarize(shift.id)
  shift.status = 'CLOSED'
  shift.closedAt = new Date().toISOString()
  return ok({ summary, shift })
}

export async function listTransactions(shiftId: string | null): Promise<PaymentTransaction[]> {
  await wait(200)
  const relevant = shiftId
    ? transactions.filter((transaction) => transaction.shiftId === shiftId)
    : transactions
  return [...relevant].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getLatestTransactionForSession(
  sessionId: string
): Promise<PaymentTransaction | null> {
  const rows = await listTransactions(null)
  const relevant = rows
    .filter((row) => row.sessionId === sessionId && row.status === 'PAID')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return relevant[0] ?? null
}

export function statusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    UNPAID: 'Belum dibayar',
    PENDING_QR: 'Menunggu QR',
    PENDING_EMONEY: 'Memproses e-money',
    PAID: 'Lunas',
    FAILED: 'Gagal',
    EXPIRED: 'Kedaluwarsa',
    CANCELLED: 'Dibatalkan'
  }
  return labels[status]
}

export async function pingServer(): Promise<Result<{ status: string; db: string; version: string }>> {
  await wait(100)
  return ok({ status: 'ok', db: 'ok', version: '1.0.0-mock' })
}

export interface PersonelRow {
  id: string
  username: string
  name: string
  role: string
  active: boolean
  createdAt: string
  permissions: string[]
}

export async function fetchPersonel(): Promise<Result<{ items: PersonelRow[] }>> {
  await wait(200)
  const items: PersonelRow[] = DEMO_USERS.map((user) => ({
    id: user.profile.id,
    username: user.profile.username,
    name: user.profile.name,
    role: user.profile.role,
    active: true,
    createdAt: new Date().toISOString(),
    permissions: user.profile.permissions
  }))
  return ok({ items })
}

export async function setPersonelActive(id: string, active: boolean): Promise<Result<PersonelRow>> {
  await wait(200)
  const user = DEMO_USERS.find((u) => u.profile.id === id)
  if (!user) return fail('NOT_FOUND', 'User tidak ditemukan.')
  return ok({
    id: user.profile.id,
    username: user.profile.username,
    name: user.profile.name,
    role: user.profile.role,
    active,
    createdAt: new Date().toISOString(),
    permissions: user.profile.permissions
  })
}
export function resetBaseCache(): void { /* mock: no-op */ }
