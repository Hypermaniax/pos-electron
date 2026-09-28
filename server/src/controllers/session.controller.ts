import type { Request, Response } from 'express'
import { first, param } from '../lib/validate'
import { getSession, searchSessions } from '../services/session.service'
import type { SearchInput } from '../domain/types'

export async function searchHandler(req: Request, res: Response): Promise<void> {
  const mode = first(req.query.mode) === 'scan' ? 'scan' : 'manual'
  const input: SearchInput = {
    mode,
    ticketNumber: first(req.query.ticketNumber),
    plateNumber: first(req.query.plateNumber),
    payload: first(req.query.payload)
  }
  res.json({ items: await searchSessions(input) })
}

export async function detailHandler(req: Request, res: Response): Promise<void> {
  res.json(await getSession(param(req.params.id)))
}
