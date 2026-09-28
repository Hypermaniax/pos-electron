import type { Db } from './db'

export function ping(db: Db) {
  return db.$queryRaw`SELECT 1`
}
