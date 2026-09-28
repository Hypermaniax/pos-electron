import { Router } from 'express'
import { Permissions } from '../domain/permissions'
import { requireAuth, requirePermission } from '../middleware/auth'
import { listHandler } from '../controllers/audit.controller'

export const auditRouter = Router()

auditRouter.get(
  '/',
  requireAuth,
  requirePermission(Permissions.HistoryViewRange),
  listHandler
)
