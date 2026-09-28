import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { Errors } from '../lib/errors'
import { errorHandler, notFoundHandler } from './error'
import type { Request, Response } from 'express'

let capturedStatus = 0
let capturedBody: unknown

const res = {
  status(code: number) {
    capturedStatus = code
    return this
  },
  json(payload: unknown) {
    capturedBody = payload
    return this
  }
} as unknown as Response

const req = {
  correlationId: 'corr_test',
  path: '/api/v1/test',
  method: 'GET',
  originalUrl: '/api/v1/test'
} as unknown as Request

afterEach(() => {
  capturedStatus = 0
  capturedBody = undefined
  vi.clearAllMocks()
})

const next = vi.fn()

describe('error middleware', () => {
  it('mengirim 404 untuk route tidak ditemukan', () => {
    notFoundHandler(req, res)
    expect(capturedStatus).toBe(404)
    expect((capturedBody as { error: { code: string } }).error.code).toBe('ROUTE_NOT_FOUND')
    expect((capturedBody as { error: { correlationId?: string } }).error.correlationId).toBe(
      'corr_test'
    )
  })

  it('menvalidasi error Zod menjadi 422', () => {
    errorHandler(new ZodError([]), req, res, next)
    expect(capturedStatus).toBe(422)
    const body = (capturedBody as { error: { code: string; details: unknown[] } }).error
    expect(body.code).toBe('VALIDATION')
    expect(Array.isArray(body.details)).toBe(true)
  })

  it('memakai httpStatus AppError', () => {
    errorHandler(Errors.conflict('SHIFT_OPEN', 'aktif'), req, res, next)
    expect(capturedStatus).toBe(409)
    expect((capturedBody as { error: { code: string } }).error.code).toBe('SHIFT_OPEN')
  })

  it('memetakan body JSON rusak menjadi 400', () => {
    const parseFailed = Object.assign(new SyntaxError('Unexpected token i in JSON'), {
      type: 'entity.parse.failed',
      status: 400
    })
    errorHandler(parseFailed, req, res, next)
    expect(capturedStatus).toBe(400)
    expect((capturedBody as { error: { code: string } }).error.code).toBe('BODY_INVALID')
  })

  it('memetakan body terlalu besar menjadi 413', () => {
    errorHandler(
      Object.assign(new RangeError('too large'), {
        type: 'entity.too.large',
        status: 413
      }),
      req,
      res,
      next
    )
    expect(capturedStatus).toBe(413)
    expect((capturedBody as { error: { code: string } }).error.code).toBe('BODY_TOO_LARGE')
  })

  it('menyembunyikan pesan error internal dari klien', () => {
    errorHandler(new Error('rahasia koneksi database gagal'), req, res, next)
    expect(capturedStatus).toBe(500)
    const body = (capturedBody as { error: { code: string; message: string } }).error
    expect(body.code).toBe('INTERNAL_ERROR')
    expect(body.message).not.toContain('rahasia')
  })
})
