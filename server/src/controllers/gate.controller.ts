import type { Request, Response } from 'express'
import { z } from 'zod'
import { parse } from '../lib/validate'
import { readIdempotencyKey } from '../lib/idempotency'
import { openGate, overrideGate } from '../services/gate.service'

const OpenSchema = z.object({
  sessionId: z.string().min(1),
  simulate: z.enum(['none', 'failed', 'timeout']).optional(),
  deviceId: z.string().optional()
})

const OverrideSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().min(1),
  deviceId: z.string().optional()
})

export async function openHandler(req: Request, res: Response): Promise<void> {
  const body = parse(OpenSchema, req.body)
  const result = await openGate({
    sessionId: body.sessionId,
    correlationId: req.correlationId,
    operator: req.operator!,
    deviceId: body.deviceId,
    simulate: body.simulate,
    idempotencyKey: readIdempotencyKey(req)
  })
  res.json(result)
}

export async function overrideHandler(req: Request, res: Response): Promise<void> {
  const body = parse(OverrideSchema, req.body)
  const result = await overrideGate({
    sessionId: body.sessionId,
    reason: body.reason,
    correlationId: req.correlationId,
    operator: req.operator!,
    deviceId: body.deviceId
  })
  res.json(result)
}
