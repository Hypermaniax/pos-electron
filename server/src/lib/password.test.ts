import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('hash bisa diverifikasi password benar', () => {
    const stored = hashPassword('rahasia123')
    expect(stored.startsWith('scrypt$')).toBe(true)
    expect(verifyPassword('rahasia123', stored)).toBe(true)
  })

  it('menolak password salah', () => {
    const stored = hashPassword('rahasia123')
    expect(verifyPassword('salah', stored)).toBe(false)
  })

  it('menolak format tersimpan tidak valid', () => {
    expect(verifyPassword('rahasia123', '')).toBe(false)
    expect(verifyPassword('rahasia123', 'bcrypt$abc$def')).toBe(false)
    expect(verifyPassword('rahasia123', 'scrypt$abc$def')).toBe(false)
  })
})
