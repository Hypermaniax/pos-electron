import type { Request, Response } from 'express'
import { z } from 'zod'
import { parse } from '../lib/validate'
import { login, logout } from '../services/auth.service'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const body = parse(LoginSchema, req.body)
  const session = await login({
    username: body.username,
    password: body.password,
    correlationId: req.correlationId
  })
  res.json(session)
}

export function meHandler(req: Request, res: Response): void {
  res.json(req.operator)
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  await logout({ operator: req.operator!, correlationId: req.correlationId })
  res.json({ ok: true })
}
