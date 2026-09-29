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
import { configApi } from './config-api'
import { newKey } from './ids'

const TOKEN_KEY = 'pos.server.token'
const SESSION_KEY = 'pos.server.session'

interface ApiEnvelopeError {
  code: string
  message: string
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // penyimpanan browser tidak tersedia; token hanya di memori
  }
}

function readStoredSession(): SessionState | null {
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

function writeStoredSession(session: SessionState | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // penyimpanan browser tidak tersedia; sesi hanya di memori
  }
}

interface RequestInit {
  query?: Record<string, string | undefined>
  body?: unknown
  idempotencyKey?: string
}

let basePromise: Promise<string> | null = null

function correlationHeader(): Record<string, string> {
  const key = 'x-correlation-id'
  return { [key]: newKey('corr') }
}

async function base(): Promise<string> {
  if (!basePromise) {
    basePromise = configApi.get().then((result) => {
      if (result.ok) return result.data.siteServerUrl.replace(/\/+$/, '')
      return 'http://127.0.0.1:4000'
    })
  }
  return basePromise
}

export function resetBaseCache(): void {
  basePromise = null
}

export interface ServerHealth {
  status: string
  db: string
  version: string
}

export async function pingServer(): Promise<Result<ServerHealth>> {
  return request<ServerHealth>('GET', '/api/v1/health')
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
  return request<{ items: PersonelRow[] }>('GET', '/api/v1/personel/users')
}

export async function setPersonelActive(id: string, active: boolean): Promise<Result<PersonelRow>> {
  return request<PersonelRow>('PATCH', `/api/v1/personel/users/${encodeURIComponent(id)}/active`, {
    body: { active }
  })
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  init: RequestInit = {}
): Promise<Result<T>> {
  let url: string
  try {
    url = `${await base()}${path}`
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK', message: 'Konfigurasi Site Server tidak tersedia.' }
    }
  }

  const headers: Record<string, string> = {
    ...correlationHeader()
  }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  if (init.idempotencyKey) headers['x-idempotency-key'] = init.idempotencyKey

  const token = readToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== '') search.set(key, value)
  }
  const suffix = search.toString() ? `?${search.toString()}` : ''

  try {
    const response = await fetch(`${url}${suffix}`, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(10_000)
    })

    if (response.ok) {
      const data = (await response.json()) as T
      return { ok: true, data }
    }

    let envelope: { error?: ApiEnvelopeError } = {}
    try {
      envelope = (await response.json()) as { error?: ApiEnvelopeError }
    } catch {
      // respons bukan JSON; gunakan kode generik
    }
    return {
      ok: false,
      error: envelope.error ?? {
        code: 'HTTP_ERROR',
        message: `Permintaan gagal dengan status ${response.status}.`
      }
    }
  } catch {
    return {
      ok: false,
      error: {
        code: 'NETWORK',
        message: 'Tidak dapat terhubung ke Site Server. Periksa koneksi atau URL pada pengaturan.'
      }
    }
  }
}

export async function login(username: string, password: string): Promise<Result<SessionState>> {
  const result = await request<{
    token: string
    expiresAt: string
    operator: OperatorProfile
  }>('POST', '/api/v1/auth/login', { body: { username, password } })
  if (!result.ok) return result
  writeToken(result.data.token)
  const session: SessionState = {
    operator: result.data.operator,
    expiresAt: result.data.expiresAt
  }
  writeStoredSession(session)
  return { ok: true, data: session }
}

export function restore(): SessionState | null {
  return readStoredSession()
}

export async function verifySession(): Promise<SessionState | null> {
  const token = readToken()
  if (!token) {
    writeStoredSession(null)
    return null
  }
  const result = await request<OperatorProfile>('GET', '/api/v1/auth/me')
  if (result.ok) {
    const stored = readStoredSession()
    if (stored) return { ...stored, operator: result.data }
  }
  writeToken(null)
  writeStoredSession(null)
  return null
}

export async function logout(): Promise<void> {
  await request('POST', '/api/v1/auth/logout')
  writeToken(null)
  writeStoredSession(null)
}

export async function searchSessions(input: SearchInput): Promise<Result<ParkingSession[]>> {
  const query: Record<string, string | undefined> =
    input.mode === 'scan'
      ? { mode: 'scan', payload: input.payload ?? '' }
      : /^TKT-/i.test(input.ticketNumber ?? input.plateNumber ?? '')
        ? {
            mode: 'manual',
            ticketNumber: input.ticketNumber ?? input.plateNumber
          }
        : {
            mode: 'manual',
            plateNumber: input.plateNumber ?? input.ticketNumber
          }
  const result = await request<{ items: ParkingSession[] }>('GET', '/api/v1/sessions/search', {
    query
  })
  if (!result.ok) return result
  return { ok: true, data: result.data.items }
}

export async function getSession(sessionId: string): Promise<Result<ParkingSession>> {
  return request<ParkingSession>('GET', `/api/v1/sessions/${encodeURIComponent(sessionId)}`)
}

export async function createSession(input: {
  plateNumber: string
  vehicleType: string
  laneIn: string
}): Promise<Result<ParkingSession>> {
  return request<ParkingSession>('POST', '/api/v1/sessions', { body: input })
}

export async function listSessions(limit = 50): Promise<Result<ParkingSession[]>> {
  const result = await request<{ items: ParkingSession[] }>('GET', '/api/v1/sessions', {
    query: { limit: String(limit) }
  })
  if (!result.ok) return result
  return { ok: true, data: result.data.items }
}

export async function payCash(
  sessionId: string,
  amountReceived: number,
  idempotencyKey: string,
  operator: OperatorProfile
): Promise<Result<PaymentTransaction>> {
  void operator
  return request<PaymentTransaction>('POST', '/api/v1/payments/cash', {
    body: { sessionId, amountReceived },
    idempotencyKey
  })
}

export async function createQrIntent(
  sessionId: string,
  operator: OperatorProfile
): Promise<Result<QrIntent>> {
  void operator
  return request<QrIntent>('POST', '/api/v1/payments/qr', { body: { sessionId } })
}

export async function getQrIntent(intentId: string): Promise<Result<QrIntent>> {
  return request<QrIntent>('GET', `/api/v1/payments/qr/${encodeURIComponent(intentId)}`)
}

export async function cancelQrIntent(
  intentId: string,
  reason: string,
  operator: OperatorProfile
): Promise<Result<QrIntent>> {
  void operator
  return request<QrIntent>('POST', `/api/v1/payments/qr/${encodeURIComponent(intentId)}/cancel`, {
    body: { reason }
  })
}

export async function simulateQrPaid(intentId: string): Promise<Result<QrIntent>> {
  return request<QrIntent>('POST', `/api/v1/payments/qr/${encodeURIComponent(intentId)}/simulate`, {
    body: { result: 'paid' }
  })
}

export async function openGate(
  sessionId: string,
  idempotencyKey: string,
  simulate: 'none' | 'failed' | 'timeout' = 'none'
): Promise<Result<GateResult>> {
  return request<GateResult>('POST', '/api/v1/gate/open', {
    body: { sessionId, simulate },
    idempotencyKey
  })
}

export async function getReceipt(transactionId: string): Promise<Result<PaymentTransaction>> {
  return request<PaymentTransaction>(
    'GET',
    `/api/v1/transactions/${encodeURIComponent(transactionId)}/receipt`
  )
}

export async function getActiveShift(): Promise<Shift | null> {
  const deviceId = await configApi
    .get()
    .then((result) => (result.ok ? result.data.deviceId : undefined))
    .catch(() => undefined)
  const result = await request<Shift | null>('GET', '/api/v1/shifts/active', {
    query: { deviceId }
  })
  if (!result.ok) return null
  return result.data
}

export async function openShift(
  openingCash: number,
  operator: OperatorProfile,
  deviceId: string,
  laneName: string
): Promise<Result<Shift>> {
  void operator
  return request<Shift>('POST', '/api/v1/shifts/open', {
    body: { openingCash, deviceId, laneName }
  })
}

export async function getShiftSummary(shiftId: string): Promise<ShiftSummary> {
  const result = await request<ShiftSummary>(
    'GET',
    `/api/v1/shifts/${encodeURIComponent(shiftId)}/summary`
  )
  if (result.ok) return result.data
  return {
    cashCount: 0,
    cashTotal: 0,
    qrSuccessCount: 0,
    qrTotal: 0,
    qrFailedCount: 0,
    cancelledCount: 0,
    totalToDeposit: 0
  }
}

export async function closeShift(
  shiftId: string
): Promise<Result<{ summary: ShiftSummary; shift: Shift }>> {
  return request<{ shift: Shift; summary: ShiftSummary }>(
    'POST',
    `/api/v1/shifts/${encodeURIComponent(shiftId)}/close`
  )
}

export async function listTransactions(shiftId: string | null): Promise<PaymentTransaction[]> {
  const result = await request<{ items: PaymentTransaction[] }>('GET', '/api/v1/transactions', {
    query: { shiftId: shiftId ?? undefined, limit: '200' }
  })
  if (!result.ok) return []
  return result.data.items
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
