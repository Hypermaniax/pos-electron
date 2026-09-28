import type { Request, Response } from 'express'
import { z } from 'zod'
import { param, parse } from '../lib/validate'
import { readIdempotencyKey } from '../lib/idempotency'
import {
  cancelEmoneyIntent,
  cancelQrIntent,
  completeQrIntent,
  createEmoneyIntent,
  createQrIntent,
  getEmoneyIntent,
  getQrIntent,
  payCash,
  tapEmoney
} from '../services/payment.service'

const DeviceSchema = z.object({ deviceId: z.string().min(1).optional() })

const CashSchema = DeviceSchema.extend({
  sessionId: z.string().min(1),
  amountReceived: z.number().int().nonnegative()
})

const SessionSchema = DeviceSchema.extend({
  sessionId: z.string().min(1)
})

const SimulateSchema = z.object({
  result: z.enum(['paid', 'failed']),
  failReason: z.string().optional(),
  deviceId: z.string().optional()
})

const ReasonSchema = z.object({
  reason: z.string().min(1),
  deviceId: z.string().optional()
})

const TapSchema = z.object({
  result: z.enum(['paid', 'insufficient', 'unreadable', 'failed', 'timeout']),
  cardMasked: z.string().optional(),
  deviceId: z.string().optional()
})

export async function cashHandler(req: Request, res: Response): Promise<void> {
  const body = parse(CashSchema, req.body)
  const transaction = await payCash({
    sessionId: body.sessionId,
    amountReceived: body.amountReceived,
    operator: req.operator!,
    deviceId: body.deviceId,
    correlationId: req.correlationId,
    idempotencyKey: readIdempotencyKey(req)
  })
  res.status(201).json(transaction)
}

export async function qrCreateHandler(req: Request, res: Response): Promise<void> {
  const body = parse(SessionSchema, req.body)
  const intent = await createQrIntent({
    sessionId: body.sessionId,
    operator: req.operator!,
    deviceId: body.deviceId,
    correlationId: req.correlationId
  })
  res.status(201).json(intent)
}

export async function qrGetHandler(req: Request, res: Response): Promise<void> {
  res.json(await getQrIntent(param(req.params.id)))
}

export async function qrSimulateHandler(req: Request, res: Response): Promise<void> {
  const body = parse(SimulateSchema, req.body)
  res.json(
    await completeQrIntent({
      intentId: param(req.params.id),
      result: body.result,
      failReason: body.failReason,
      deviceId: body.deviceId,
      operator: req.operator!,
      correlationId: req.correlationId
    })
  )
}

export async function qrCancelHandler(req: Request, res: Response): Promise<void> {
  const body = parse(ReasonSchema, req.body)
  res.json(
    await cancelQrIntent({
      intentId: param(req.params.id),
      reason: body.reason,
      operator: req.operator!,
      deviceId: body.deviceId,
      correlationId: req.correlationId
    })
  )
}

export async function emoneyCreateHandler(req: Request, res: Response): Promise<void> {
  const body = parse(SessionSchema, req.body)
  const intent = await createEmoneyIntent({
    sessionId: body.sessionId,
    operator: req.operator!,
    deviceId: body.deviceId,
    correlationId: req.correlationId
  })
  res.status(201).json(intent)
}

export async function emoneyGetHandler(req: Request, res: Response): Promise<void> {
  res.json(await getEmoneyIntent(param(req.params.id)))
}

export async function emoneyTapHandler(req: Request, res: Response): Promise<void> {
  const body = parse(TapSchema, req.body)
  res.json(
    await tapEmoney({
      intentId: param(req.params.id),
      result: body.result,
      cardMasked: body.cardMasked,
      deviceId: body.deviceId,
      operator: req.operator!,
      correlationId: req.correlationId
    })
  )
}

export async function emoneyCancelHandler(req: Request, res: Response): Promise<void> {
  const body = parse(ReasonSchema, req.body)
  res.json(
    await cancelEmoneyIntent({
      intentId: param(req.params.id),
      reason: body.reason,
      operator: req.operator!,
      deviceId: body.deviceId,
      correlationId: req.correlationId
    })
  )
}
