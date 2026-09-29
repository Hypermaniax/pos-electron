import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { corsOrigins } from './config/env'
import { correlationMiddleware, requestLogMiddleware } from './middleware/correlation'
import { globalLimiter } from './middleware/rate-limit'
import { errorHandler, notFoundHandler } from './middleware/error'
import { healthRouter } from './routers/health.router'
import { authRouter } from './routers/auth.router'
import { sessionsRouter } from './routers/session.router'
import { shiftsRouter } from './routers/shift.router'
import { paymentsRouter } from './routers/payment.router'
import { gateRouter } from './routers/gate.router'
import { transactionsRouter } from './routers/transaction.router'
import { auditRouter } from './routers/audit.router'
import { personelRouter } from './routers/personel.router'

export function createApp(): express.Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: corsOrigins(),
      allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key', 'x-correlation-id'],
      exposedHeaders: ['x-correlation-id']
    })
  )
  app.use(correlationMiddleware)
  app.use(globalLimiter)
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogMiddleware)

  app.get('/', (_req, res) => {
    res.json({
      service: 'pos-site-server',
      version: '0.1.0',
      docs: '/api/v1/health'
    })
  })

  app.use('/api/v1/health', healthRouter)
  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1/sessions', sessionsRouter)
  app.use('/api/v1/shifts', shiftsRouter)
  app.use('/api/v1/payments', paymentsRouter)
  app.use('/api/v1/gate', gateRouter)
  app.use('/api/v1/transactions', transactionsRouter)
  app.use('/api/v1/audit', auditRouter)
  app.use('/api/v1/personel', personelRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
