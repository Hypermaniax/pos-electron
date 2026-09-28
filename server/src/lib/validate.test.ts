import { describe, expect, it } from 'vitest'
import { first, intParam, param } from './validate'

describe('param', () => {
  it('mengambil string langsung', () => {
    expect(param('abc')).toBe('abc')
  })

  it('mengambil elemen pertama dari array', () => {
    expect(param(['a', 'b'])).toBe('a')
  })

  it('kembalikan string kosong untuk undefined/skema asing', () => {
    expect(param(undefined)).toBe('')
    expect(param([])).toBe('')
    expect(param(42 as unknown as string)).toBe('')
  })
})

describe('intParam', () => {
  it('memakai fallback untuk nilai tidak valid', () => {
    expect(intParam(undefined, 200, 500)).toBe(200)
    expect(intParam('abc', 200, 500)).toBe(200)
    expect(intParam('-5', 200, 500)).toBe(200)
    expect(intParam('0', 200, 500)).toBe(200)
  })

  it('membatasi maksimum dan membulatkan desimal', () => {
    expect(intParam('100', 200, 500)).toBe(100)
    expect(intParam('999', 200, 500)).toBe(500)
    expect(intParam('12.7', 200, 500)).toBe(12)
  })
})

describe('first', () => {
  it('mengambil string pertama', () => {
    expect(first('a')).toBe('a')
    expect(first(['x', 'y'])).toBe('x')
    expect(first(undefined)).toBeUndefined()
    expect(first(7 as unknown as string)).toBeUndefined()
  })
})
