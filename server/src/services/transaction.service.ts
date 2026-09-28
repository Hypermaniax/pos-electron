import { Prisma } from '../generated/prisma/client'
import { prisma } from '../db/prisma'
import { Errors } from '../lib/errors'
import { toDate } from '../lib/datetime'
import {
  findTransactionById,
  findTransactions,
  updateTransactionIfStatus
} from '../repositories/transaction.repository'
import { updateSessionById } from '../repositories/session.repository'
import { recordAuditInTx } from './audit.service'
import type {
  OperatorProfile,
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction
} from '../domain/types'
import type { PaymentTransaction as PaymentTransactionRow } from '../generated/prisma/client'

export function toTransaction(row: PaymentTransactionRow): PaymentTransaction {
  return {
    id: row.id,
    shiftId: row.shiftId,
    sessionId: row.sessionId,
    ticketNumber: row.ticketNumber,
    plateNumber: row.plateNumber,
    vehicleType: row.vehicleType,
    method: row.method as PaymentMethod,
    amount: row.amount,
    status: row.status as PaymentTransaction['status'],
    reference: row.reference,
    operatorId: row.operatorId,
    operatorName: row.operatorName,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    cancelReason: row.cancelReason
  }
}

export async function getTransactionOrThrow(
  transactionId: string
): Promise<PaymentTransaction> {
  const row = await findTransactionById(prisma, transactionId)
  if (!row) throw Errors.notFound('NOT_FOUND', 'Transaksi tidak ditemukan.')
  return toTransaction(row)
}

export interface TransactionFilters {
  shiftId?: string
  method?: PaymentMethod
  status?: PaymentStatus
  from?: string
  to?: string
  limit?: number
}

export async function listTransactions(
  filters: TransactionFilters
): Promise<PaymentTransaction[]> {
  const where: Prisma.PaymentTransactionWhereInput = {}
  if (filters.shiftId) where.shiftId = filters.shiftId
  if (filters.method) where.method = filters.method
  if (filters.status) where.status = filters.status

  const from = toDate(filters.from)
  const to = toDate(filters.to)
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {})
    }
  }

  const rows = await findTransactions(prisma, where, Math.min(filters.limit ?? 200, 500))
  return rows.map(toTransaction)
}

export async function cancelTransaction(input: {
  transactionId: string
  reason: string
  operator: OperatorProfile
  correlationId: string
}): Promise<PaymentTransaction> {
  const transaction = await prisma.$transaction(async (tx) => {
    // Conditional update: hanya PAID → CANCELLED. Count 0 berarti sudah
    // dibatalkan/disela proses lain; baca ulang status terkini untuk pesan error.
    const claimed = await updateTransactionIfStatus(tx, {
      id: input.transactionId,
      from: 'PAID',
      data: { status: 'CANCELLED', cancelReason: input.reason }
    })
    if (claimed.count === 0) {
      const current = await findTransactionById(tx, input.transactionId)
      if (!current) throw Errors.notFound('NOT_FOUND', 'Transaksi tidak ditemukan.')
      throw Errors.invalidState('Hanya transaksi yang sudah lunas yang dapat dibatalkan supervisor.')
    }
    const row = await findTransactionById(tx, input.transactionId)
    if (!row) throw Errors.notFound('NOT_FOUND', 'Transaksi tidak ditemukan.')
    await updateSessionById(tx, row.sessionId, {
      paymentStatus: 'UNPAID',
      sessionStatus: 'ACTIVE',
      paidAt: null,
      closedAt: null
    })
    const mapped = toTransaction(row)
    await recordAuditInTx(tx, {
      correlationId: input.correlationId,
      action: 'payment.cancelled',
      operator: input.operator,
      entityType: 'transaction',
      entityId: mapped.id,
      reason: input.reason
    })
    return mapped
  })
  return transaction
}
