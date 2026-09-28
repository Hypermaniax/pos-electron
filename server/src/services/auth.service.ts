import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'
import { prisma } from '../db/prisma'
import { Errors } from '../lib/errors'
import { verifyPassword } from '../lib/password'
import {
  findPermissionsByUserId,
  findUserById,
  findUserByUsername
} from '../repositories/user.repository'
import { recordAudit } from './audit.service'
import type { OperatorProfile, SessionState } from '../domain/types'
import type { User } from '../generated/prisma/client'

async function toProfile(user: User): Promise<OperatorProfile> {
  const rows = await findPermissionsByUserId(prisma, user.id)
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: rows.map((row) => row.permission)
  }
}

export async function loadOperatorById(userId: string): Promise<OperatorProfile | null> {
  const user = await findUserById(prisma, userId)
  if (!user || !user.active) return null
  return toProfile(user)
}

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
  })
}

export function verifyToken(token: string): { userId: string; expiresAt: string } {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
    if (!payload.sub || typeof payload.sub !== 'string' || !payload.exp) {
      throw Errors.unauthorized()
    }
    return { userId: payload.sub, expiresAt: new Date(payload.exp * 1000).toISOString() }
  } catch {
    throw Errors.unauthorized()
  }
}

export async function login(input: {
  username: string
  password: string
  correlationId: string
}): Promise<SessionState> {
  const user = await findUserByUsername(prisma, input.username)
  if (!user || !user.active || !verifyPassword(input.password, user.passwordHash)) {
    throw Errors.unauthorized('Nama pengguna atau kata sandi salah.')
  }

  const token = signToken(user.id)
  const { expiresAt } = verifyToken(token)
  const operator = await toProfile(user)
  await recordAudit({ correlationId: input.correlationId, action: 'auth.login', operator })
  return { token, operator, expiresAt }
}

export async function logout(input: {
  operator: OperatorProfile
  correlationId: string
}): Promise<void> {
  await recordAudit({
    correlationId: input.correlationId,
    action: 'auth.logout',
    operator: input.operator
  })
}
