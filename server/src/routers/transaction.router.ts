import { Router } from 'express'
import { Permissions } from '../domain/permissions'
import { requireAuth, requirePermission } from '../middleware/auth'
import {
  cancelHandler,
  detailHandler,
  listHandler,
  receiptHandler
} from '../controllers/transaction.controller'

export const transactionsRouter = Router()

transactionsRouter.get(
  '/',
  requireAuth,
  requirePermission(Permissions.HistoryView),
  listHandler
)
transactionsRouter.get(
  '/:id/receipt',
  requireAuth,
  requirePermission(Permissions.ReceiptPrint),
  receiptHandler
)
transactionsRouter.get(
  '/:id',
  requireAuth,
  requirePermission(Permissions.HistoryView),
  detailHandler
)
transactionsRouter.post(
  '/:id/cancel',
  requireAuth,
  requirePermission(Permissions.PaymentCancel),
  cancelHandler
)
