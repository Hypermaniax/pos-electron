import type { Request, Response } from 'express'
import { z } from 'zod'
import { param, parse } from '../lib/validate'
import {
  closeShift,
  getActiveShift,
  getActiveShiftById,
  getShiftSummary,
  openShift
} from '../services/shift.service'

const OpenSchema = z.object({
  deviceId: z.string().min(1).default('dev_001'),
  laneName: z.string().min(1).default('Loket 1'),
  openingCash: z.number().int().min(0).default(0)
})

export async function openHandler(req: Request, res: Response): Promise<void> {
  const body = parse(OpenSchema, req.body ?? {})
  const shift = await openShift({
    operator: req.operator!,
    deviceId: body.deviceId,
    laneName: body.laneName,
    openingCash: body.openingCash,
    correlationId: req.correlationId
  })
  res.status(201).json(shift)
}

export async function activeHandler(req: Request, res: Response): Promise<void> {
  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined
  res.json(await getActiveShift(deviceId))
}

export async function summaryHandler(req: Request, res: Response): Promise<void> {
  res.json(await getShiftSummary(param(req.params.id)))
}

export async function closeHandler(req: Request, res: Response): Promise<void> {
  res.json(
    await closeShift({
      shiftId: param(req.params.id),
      operator: req.operator!,
      correlationId: req.correlationId
    })
  )
}

export async function detailHandler(req: Request, res: Response): Promise<void> {
  res.json(await getActiveShiftById(param(req.params.id)))
}
