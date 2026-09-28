import { prisma } from '../db/prisma'
import { AppError, Errors } from '../lib/errors'
import { newId } from '../lib/ids'
import { env } from '../config/env'
import { findIdempotent, saveIdempotentInTx } from '../lib/idempotency'
import { createTransaction } from '../repositories/transaction.repository'
import {
  createQrIntent as createQrIntentRow,
  findFirstQrIntent,
  findQrIntentById,
  updateQrIntent,
  updateQrIntentIfStatus
} from '../repositories/qr.repository'
import {
  createEmoneyIntent as createEmoneyIntentRow,
  findEmoneyIntentById,
  findFirstEmoneyIntent,
  updateEmoneyIntent,
  updateEmoneyIntentIfStatus
} from '../repositories/emoney.repository'
import {
  findSessionById,
  updateSessionIfPaymentStatus,
  updateSessions
} from '../repositories/session.repository'
import { getSessionOrThrow, resolveSessionAmount, type SessionRow } from './session.service'
import { getActiveShiftId } from './shift.service'
import { recordAuditInTx } from './audit.service'
import { toTransaction } from './transaction.service'
import type { Prisma } from '../generated/prisma/client'
import type {
  EmoneyIntent,
  OperatorProfile,
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  QrIntent
} from '../domain/types'
import type {
  EmoneyIntent as EmoneyIntentRow,
  QrIntent as QrIntentRow
} from '../generated/prisma/client'

function assertPayable(session: SessionRow): void {
  if (session.paymentStatus === 'PAID') {
    throw new AppError('ALREADY_PAID', 'Tagihan ini sudah lunas dan tidak dapat dibayar ulang.', 409)
  }
  if (session.paymentStatus !== 'UNPAID') {
    throw Errors.invalidState(
      `Tagihan tidak dapat dibayar karena statusnya ${session.paymentStatus}.`
    )
  }
}

interface TransactionInput {
  session: SessionRow
  method: PaymentMethod
  amount: number
  status: 'PAID' | 'CANCELLED'
  reference: string
  operator: OperatorProfile
  shiftId: string | null
  paidAt?: Date
  cancelReason?: string
}

function transactionData(
  input: TransactionInput
): Prisma.PaymentTransactionUncheckedCreateInput {
  return {
    id: newId('trx'),
    shiftId: input.shiftId,
    sessionId: input.session.id,
    ticketNumber: input.session.ticketNumber,
    plateNumber: input.session.plateNumber,
    vehicleType: input.session.vehicleType,
    method: input.method,
    amount: input.amount,
    status: input.status,
    reference: input.reference,
    operatorId: input.operator.id,
    operatorName: input.operator.name,
    paidAt: input.paidAt ?? null,
    cancelReason: input.cancelReason ?? null
  }
}

function sessionPaidData(amount: number): Prisma.ParkingSessionUncheckedUpdateInput {
  return {
    paymentStatus: 'PAID',
    sessionStatus: 'CLOSED',
    amount,
    paidAt: new Date(),
    closedAt: new Date()
  }
}

/**
 * Error untuk kondisi saat klaim kondisional gagal (count 0): baca ulang
 * sesi agar pesan akurat (ALREADY_PAID vs status lain).
 */
async function sessionClaimConflict(sessionId: string): Promise<AppError> {
  const fresh = await findSessionById(prisma, sessionId)
  if (fresh?.paymentStatus === 'PAID') {
    return new AppError('ALREADY_PAID', 'Tagihan ini sudah lunas dan tidak dapat dibayar ulang.', 409)
  }
  return Errors.invalidState(
    `Tagihan tidak dapat dibayar karena statusnya ${fresh?.paymentStatus ?? 'tidak diketahui'}.`
  )
}

/* ------------------------------------------------------------------ cash */

export async function payCash(input: {
  sessionId: string
  amountReceived: number
  operator: OperatorProfile
  deviceId?: string
  correlationId: string
  idempotencyKey: string
}): Promise<PaymentTransaction> {
  const cached = await findIdempotent<PaymentTransaction>(input.idempotencyKey, 'payment.cash')
  if (cached) return cached

  const session = await getSessionOrThrow(input.sessionId)
  assertPayable(session)
  const amount = resolveSessionAmount(session)
  if (!Number.isFinite(input.amountReceived) || input.amountReceived < amount) {
    throw new AppError('INSUFFICIENT_AMOUNT', 'Uang diterima kurang dari total tagihan.', 422)
  }
  const shiftId = await getActiveShiftId(input.deviceId)
  const now = new Date()

  const transaction = await prisma.$transaction(async (tx) => {
    // Klaim atomik UNPAID → PAID: count 0 berarti ada pembayaran/selain lain
    // yang menang lebih dulu; seluruh transaksi ini dibatalkan (rollback).
    const claimed = await updateSessionIfPaymentStatus(tx, {
      id: session.id,
      from: 'UNPAID',
      data: sessionPaidData(amount)
    })
    if (claimed.count === 0) throw await sessionClaimConflict(session.id)

    const created = await createTransaction(
      tx,
      transactionData({
        session,
        method: 'cash',
        amount,
        status: 'PAID',
        reference: `CASH-${newId('ref').toUpperCase()}`,
        operator: input.operator,
        shiftId,
        paidAt: now
      })
    )
    await saveIdempotentInTx(tx, input.idempotencyKey, 'payment.cash', toTransaction(created))
    await recordAuditInTx(tx, {
      correlationId: input.correlationId,
      action: 'payment.cash.paid',
      operator: input.operator,
      deviceId: input.deviceId ?? null,
      entityType: 'transaction',
      entityId: created.id,
      metadata: { sessionId: input.sessionId, amount }
    })
    return toTransaction(created)
  })

  return transaction
}

/* -------------------------------------------------------------------- qr */

export function toQrIntent(row: QrIntentRow): QrIntent {
  return {
    id: row.id,
    sessionId: row.sessionId,
    ticketNumber: row.ticketNumber,
    amount: row.amount,
    qrString: row.qrString,
    status: row.status as QrIntent['status'],
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString()
  }
}

/** Tandai intent kedaluwarsa bila masih pending dan TTL terlewati. */
async function expireQrIfNeeded(row: QrIntentRow): Promise<QrIntentRow> {
  if (row.status !== 'PENDING_QR' || row.expiresAt.getTime() > Date.now()) return row
  const claimed = await updateQrIntentIfStatus(prisma, {
    id: row.id,
    from: 'PENDING_QR',
    data: { status: 'EXPIRED' }
  })
  if (claimed.count > 0) {
    await updateSessions(
      prisma,
      { id: row.sessionId, paymentStatus: 'PENDING_QR' },
      { paymentStatus: 'UNPAID' }
    )
    return { ...row, status: 'EXPIRED' }
  }
  return row
}

export async function createQrIntent(input: {
  sessionId: string
  operator: OperatorProfile
  deviceId?: string
  correlationId: string
}): Promise<QrIntent> {
  const session = await getSessionOrThrow(input.sessionId)
  assertPayable(session)
  const existing = await findFirstQrIntent(
    prisma,
    { sessionId: session.id, status: 'PENDING_QR' },
    { createdAt: 'desc' }
  )
  if (existing) return toQrIntent(await expireQrIfNeeded(existing))

  const amount = resolveSessionAmount(session)
  const id = newId('qri')
  const expiresAt = new Date(Date.now() + env.QR_TTL_SECONDS * 1000)
  const qrString = `pos://pay?ticket=${encodeURIComponent(session.ticketNumber)}&amount=${amount}&ref=${id}`

  return prisma.$transaction(async (tx) => {
    // Klaim UNPAID → PENDING_QR mencegah dua intent QR aktif untuk sesi yang sama.
    const claimed = await updateSessionIfPaymentStatus(tx, {
      id: session.id,
      from: 'UNPAID',
      data: { paymentStatus: 'PENDING_QR' }
    })
    if (claimed.count === 0) throw await sessionClaimConflict(session.id)
    const row = await createQrIntentRow(tx, {
      id,
      sessionId: session.id,
      ticketNumber: session.ticketNumber,
      amount,
      qrString,
      status: 'PENDING_QR',
      expiresAt
    })
    await recordAuditInTx(tx, {
      correlationId: input.correlationId,
      action: 'payment.qr.created',
      operator: input.operator,
      deviceId: input.deviceId ?? null,
      entityType: 'qr_intent',
      entityId: row.id,
      metadata: { sessionId: input.sessionId, amount }
    })
    return toQrIntent(row)
  })
}

export async function getQrIntent(intentId: string): Promise<QrIntent> {
  const row = await findQrIntentById(prisma, intentId)
  if (!row) throw Errors.notFound('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
  return toQrIntent(await expireQrIfNeeded(row))
}

export async function completeQrIntent(input: {
  intentId: string
  result: 'paid' | 'failed'
  failReason?: string
  deviceId?: string
  operator: OperatorProfile
  correlationId: string
}): Promise<QrIntent> {
  const found = await findQrIntentById(prisma, input.intentId)
  if (!found) throw Errors.notFound('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
  const row = await expireQrIfNeeded(found)
  if (row.status === 'PAID') return toQrIntent(row)
  if (row.status !== 'PENDING_QR') {
    throw Errors.invalidState(`QR tidak dapat diproses karena statusnya ${row.status}.`)
  }
  const session = await getSessionOrThrow(row.sessionId)
  const shiftId = await getActiveShiftId(input.deviceId)
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    if (input.result === 'paid') {
      // Klaim atomik PENDING_QR → PAID: dua simulasi bersamaan tidak bisa
      // menciptakan dua transaksi PAID.
      const claimed = await updateQrIntentIfStatus(tx, {
        id: row.id,
        from: 'PENDING_QR',
        data: { status: 'PAID', paidAt: now }
      })
      if (claimed.count === 0) {
        throw Errors.invalidState('QR tidak dapat diproses karena statusnya sudah berubah.')
      }
      const paidSession = await updateSessionIfPaymentStatus(tx, {
        id: row.sessionId,
        from: 'PENDING_QR',
        data: sessionPaidData(row.amount)
      })
      if (paidSession.count === 0) throw await sessionClaimConflict(row.sessionId)

      const created = await createTransaction(
        tx,
        transactionData({
          session,
          method: 'qr',
          amount: row.amount,
          status: 'PAID',
          reference: `QR-${newId('ref').toUpperCase()}`,
          operator: input.operator,
          shiftId,
          paidAt: now
        })
      )
      await recordAuditInTx(tx, {
        correlationId: input.correlationId,
        action: 'payment.qr.paid',
        operator: input.operator,
        entityType: 'qr_intent',
        entityId: row.id,
        metadata: { sessionId: row.sessionId, amount: row.amount, transactionId: created.id }
      })
    } else {
      const failed = await updateQrIntentIfStatus(tx, {
        id: row.id,
        from: 'PENDING_QR',
        data: { status: 'FAILED', failReason: input.failReason ?? 'Pembayaran QR gagal.' }
      })
      if (failed.count === 0) {
        throw Errors.invalidState('QR tidak dapat diproses karena statusnya sudah berubah.')
      }
      await updateSessions(
        tx,
        { id: row.sessionId, paymentStatus: 'PENDING_QR' },
        { paymentStatus: 'UNPAID' }
      )
      await recordAuditInTx(tx, {
        correlationId: input.correlationId,
        action: 'payment.qr.failed',
        operator: input.operator,
        entityType: 'qr_intent',
        entityId: row.id,
        reason: input.failReason ?? null
      })
    }
    const latest = await findQrIntentById(tx, row.id)
    if (!latest) throw Errors.notFound('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
    return toQrIntent(latest)
  })
}

export async function cancelQrIntent(input: {
  intentId: string
  reason: string
  operator: OperatorProfile
  deviceId?: string
  correlationId: string
}): Promise<QrIntent> {
  const row = await findQrIntentById(prisma, input.intentId)
  if (!row) throw Errors.notFound('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
  if (row.status !== 'PENDING_QR') {
    throw Errors.invalidState('QR ini tidak dapat dibatalkan karena statusnya sudah final.')
  }
  const session = await getSessionOrThrow(row.sessionId)
  const shiftId = await getActiveShiftId(input.deviceId)

  return prisma.$transaction(async (tx) => {
    const cancelled = await updateQrIntentIfStatus(tx, {
      id: row.id,
      from: 'PENDING_QR',
      data: { status: 'CANCELLED', failReason: input.reason }
    })
    if (cancelled.count === 0) {
      throw Errors.invalidState('QR ini tidak dapat dibatalkan karena statusnya sudah final.')
    }
    await updateSessions(
      tx,
      { id: row.sessionId, paymentStatus: 'PENDING_QR' },
      { paymentStatus: 'UNPAID' }
    )
    await createTransaction(
      tx,
      transactionData({
        session,
        method: 'qr',
        amount: row.amount,
        status: 'CANCELLED',
        reference: `QR-${newId('ref').toUpperCase()}`,
        operator: input.operator,
        shiftId,
        cancelReason: input.reason
      })
    )
    await recordAuditInTx(tx, {
      correlationId: input.correlationId,
      action: 'payment.qr.cancelled',
      operator: input.operator,
      deviceId: input.deviceId ?? null,
      entityType: 'qr_intent',
      entityId: row.id,
      reason: input.reason
    })
    const latest = await findQrIntentById(tx, row.id)
    if (!latest) throw Errors.notFound('NOT_FOUND', 'QR pembayaran tidak ditemukan.')
    return toQrIntent(latest)
  })
}

/* ---------------------------------------------------------------- emoney */

export function toEmoneyIntent(row: EmoneyIntentRow): EmoneyIntent {
  return {
    id: row.id,
    sessionId: row.sessionId,
    ticketNumber: row.ticketNumber,
    amount: row.amount,
    status: row.status as EmoneyIntent['status'],
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    resultCode: row.resultCode,
    message: row.message,
    cardMasked: row.cardMasked
  }
}

async function expireEmoneyIfNeeded(row: EmoneyIntentRow): Promise<EmoneyIntentRow> {
  if (row.status !== 'PENDING_EMONEY' || row.expiresAt.getTime() > Date.now()) return row
  const claimed = await updateEmoneyIntentIfStatus(prisma, {
    id: row.id,
    from: 'PENDING_EMONEY',
    data: { status: 'EXPIRED', message: 'Transaksi e-money kedaluwarsa.' }
  })
  if (claimed.count > 0) {
    await updateSessions(
      prisma,
      { id: row.sessionId, paymentStatus: 'PENDING_EMONEY' },
      { paymentStatus: 'UNPAID' }
    )
    return { ...row, status: 'EXPIRED' }
  }
  return row
}

export async function createEmoneyIntent(input: {
  sessionId: string
  operator: OperatorProfile
  deviceId?: string
  correlationId: string
}): Promise<EmoneyIntent> {
  const session = await getSessionOrThrow(input.sessionId)
  assertPayable(session)
  const existing = await findFirstEmoneyIntent(
    prisma,
    { sessionId: session.id, status: 'PENDING_EMONEY' },
    { createdAt: 'desc' }
  )
  if (existing) return toEmoneyIntent(await expireEmoneyIfNeeded(existing))

  const amount = resolveSessionAmount(session)
  const id = newId('emi')
  const expiresAt = new Date(Date.now() + env.EMONEY_TTL_SECONDS * 1000)

  return prisma.$transaction(async (tx) => {
    const claimed = await updateSessionIfPaymentStatus(tx, {
      id: session.id,
      from: 'UNPAID',
      data: { paymentStatus: 'PENDING_EMONEY' }
    })
    if (claimed.count === 0) throw await sessionClaimConflict(session.id)
    const row = await createEmoneyIntentRow(tx, {
      id,
      sessionId: session.id,
      ticketNumber: session.ticketNumber,
      amount,
      status: 'PENDING_EMONEY',
      expiresAt,
      message: 'Menunggu tap kartu e-money.'
    })
    await recordAuditInTx(tx, {
      correlationId: input.correlationId,
      action: 'payment.emoney.created',
      operator: input.operator,
      deviceId: input.deviceId ?? null,
      entityType: 'emoney_intent',
      entityId: row.id,
      metadata: { sessionId: input.sessionId, amount }
    })
    return toEmoneyIntent(row)
  })
}

export async function getEmoneyIntent(intentId: string): Promise<EmoneyIntent> {
  const row = await findEmoneyIntentById(prisma, intentId)
  if (!row) throw Errors.notFound('NOT_FOUND', 'Transaksi e-money tidak ditemukan.')
  return toEmoneyIntent(await expireEmoneyIfNeeded(row))
}

export type TapResult = 'paid' | 'insufficient' | 'unreadable' | 'failed' | 'timeout'

const TAP_RESULT_CODE: Record<TapResult, string> = {
  paid: 'SUCCESS',
  insufficient: 'INSUFFICIENT_BALANCE',
  unreadable: 'CARD_UNREADABLE',
  failed: 'DEBIT_FAILED',
  timeout: 'TIMEOUT'
}

const TAP_FAILURE_MESSAGE: Record<Exclude<TapResult, 'paid' | 'unreadable'>, string> = {
  insufficient: 'Saldo e-money tidak cukup.',
  failed: 'Debit e-money gagal.',
  timeout: 'Tap e-money timeout.'
}

export async function tapEmoney(input: {
  intentId: string
  result: TapResult
  cardMasked?: string
  deviceId?: string
  operator: OperatorProfile
  correlationId: string
}): Promise<EmoneyIntent> {
  const found = await findEmoneyIntentById(prisma, input.intentId)
  if (!found) throw Errors.notFound('NOT_FOUND', 'Transaksi e-money tidak ditemukan.')
  const row = await expireEmoneyIfNeeded(found)
  if (row.status === 'PAID') return toEmoneyIntent(row)
  if (row.status !== 'PENDING_EMONEY') {
    throw Errors.invalidState(
      `Transaksi e-money tidak dapat diproses karena statusnya ${row.status}.`
    )
  }
  const session = await getSessionOrThrow(row.sessionId)
  const result = input.result
  const resultCode = TAP_RESULT_CODE[result]
  const cardMasked = input.cardMasked ?? null
  const shiftId = await getActiveShiftId(input.deviceId)
  const now = new Date()

  if (result === 'unreadable') {
    // Tidak final: hanya melengkapi info kartu, status tetap pending.
    const updated = await updateEmoneyIntent(prisma, row.id, {
      resultCode,
      message: 'Kartu tidak terbaca, silakan tap ulang.',
      cardMasked
    })
    return toEmoneyIntent(updated)
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await updateEmoneyIntentIfStatus(tx, {
      id: row.id,
      from: 'PENDING_EMONEY',
      data:
        result === 'paid'
          ? {
              status: 'PAID',
              resultCode,
              message: 'Pembayaran e-money berhasil.',
              paidAt: now,
              cardMasked
            }
          : { status: 'FAILED', resultCode, message: TAP_FAILURE_MESSAGE[result], cardMasked }
    })
    if (claimed.count === 0) {
      throw Errors.invalidState(
        'Transaksi e-money tidak dapat diproses karena statusnya sudah berubah.'
      )
    }

    if (result !== 'paid') {
      await updateSessions(
        tx,
        { id: row.sessionId, paymentStatus: 'PENDING_EMONEY' },
        { paymentStatus: 'UNPAID' }
      )
      await recordAuditInTx(tx, {
        correlationId: input.correlationId,
        action: 'payment.emoney.failed',
        operator: input.operator,
        entityType: 'emoney_intent',
        entityId: row.id,
        metadata: { result, resultCode }
      })
    } else {
      const paidSession = await updateSessionIfPaymentStatus(tx, {
        id: row.sessionId,
        from: 'PENDING_EMONEY',
        data: sessionPaidData(row.amount)
      })
      if (paidSession.count === 0) throw await sessionClaimConflict(row.sessionId)
      await createTransaction(
        tx,
        transactionData({
          session,
          method: 'emoney',
          amount: row.amount,
          status: 'PAID',
          reference: `EMONEY-${newId('ref').toUpperCase()}`,
          operator: input.operator,
          shiftId,
          paidAt: now
        })
      )
      await recordAuditInTx(tx, {
        correlationId: input.correlationId,
        action: 'payment.emoney.paid',
        operator: input.operator,
        entityType: 'emoney_intent',
        entityId: row.id,
        metadata: { result, resultCode }
      })
    }

    const latest = await findEmoneyIntentById(tx, row.id)
    if (!latest) throw Errors.notFound('NOT_FOUND', 'Transaksi e-money tidak ditemukan.')
    return toEmoneyIntent(latest)
  })
}

export async function cancelEmoneyIntent(input: {
  intentId: string
  reason: string
  operator: OperatorProfile
  deviceId?: string
  correlationId: string
}): Promise<EmoneyIntent> {
  const row = await findEmoneyIntentById(prisma, input.intentId)
  if (!row) throw Errors.notFound('NOT_FOUND', 'Transaksi e-money tidak ditemukan.')
  if (row.status !== 'PENDING_EMONEY') {
    throw Errors.invalidState('Transaksi e-money ini tidak dapat dibatalkan karena statusnya final.')
  }
  const session = await getSessionOrThrow(row.sessionId)
  const shiftId = await getActiveShiftId(input.deviceId)

  return prisma.$transaction(async (tx) => {
    const cancelled = await updateEmoneyIntentIfStatus(tx, {
      id: row.id,
      from: 'PENDING_EMONEY',
      data: { status: 'CANCELLED', message: input.reason }
    })
    if (cancelled.count === 0) {
      throw Errors.invalidState('Transaksi e-money ini tidak dapat dibatalkan karena statusnya final.')
    }
    await updateSessions(
      tx,
      { id: row.sessionId, paymentStatus: 'PENDING_EMONEY' },
      { paymentStatus: 'UNPAID' }
    )
    await createTransaction(
      tx,
      transactionData({
        session,
        method: 'emoney',
        amount: row.amount,
        status: 'CANCELLED',
        reference: `EMONEY-${newId('ref').toUpperCase()}`,
        operator: input.operator,
        shiftId,
        cancelReason: input.reason
      })
    )
    await recordAuditInTx(tx, {
      correlationId: input.correlationId,
      action: 'payment.emoney.cancelled',
      operator: input.operator,
      deviceId: input.deviceId ?? null,
      entityType: 'emoney_intent',
      entityId: row.id,
      reason: input.reason
    })
    const latest = await findEmoneyIntentById(tx, row.id)
    if (!latest) throw Errors.notFound('NOT_FOUND', 'Transaksi e-money tidak ditemukan.')
    return toEmoneyIntent(latest)
  })
}
