import type { Request, Response } from 'express'
import { Errors } from '../lib/errors'
import { param } from '../lib/validate'
import { listPersonel, setPersonelActive } from '../services/personel.service'

export interface PersonelRow {
  id: string
  username: string
  name: string
  role: string
  active: boolean
  createdAt: string
  permissions: string[]
}

export async function listPersonelHandler(_req: Request, res: Response): Promise<void> {
  res.json({ items: await listPersonel() })
}

export async function setPersonelActiveHandler(req: Request, res: Response): Promise<void> {
  const id = param(req.params.id)
  const active = (req.body as { active?: unknown } | undefined)?.active
  if (!id) throw Errors.validation('Parameter id wajib ada.')
  if (typeof active !== 'boolean') throw Errors.validation('Field "active" harus boolean.')
  try {
    res.json(await setPersonelActive(id, active))
  } catch {
    throw Errors.notFound('OPERATOR_NOT_FOUND', 'Operator tidak ditemukan.')
  }
}
