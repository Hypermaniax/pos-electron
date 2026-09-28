import type { RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config/env'

export const globalLimiter: RequestHandler = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/v1/health'),
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi nanti.' }
    })
  }
})

export const loginLimiter: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MINUTES * 60_000,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan login. Coba lagi nanti.' }
    })
  }
})
