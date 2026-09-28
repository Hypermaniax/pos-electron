import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgres://postgres:postgres@localhost:5432/pos_site'),
  JWT_SECRET: z.string().min(1).default('dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),
  QR_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  EMONEY_TTL_SECONDS: z.coerce.number().int().positive().default(90),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_LOGIN_WINDOW_MINUTES: z.coerce.number().int().positive().default(15)
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
  throw new Error(`Konfigurasi environment tidak valid:\n${issues.join('\n')}`)
}

const value = parsed.data

if (value.NODE_ENV === 'production' && value.JWT_SECRET === 'dev-secret-change-me') {
  throw new Error(
    'Konfigurasi environment tidak valid:\nJWT_SECRET: default dev secret tidak boleh dipakai di produksi.'
  )
}

export const env = value

export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

export function corsOrigins(): string[] | true {
  if (env.CORS_ORIGIN.trim() === '*') return true
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}
