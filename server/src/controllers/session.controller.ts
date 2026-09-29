import type { Request, Response } from 'express'
import { first, intParam, param, parse } from '../lib/validate'
import { createSession, getSession, listSessions, searchSessions } from '../services/session.service'
import type { SearchInput } from '../domain/types'
import { z } from 'zod'

const CheckInSchema = z.object({
  plateNumber: z.string().trim().min(1, 'Nomor plat wajib diisi.').max(20),
  vehicleType: z.enum(['Motor', 'Mobil', 'Truk', 'Bus']),
  laneIn: z.string().trim().min(1, 'Lane masuk wajib diisi.').max(50).optional()
})

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

export async function listHandler(req: Request, res: Response): Promise<void> {
  const limit = intParam(first(req.query.limit), 50, 200)
  res.json({ items: await listSessions(limit) })
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const body = parse(CheckInSchema, req.body)
  res.status(201).json(
    await createSession({
      plateNumber: body.plateNumber,
      vehicleType: body.vehicleType,
      laneIn: body.laneIn ?? 'Masuk 1'
    })
  )
}
