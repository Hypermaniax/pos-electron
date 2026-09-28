import { describe, expect, it } from 'vitest'
import { calculateAmount, vehicleRate } from './tariff'
import { canOpenGate, canTransition, isFinal } from './payment-status'
import { parseScanPayload } from '../services/session.service'

describe('tariff', () => {
  it('memakai tarif per jenis kendaraan', () => {
    expect(vehicleRate('Motor')).toBe(2000)
    expect(vehicleRate('Tidak Dikenal')).toBe(3000)
  })

  it('menghitung minimal satu jam', () => {
    const entry = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(calculateAmount('Mobil', entry)).toBe(3000)
  })

  it('menghitung per jam berjalan', () => {
    const entry = new Date(Date.now() - 121 * 60_000).toISOString()
    expect(calculateAmount('Mobil', entry)).toBe(9000)
  })
})

describe('payment status', () => {
  it('mengizinkan transisi valid', () => {
    expect(canTransition('UNPAID', 'PENDING_QR')).toBe(true)
    expect(canTransition('PENDING_QR', 'PAID')).toBe(true)
  })

  it('menolak transisi tidak valid', () => {
    expect(canTransition('PAID', 'PENDING_QR')).toBe(false)
    expect(canTransition('CANCELLED', 'PAID')).toBe(false)
  })

  it('menolak status tak dikenal tanpa crash', () => {
    expect(canTransition('STATUS_ANEH' as never, 'PAID' as never)).toBe(false)
  })

  it('hanya PAID yang membuka palang dan final', () => {
    expect(canOpenGate('PAID')).toBe(true)
    expect(canOpenGate('PENDING_QR')).toBe(false)
    expect(isFinal('PAID')).toBe(true)
    expect(isFinal('UNPAID')).toBe(false)
  })
})

describe('parseScanPayload', () => {
  it('membaca payload pipe dan json', () => {
    expect(parseScanPayload('TKT-1|B 1234 XYZ')).toEqual({
      ticketNumber: 'TKT-1',
      plateNumber: 'B 1234 XYZ'
    })
    expect(parseScanPayload('{"ticket":"TKT-2","plate":"D 1 AA"}')).toEqual({
      ticketNumber: 'TKT-2',
      plateNumber: 'D 1 AA'
    })
  })

  it('menolak payload tidak valid', () => {
    expect(parseScanPayload('')).toBeNull()
    expect(parseScanPayload('{invalid')).toBeNull()
  })
})
