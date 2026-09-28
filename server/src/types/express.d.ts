import type { Logger } from 'pino'
import type { OperatorProfile } from '../domain/types'

declare global {
  namespace Express {
    interface Request {
      correlationId: string
      log: Logger
      operator?: OperatorProfile
      rawBody?: string
    }
  }
}

export {}
