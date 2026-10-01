import { describe, expect, it } from 'vitest'
import type { SessionState } from '@shared/types'
import { can, homeRouteFor, isOperator, Permissions } from './permissions'

function sessionWith(permissions: string[], role = 'Operator'): SessionState {
  return {
    operator: {
      id: 'usr_test',
      username: 'tester',
      name: 'Tester',
      role,
      permissions
    },
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  }
}

describe('can', () => {
  it('menolak akses saat belum login', () => {
    expect(can(null, Permissions.PaymentCash)).toBe(false)
  })

  it('mengizinkan bila permission dimiliki', () => {
    expect(can(sessionWith([Permissions.PaymentCash]), Permissions.PaymentCash)).toBe(true)
  })

  it('menolak bila permission tidak dimiliki', () => {
    expect(can(sessionWith([Permissions.SessionView]), Permissions.PaymentCash)).toBe(false)
  })
})

describe('isOperator / homeRouteFor', () => {
  it('operator hanya boleh ke loket', () => {
    const session = sessionWith([], 'Operator')
    expect(isOperator(session)).toBe(true)
    expect(homeRouteFor(session)).toBe('/loket')
  })

  it('supervisor dan admin masuk ke dashboard', () => {
    expect(isOperator(sessionWith([], 'Supervisor'))).toBe(false)
    expect(homeRouteFor(sessionWith([], 'Supervisor'))).toBe('/dashboard')
    expect(homeRouteFor(sessionWith([], 'Admin'))).toBe('/dashboard')
  })

  it('tanpa sesi tidak dianggap operator', () => {
    expect(isOperator(null)).toBe(false)
    expect(homeRouteFor(null)).toBe('/dashboard')
  })
})
