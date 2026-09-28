import type { Db } from './db'

export function findUserById(db: Db, id: string) {
  return db.user.findUnique({ where: { id } })
}

export function findUserByUsername(db: Db, username: string) {
  return db.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
}

export function findPermissionsByUserId(db: Db, userId: string) {
  return db.userPermission.findMany({ where: { userId }, orderBy: { permission: 'asc' } })
}
