import { Router } from 'express'
import { Permissions } from '../domain/permissions'
import { requireAuth, requirePermission } from '../middleware/auth'
import { detailHandler, searchHandler } from '../controllers/session.controller'

export const sessionsRouter = Router()

sessionsRouter.get('/search', requireAuth, requirePermission(Permissions.SessionView), searchHandler)
sessionsRouter.get('/:id', requireAuth, requirePermission(Permissions.SessionView), detailHandler)
