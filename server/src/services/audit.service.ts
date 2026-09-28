import { Prisma } from '../generated/prisma/client'
import { prisma } from '../db/prisma'
import { newId } from '../lib/ids'
import { createAuditLog, findAuditLogs } from '../repositories/audit.repository'
import type { Db } from '../repositories/db'
import { toDate } from '../lib/datetime'
import type { AuditLog, OperatorProfile } from '../domain/types'
import type { AuditLog as AuditLogRow } from '../generated/prisma/client'

export interface AuditInput {
  correlationId: string
  action: string
  operator?: OperatorProfile | null
  deviceId?: string | null
  entityType?: string | null
  entityId?: string | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
}

export async function recordAudit(input: AuditInput): Promise<void> {
  await createAuditLog(prisma, {
    id: newId('aud'),
    correlationId: input.correlationId,
    actorId: input.operator?.id ?? null,
    actorName: input.operator?.name ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    reason: input.reason ?? null,
    deviceId: input.deviceId ?? null,
    metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.DbNull
  })
}

export async function recordAuditInTx(db: Db, input: AuditInput): Promise<void> {
  await createAuditLog(db, {
    id: newId('aud'),
    correlationId: input.correlationId,
    actorId: input.operator?.id ?? null,
    actorName: input.operator?.name ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    reason: input.reason ?? null,
    deviceId: input.deviceId ?? null,
    metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.DbNull
  })
}

export function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    correlationId: row.correlationId,
    actorId: row.actorId,
    actorName: row.actorName,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    reason: row.reason,
    deviceId: row.deviceId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

export interface AuditFilters {
  action?: string
  correlationId?: string
  from?: string
  to?: string
  limit?: number
}

export async function listAuditLogs(filters: AuditFilters): Promise<AuditLog[]> {
  const where: Prisma.AuditLogWhereInput = {}
  if (filters.action) where.action = filters.action
  if (filters.correlationId) where.correlationId = filters.correlationId

  const from = toDate(filters.from)
  const to = toDate(filters.to)
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {})
    }
  }

  const rows = await findAuditLogs(prisma, where, Math.min(filters.limit ?? 200, 500))
  return rows.map(toAuditLog)
}
