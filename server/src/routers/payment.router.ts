import { Router } from 'express'
import { Permissions } from '../domain/permissions'
import { requireAuth, requirePermission } from '../middleware/auth'
import {
  cashHandler,
  emoneyCancelHandler,
  emoneyCreateHandler,
  emoneyGetHandler,
  emoneyTapHandler,
  qrCancelHandler,
  qrCreateHandler,
  qrGetHandler,
  qrSimulateHandler
} from '../controllers/payment.controller'

export const paymentsRouter = Router()

paymentsRouter.post(
  '/cash',
  requireAuth,
  requirePermission(Permissions.PaymentCash),
  cashHandler
)

paymentsRouter.post(
  '/qr',
  requireAuth,
  requirePermission(Permissions.PaymentQr),
  qrCreateHandler
)
paymentsRouter.get(
  '/qr/:id',
  requireAuth,
  requirePermission(Permissions.PaymentQr),
  qrGetHandler
)
paymentsRouter.post(
  '/qr/:id/simulate',
  requireAuth,
  requirePermission(Permissions.PaymentQr),
  qrSimulateHandler
)
paymentsRouter.post(
  '/qr/:id/cancel',
  requireAuth,
  requirePermission(Permissions.PaymentCancel),
  qrCancelHandler
)

paymentsRouter.post(
  '/emoney',
  requireAuth,
  requirePermission(Permissions.PaymentQr),
  emoneyCreateHandler
)
paymentsRouter.get(
  '/emoney/:id',
  requireAuth,
  requirePermission(Permissions.PaymentQr),
  emoneyGetHandler
)
paymentsRouter.post(
  '/emoney/:id/tap',
  requireAuth,
  requirePermission(Permissions.PaymentQr),
  emoneyTapHandler
)
paymentsRouter.post(
  '/emoney/:id/cancel',
  requireAuth,
  requirePermission(Permissions.PaymentCancel),
  emoneyCancelHandler
)
