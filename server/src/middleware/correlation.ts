import type { NextFunction, Request, Response } from 'express'
import { logger } from '../lib/logger'
import { correlationId } from '../lib/ids'

const HEADER = 'x-correlation-id'
const SKIP_LOG_PATHS = new Set(['/api/v1/health', '/api/v1/auth/login'])

const REDACTED: readonly string[] = ['password', 'token', 'authorization']

function redactSearch(query: Request['query']): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    out[key] = REDACTED.includes(key.toLowerCase()) ? '[redacted]' : value
  }
  return out
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER)
  req.correlationId = incoming && incoming.trim() ? incoming.trim() : correlationId()
  res.setHeader(HEADER, req.correlationId)
  req.log = logger.child({
    correlationId: req.correlationId,
    method: req.method,
    path: req.path
  })
  next()
}

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_LOG_PATHS.has(req.path)) {
    next()
    return
  }
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    req.log.info(
      {
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        query: redactSearch(req.query),
        operatorId: req.operator?.id ?? null
      },
      'request selesai'
    )
  })
  next()
}
