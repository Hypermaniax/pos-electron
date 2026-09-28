import { prisma } from '../db/prisma'
import { ping } from '../repositories/health.repository'

export interface HealthState {
  status: 'ok' | 'degraded'
  db: 'up' | 'down'
  version: string
  time: string
}

export async function getHealth(): Promise<HealthState> {
  let db: HealthState['db'] = 'up'
  try {
    await ping(prisma)
  } catch {
    db = 'down'
  }
  return {
    status: db === 'up' ? 'ok' : 'degraded',
    db,
    version: '0.1.0',
    time: new Date().toISOString()
  }
}
