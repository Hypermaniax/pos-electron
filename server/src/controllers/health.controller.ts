import type { Request, Response } from 'express'
import { getHealth } from '../services/health.service'

export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const state = await getHealth()
  if (state.status !== 'ok') {
    res.status(503).json(state)
    return
  }
  res.json(state)
}
