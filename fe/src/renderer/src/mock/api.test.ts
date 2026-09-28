import { beforeEach, describe, expect, it } from 'vitest'
import {
  cancelQrIntent,
  createQrIntent,
  listTransactions,
  openShift,
  payCash,
  parseScanPayload,
  searchSessions
} from './api'
import { DEMO_USERS } from './store'

const operator = DEMO_USERS[0].profile

describe('parseScanPayload', () => {
  it('menerima payload pipe', () => {
    expect(parseScanPayload('TKT-20260928-0001|B 1234 XYZ')).toEqual({
      ticketNumber: 'TKT-20260928-0001',
      plateNumber: 'B 1234 XYZ'
    })
  })

  it('menolak payload kosong', () => {
    expect(parseScanPayload('')).toBeNull()
  })
})

describe('pencarian tiket', () => {
  it('mengembalikan beberapa sesi untuk plat yang sama', async () => {
    const result = await searchSessions({ mode: 'manual', plateNumber: 'B 1234 XYZ' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.length).toBeGreaterThanOrEqual(2)
      expect(result.data.every((session) => session.plateNumber === 'B 1234 XYZ')).toBe(true)
    }
  })

  it('menolak payload scan yang tidak valid', async () => {
    const result = await searchSessions({ mode: 'scan', payload: '@@@' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('SCAN_INVALID')
  })
})

describe('pembayaran cash', () => {
  it('mencegah pembayaran ganda dengan idempotency key', async () => {
    const first = await payCash('ses_0001', 100000, 'test-cash-key', operator)
    expect(first.ok).toBe(true)
    const second = await payCash('ses_0001', 100000, 'test-cash-key', operator)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) expect(second.data.id).toBe(first.data.id)
  })

  it('menolak tagihan yang sudah lunas', async () => {
    const result = await payCash('ses_0005', 100000, 'test-paid-key', operator)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ALREADY_PAID')
  })

  it('menolak uang yang kurang', async () => {
    const result = await payCash('ses_0003', 100, 'test-short-key', operator)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INSUFFICIENT_AMOUNT')
  })
})

describe('pembayaran QR', () => {
  it('membuat lalu membatalkan QR pending', async () => {
    const created = await createQrIntent('ses_0002', operator)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.data.status).toBe('PENDING_QR')

    const cancelled = await cancelQrIntent(created.data.id, 'Pelanggan pilih tunai', operator)
    expect(cancelled.ok).toBe(true)
    if (cancelled.ok) expect(cancelled.data.status).toBe('CANCELLED')

    const again = await cancelQrIntent(created.data.id, 'lagi', operator)
    expect(again.ok).toBe(false)
  })
})

describe('shift', () => {
  let shiftId = ''

  beforeEach(async () => {
    if (!shiftId) {
      const opened = await openShift(200000, operator, 'dev_test', 'Loket Uji')
      if (opened.ok) shiftId = opened.data.id
    }
  })

  it('mencatat transaksi pada shift aktif', async () => {
    const rows = await listTransactions(shiftId)
    expect(Array.isArray(rows)).toBe(true)
  })
})
