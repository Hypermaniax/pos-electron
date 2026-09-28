import { prisma } from '../db/prisma'
import { Errors } from '../lib/errors'
import { newId } from '../lib/ids'
import {
  acquireAdvisoryLock,
  createShift,
  findFirstShift,
  findShiftById,
  groupTransactionsByMethodStatus,
  updateShiftIfStatus
} from '../repositories/shift.repository'
import { findFirstSession } from '../repositories/session.repository'
import { recordAudit, recordAuditInTx } from './audit.service'
import type { OperatorProfile, Shift, ShiftSummary } from '../domain/types'
import type { Shift as ShiftRow } from '../generated/prisma/client'

export type { ShiftRow }

export function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    deviceId: row.deviceId,
    laneName: row.laneName,
    openedById: row.openedById,
    openedByName: row.openedByName,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    status: row.status as Shift['status'],
    openingCash: row.openingCash
  }
}

function openShiftWhere(deviceId?: string) {
  return { status: 'OPEN' as const, ...(deviceId ? { deviceId } : {}) }
}

export async function getShiftOrThrow(shiftId: string): Promise<ShiftRow> {
  const row = await findShiftById(prisma, shiftId)
  if (!row) throw Errors.notFound('NOT_FOUND', 'Shift tidak ditemukan.')
  return row
}

export async function getActiveShiftId(deviceId?: string): Promise<string | null> {
  const row = await findFirstShift(prisma, openShiftWhere(deviceId), { openedAt: 'desc' })
  return row?.id ?? null
}

export async function getActiveShift(deviceId?: string): Promise<Shift | null> {
  const row = await findFirstShift(prisma, openShiftWhere(deviceId), { openedAt: 'desc' })
  return row ? toShift(row) : null
}

export async function getActiveShiftById(shiftId: string): Promise<Shift> {
  const shift = await getActiveShift()
  if (!shift || shift.id !== shiftId) {
    throw Errors.notFound('NOT_FOUND', 'Shift tidak ditemukan atau sudah ditutup.')
  }
  return shift
}

async function createInsideLock(input: {
  operator: OperatorProfile
  deviceId: string
  laneName: string
  openingCash: number
  correlationId: string
}): Promise<Shift> {
  return prisma.$transaction(async (tx) => {
    await acquireAdvisoryLock(tx, `shift_open_${input.deviceId}`)
    const existing = await findFirstShift(
      tx,
      { status: 'OPEN', deviceId: input.deviceId },
      { openedAt: 'desc' }
    )
    if (existing) {
      throw Errors.conflict('SHIFT_OPEN', 'Masih ada shift yang aktif pada POS ini.')
    }
    const row = await createShift(tx, {
      id: newId('shf'),
      deviceId: input.deviceId,
      laneName: input.laneName,
      openedById: input.operator.id,
      openedByName: input.operator.name,
      status: 'OPEN',
      openingCash: input.openingCash
    })
    const shift = toShift(row)
    await recordAuditInTx(tx, {
      correlationId: input.correlationId,
      action: 'shift.open',
      operator: input.operator,
      deviceId: input.deviceId,
      entityType: 'shift',
      entityId: shift.id,
      metadata: { openingCash: input.openingCash }
    })
    return shift
  })
}

export async function openShift(input: {
  operator: OperatorProfile
  deviceId: string
  laneName: string
  openingCash: number
  correlationId: string
}): Promise<Shift> {
  return createInsideLock(input)
}

export async function getShiftSummary(shiftId: string): Promise<ShiftSummary> {
  const groups = await groupTransactionsByMethodStatus(prisma, shiftId)

  const summary: ShiftSummary = {
    cashCount: 0,
    cashTotal: 0,
    qrSuccessCount: 0,
    qrTotal: 0,
    qrFailedCount: 0,
    emoneySuccessCount: 0,
    emoneyTotal: 0,
    cancelledCount: 0,
    totalToDeposit: 0
  }

  for (const group of groups) {
    const count = group._count._all
    const total = group._sum.amount ?? 0
    if (group.status === 'CANCELLED') {
      summary.cancelledCount += count
      continue
    }
    if (group.method === 'cash' && group.status === 'PAID') {
      summary.cashCount += count
      summary.cashTotal += total
    } else if (group.method === 'qr' && group.status === 'PAID') {
      summary.qrSuccessCount += count
      summary.qrTotal += total
    } else if (group.method === 'qr' && (group.status === 'FAILED' || group.status === 'EXPIRED')) {
      summary.qrFailedCount += count
    } else if (group.method === 'emoney' && group.status === 'PAID') {
      summary.emoneySuccessCount += count
      summary.emoneyTotal += total
    }
  }

  summary.totalToDeposit = summary.cashTotal
  return summary
}

export async function closeShift(input: {
  shiftId: string
  operator: OperatorProfile
  correlationId: string
}): Promise<{ shift: Shift; summary: ShiftSummary }> {
  const shift = await getShiftOrThrow(input.shiftId)
  if (shift.status === 'CLOSED') {
    throw Errors.invalidState('Shift ini sudah ditutup.')
  }
  const pending = await findFirstSession(prisma, {
    paymentStatus: { in: ['PENDING_QR', 'PENDING_EMONEY'] }
  })
  if (pending) {
    throw Errors.conflict(
      'PENDING_TRANSACTION',
      'Masih ada transaksi menggantung. Selesaikan atau batalkan sebelum menutup shift.'
    )
  }
  const summary = await getShiftSummary(input.shiftId)
  // Conditional close: dua close bersamaan → yang kedua gagal di sini.
  const claimed = await updateShiftIfStatus(prisma, {
    id: input.shiftId,
    from: 'OPEN',
    data: { status: 'CLOSED', closedAt: new Date() }
  })
  if (claimed.count === 0) {
    throw Errors.invalidState('Shift ini sudah ditutup.')
  }
  const updated = await findShiftById(prisma, input.shiftId)
  if (!updated) throw Errors.notFound('NOT_FOUND', 'Shift tidak ditemukan.')
  const closed = toShift(updated)
  await recordAudit({
    correlationId: input.correlationId,
    action: 'shift.close',
    operator: input.operator,
    deviceId: closed.deviceId,
    entityType: 'shift',
    entityId: closed.id,
    metadata: { ...summary }
  })
  return { shift: closed, summary }
}
