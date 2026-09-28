import { Router } from 'express'
import { Permissions } from '../domain/permissions'
import { requireAuth, requirePermission } from '../middleware/auth'
import { openHandler, overrideHandler } from '../controllers/gate.controller'

export const gateRouter = Router()

gateRouter.post('/open', requireAuth, requirePermission(Permissions.GateOpen), openHandler)
gateRouter.post(
  '/override',
  requireAuth,
  requirePermission(Permissions.GateOverride),
  overrideHandler
)
