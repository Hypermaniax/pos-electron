import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

interface ErrorBody {
  status: number
  code: string
  message: string
  details?: unknown
}

interface ParsedHttpError {
  status?: number
  type?: string
}

function parseHttpError(error: unknown): ErrorBody | null {
  const shaped = error as ParsedHttpError | null
  if (!shaped || typeof shaped !== 'object') return null
  if (shaped.type === 'entity.parse.failed') {
    return { status: 400, code: 'BODY_INVALID', message: 'Body JSON tidak dapat dibaca.' }
  }
  if (shaped.type === 'entity.too.large') {
    return { status: 413, code: 'BODY_TOO_LARGE', message: 'Ukuran body melebihi batas.' }
  }
  return null
}

export function errorBody(error: unknown): ErrorBody {
  if (error instanceof ZodError) {
    return {
      status: 422,
      code: 'VALIDATION',
      message: 'Data permintaan tidak valid.',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    }
  }
  if (error instanceof AppError) {
    return {
      status: error.httpStatus,
      code: error.code,
      message: error.message,
      details: error.details ?? undefined
    }
  }
  return parseHttpError(error) ?? { status: 500, code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan internal pada server.' }
}

function send(res: Response, body: ErrorBody, correlationId?: string): void {
  res.status(body.status).json({
    error: {
      code: body.code,
      message: body.message,
      ...(body.details !== undefined ? { details: body.details } : {}),
      ...(correlationId ? { correlationId } : {})
    }
  })
}

export function notFoundHandler(req: Request, res: Response): void {
  send(res, {
    status: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan.`
  }, req.correlationId)
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const body = errorBody(error)
  if (body.status >= 500) {
    logger.error({ err: error, correlationId: req.correlationId, path: req.path }, 'Unhandled error')
  }
  send(res, body, req.correlationId)
}
