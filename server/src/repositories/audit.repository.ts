import type { Prisma } from '../generated/prisma/client'
import type { Db } from './db'

export function createAuditLog(db: Db, data: Prisma.AuditLogUncheckedCreateInput) {
  return db.auditLog.create({ data })
}

export function findAuditLogs(db: Db, where: Prisma.AuditLogWhereInput, take: number) {
  return db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take })
}
