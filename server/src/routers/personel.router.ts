import { Router } from 'express'
import { Permissions } from '../domain/permissions'
import { requireAuth, requirePermission } from '../middleware/auth'
import { listPersonelHandler, setPersonelActiveHandler } from '../controllers/personel.controller'

export const personelRouter = Router()

personelRouter.get(
  '/users',
  requireAuth,
  requirePermission(Permissions.PersonelView),
  listPersonelHandler
)

personelRouter.patch(
  '/users/:id/active',
  requireAuth,
  requirePermission(Permissions.PersonelView),
  setPersonelActiveHandler
)
