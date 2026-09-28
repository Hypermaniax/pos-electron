import type { Prisma } from '../generated/prisma/client'
import type { Db } from './db'

export function findQrIntentById(db: Db, id: string) {
  return db.qrIntent.findUnique({ where: { id } })
}

export function findFirstQrIntent(
  db: Db,
  where: Prisma.QrIntentWhereInput,
  orderBy: Prisma.QrIntentOrderByWithRelationInput
) {
  return db.qrIntent.findFirst({ where, orderBy })
}

export function createQrIntent(db: Db, data: Prisma.QrIntentUncheckedCreateInput) {
  return db.qrIntent.create({ data })
}

export function updateQrIntent(
  db: Db,
  id: string,
  data: Prisma.QrIntentUncheckedUpdateInput
) {
  return db.qrIntent.update({ where: { id }, data })
}

export function updateQrIntentIfStatus(
  db: Db,
  input: { id: string; from: string; data: Prisma.QrIntentUncheckedUpdateInput }
) {
  return db.qrIntent.updateMany({
    where: { id: input.id, status: input.from },
    data: input.data
  })
}
