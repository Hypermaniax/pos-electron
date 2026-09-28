import { describe, expect, it } from 'vitest'
import type { SessionState } from '@shared/types'
import { can, Permissions } from './permissions'

function sessionWith(permissions: string[]): SessionState {
  return {
    operator: {
      id: 'usr_test',
      username: 'tester',
      name: 'Tester',
      role: 'Operator',
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
