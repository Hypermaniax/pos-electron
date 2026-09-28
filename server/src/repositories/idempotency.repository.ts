import type { Prisma } from '../generated/prisma/client'
import type { Db } from './db'

export function findIdempotencyKey(db: Db, key: string) {
  return db.idempotencyKey.findUnique({ where: { key } })
}

export function createIdempotencyKey(db: Db, data: Prisma.IdempotencyKeyUncheckedCreateInput) {
  return db.idempotencyKey.create({ data })
}

export function upsertIdempotencyKey(db: Db, data: Prisma.IdempotencyKeyUncheckedCreateInput) {
  return db.idempotencyKey.upsert({ where: { key: data.key }, create: data, update: {} })
}
