import type { NextFunction, Request, Response } from 'express'
import { Errors } from '../lib/errors'
import { loadOperatorById, verifyToken } from '../services/auth.service'

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw Errors.unauthorized('Token tidak disertakan.')
  }
  const { userId } = verifyToken(token)
  const operator = await loadOperatorById(userId)
  if (!operator) throw Errors.unauthorized()
  req.operator = operator
  next()
}

export function requirePermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const operator = req.operator
    if (!operator) throw Errors.unauthorized()
    const missing = required.filter((permission) => !operator.permissions.includes(permission))
    if (missing.length > 0) {
      throw Errors.forbidden(`Butuh permission: ${missing.join(', ')}.`)
    }
    next()
  }
}
