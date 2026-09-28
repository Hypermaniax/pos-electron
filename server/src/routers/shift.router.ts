import { Router } from 'express'
import { Permissions } from '../domain/permissions'
import { requireAuth, requirePermission } from '../middleware/auth'
import {
  activeHandler,
  closeHandler,
  detailHandler,
  openHandler,
  summaryHandler
} from '../controllers/shift.controller'

export const shiftsRouter = Router()

shiftsRouter.use(requireAuth, requirePermission(Permissions.ShiftManage))

shiftsRouter.post('/open', openHandler)
shiftsRouter.get('/active', activeHandler)
shiftsRouter.get('/:id/summary', summaryHandler)
shiftsRouter.post('/:id/close', closeHandler)
shiftsRouter.get('/:id', detailHandler)
