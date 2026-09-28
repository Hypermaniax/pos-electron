import type { Prisma } from '../generated/prisma/client'
import type { Db } from './db'

export function findEmoneyIntentById(db: Db, id: string) {
  return db.emoneyIntent.findUnique({ where: { id } })
}

export function findFirstEmoneyIntent(
  db: Db,
  where: Prisma.EmoneyIntentWhereInput,
  orderBy: Prisma.EmoneyIntentOrderByWithRelationInput
) {
  return db.emoneyIntent.findFirst({ where, orderBy })
}

export function createEmoneyIntent(db: Db, data: Prisma.EmoneyIntentUncheckedCreateInput) {
  return db.emoneyIntent.create({ data })
}

export function updateEmoneyIntent(
  db: Db,
  id: string,
  data: Prisma.EmoneyIntentUncheckedUpdateInput
) {
  return db.emoneyIntent.update({ where: { id }, data })
}

export function updateEmoneyIntentIfStatus(
  db: Db,
  input: { id: string; from: string; data: Prisma.EmoneyIntentUncheckedUpdateInput }
) {
  return db.emoneyIntent.updateMany({
    where: { id: input.id, status: input.from },
    data: input.data
  })
}
