import type { Request } from 'express'
import { Prisma } from '../generated/prisma/client'
import { prisma } from '../db/prisma'
import {
  createIdempotencyKey,
  findIdempotencyKey
} from '../repositories/idempotency.repository'
import type { Db } from '../repositories/db'
import { Errors } from './errors'

export function readIdempotencyKey(req: Request): string {
  const header = req.header('x-idempotency-key')
  const bodyKey = (req.body as { idempotencyKey?: unknown } | undefined)?.idempotencyKey
  const key = header ?? (typeof bodyKey === 'string' ? bodyKey : undefined)
  if (!key || !key.trim()) {
    throw Errors.validation('Header x-idempotency-key wajib diisi untuk aksi ini.')
  }
  return key.trim()
}

export async function findIdempotent<T>(key: string, scope: string): Promise<T | null> {
  const row = await findIdempotencyKey(prisma, key)
  if (!row || row.scope !== scope) return null
  return row.response as T
}

export async function saveIdempotentInTx<T>(
  db: Db,
  key: string,
  scope: string,
  response: T
): Promise<void> {
  try {
    await createIdempotencyKey(db, {
      key,
      scope,
      response: response as Prisma.InputJsonValue
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return
    throw error
  }
}
