import type { Prisma } from '../generated/prisma/client'
import type { Db } from './db'

export function createTransaction(db: Db, data: Prisma.PaymentTransactionUncheckedCreateInput) {
  return db.paymentTransaction.create({ data })
}

export function findTransactionById(db: Db, id: string) {
  return db.paymentTransaction.findUnique({ where: { id } })
}

export function updateTransaction(
  db: Db,
  id: string,
  data: Prisma.PaymentTransactionUncheckedUpdateInput
) {
  return db.paymentTransaction.update({ where: { id }, data })
}

export function updateTransactionIfStatus(
  db: Db,
  input: { id: string; from: string; data: Prisma.PaymentTransactionUncheckedUpdateInput }
) {
  return db.paymentTransaction.updateMany({
    where: { id: input.id, status: input.from },
    data: input.data
  })
}

export function findTransactions(
  db: Db,
  where: Prisma.PaymentTransactionWhereInput,
  take: number
) {
  return db.paymentTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take })
}
