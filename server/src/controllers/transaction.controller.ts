import type { Request, Response } from 'express'
import { z } from 'zod'
import { first, intParam, param, parse } from '../lib/validate'
import { PAYMENT_STATUSES } from '../domain/payment-status'
import {
  cancelTransaction,
  getTransactionOrThrow,
  listTransactions
} from '../services/transaction.service'
import type { PaymentMethod, PaymentStatus } from '../domain/types'

const METHODS: PaymentMethod[] = ['cash', 'qr', 'emoney']

const CancelSchema = z.object({ reason: z.string().min(1) })

export async function listHandler(req: Request, res: Response): Promise<void> {
  const method = first(req.query.method)
  const status = first(req.query.status)
  const items = await listTransactions({
    shiftId: first(req.query.shiftId),
    method:
      method && METHODS.includes(method as PaymentMethod)
        ? (method as PaymentMethod)
        : undefined,
    status:
      status && PAYMENT_STATUSES.includes(status as PaymentStatus)
        ? (status as PaymentStatus)
        : undefined,
    from: first(req.query.from),
    to: first(req.query.to),
    limit: intParam(first(req.query.limit), 200, 500)
  })
  res.json({ items })
}

export async function receiptHandler(req: Request, res: Response): Promise<void> {
  res.json(await getTransactionOrThrow(param(req.params.id)))
}

export async function detailHandler(req: Request, res: Response): Promise<void> {
  res.json(await getTransactionOrThrow(param(req.params.id)))
}

export async function cancelHandler(req: Request, res: Response): Promise<void> {
  const body = parse(CancelSchema, req.body)
  res.json(
    await cancelTransaction({
      transactionId: param(req.params.id),
      reason: body.reason,
      operator: req.operator!,
      correlationId: req.correlationId
    })
  )
}
