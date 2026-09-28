import type { Prisma } from '../generated/prisma/client'
import type { Db } from './db'

export function findShiftById(db: Db, id: string) {
  return db.shift.findUnique({ where: { id } })
}

export function findFirstShift(
  db: Db,
  where: Prisma.ShiftWhereInput,
  orderBy: Prisma.ShiftOrderByWithRelationInput
) {
  return db.shift.findFirst({ where, orderBy })
}

export function createShift(db: Db, data: Prisma.ShiftUncheckedCreateInput) {
  return db.shift.create({ data })
}

export function updateShiftIfStatus(
  db: Db,
  input: { id: string; from: string; data: Prisma.ShiftUncheckedUpdateInput }
) {
  return db.shift.updateMany({
    where: { id: input.id, status: input.from },
    data: input.data
  })
}

export function acquireAdvisoryLock(db: Db, key: string) {
  return db.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
}

export function groupTransactionsByMethodStatus(db: Db, shiftId: string) {
  return db.paymentTransaction.groupBy({
    by: ['method', 'status'],
    where: { shiftId },
    _count: { _all: true },
    _sum: { amount: true }
  })
}
