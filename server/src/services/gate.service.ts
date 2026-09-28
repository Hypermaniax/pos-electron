import { prisma } from '../db/prisma'
import { AppError } from '../lib/errors'
import { canOpenGate } from '../domain/payment-status'
import { findIdempotent, saveIdempotentInTx } from '../lib/idempotency'
import {
  closeSessionIfPaid,
  updateSessionById
} from '../repositories/session.repository'
import { getSessionOrThrow } from './session.service'
import { recordAudit, recordAuditInTx } from './audit.service'
import type { GateResult, OperatorProfile, PaymentStatus } from '../domain/types'

export type GateSimulation = 'none' | 'failed' | 'timeout'

export async function openGate(input: {
  sessionId: string
  correlationId: string
  operator: OperatorProfile
  deviceId?: string
  simulate?: GateSimulation
  idempotencyKey: string
}): Promise<GateResult> {
  const cached = await findIdempotent<GateResult>(input.idempotencyKey, 'gate.open')
  if (cached) return cached

  const session = await getSessionOrThrow(input.sessionId)
  if (!canOpenGate(session.paymentStatus as PaymentStatus)) {
    throw new AppError(
      'GATE_NOT_ALLOWED',
      'Palang hanya dapat dibuka setelah pembayaran lunas.',
      409
    )
  }

  const simulate = input.simulate ?? 'none'
  const result: GateResult =
    simulate === 'failed'
      ? {
          status: 'FAILED',
          message: 'Perintah buka palang ditolak perangkat gerbang.',
          correlationId: input.correlationId,
          sessionId: session.id,
          openedAt: null
        }
      : simulate === 'timeout'
        ? {
            status: 'TIMEOUT',
            message: 'Perangkat gerbang tidak merespons tepat waktu.',
            correlationId: input.correlationId,
            sessionId: session.id,
            openedAt: null
          }
        : {
            status: 'SUCCESS',
            message: 'Palang pintu berhasil dibuka.',
            correlationId: input.correlationId,
            sessionId: session.id,
            openedAt: new Date().toISOString()
          }

  if (result.status === 'SUCCESS') {
    await prisma.$transaction(async (tx) => {
      // Klaim kondisional: lindungi dari cancel pembayaran yang berlangsung
      // bersamaan dengan buka palang.
      const claimed = await closeSessionIfPaid(tx, session.id, new Date())
      if (claimed.count === 0) {
        throw new AppError(
          'GATE_NOT_ALLOWED',
          'Palang hanya dapat dibuka setelah pembayaran lunas.',
          409
        )
      }
      await saveIdempotentInTx(tx, input.idempotencyKey, 'gate.open', result)
      await recordAuditInTx(tx, {
        correlationId: input.correlationId,
        action: 'gate.opened',
        operator: input.operator,
        deviceId: input.deviceId ?? null,
        entityType: 'parking_session',
        entityId: input.sessionId,
        metadata: { status: result.status, message: result.message }
      })
    })
  } else {
    await recordAudit({
      correlationId: input.correlationId,
      action: 'gate.open.failed',
      operator: input.operator,
      deviceId: input.deviceId ?? null,
      entityType: 'parking_session',
      entityId: input.sessionId,
      metadata: { status: result.status, message: result.message }
    })
  }
  return result
}

export async function overrideGate(input: {
  sessionId: string
  reason: string
  correlationId: string
  operator: OperatorProfile
  deviceId?: string
}): Promise<GateResult> {
  const session = await getSessionOrThrow(input.sessionId)
  await updateSessionById(prisma, session.id, {
    sessionStatus: 'CLOSED',
    closedAt: new Date()
  })
  const result: GateResult = {
    status: 'SUCCESS',
    message: `Override buka palang oleh supervisor: ${input.reason}`,
    correlationId: input.correlationId,
    sessionId: session.id,
    openedAt: new Date().toISOString()
  }
  await recordAudit({
    correlationId: input.correlationId,
    action: 'gate.override',
    operator: input.operator,
    deviceId: input.deviceId ?? null,
    entityType: 'parking_session',
    entityId: input.sessionId,
    reason: input.reason
  })
  return result
}
