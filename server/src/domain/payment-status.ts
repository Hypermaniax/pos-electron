import type { PaymentStatus } from './types'

/**
 * Transisi status pembayaran yang diizinkan. Backend adalah authority; POS
 * hanya menampilkan status dan mengirim permintaan aksi.
 */
const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  UNPAID: ['PENDING_QR', 'PENDING_EMONEY', 'PAID', 'CANCELLED'],
  PENDING_QR: ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
  PENDING_EMONEY: ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
  PAID: ['CANCELLED'],
  FAILED: ['UNPAID', 'PENDING_QR', 'PENDING_EMONEY', 'CANCELLED'],
  EXPIRED: ['UNPAID', 'PENDING_QR', 'PENDING_EMONEY', 'CANCELLED'],
  CANCELLED: ['UNPAID', 'PENDING_QR', 'PENDING_EMONEY']
}

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  const allowed = TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

export function isFinal(status: PaymentStatus): boolean {
  return status === 'PAID'
}

export function canOpenGate(status: PaymentStatus): boolean {
  return status === 'PAID'
}

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'UNPAID',
  'PENDING_QR',
  'PENDING_EMONEY',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELLED'
]
