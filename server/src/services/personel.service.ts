import { prisma } from '../db/prisma'
import type { PersonelRow } from '../controllers/personel.controller'

export async function listPersonel(): Promise<PersonelRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { permissions: { orderBy: { permission: 'asc' } } }
  })
  return users.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    permissions: user.permissions.map((entry) => entry.permission)
  }))
}

export async function setPersonelActive(id: string, active: boolean): Promise<PersonelRow> {
  const user = await prisma.user.update({
    where: { id },
    data: { active },
    include: { permissions: { orderBy: { permission: 'asc' } } }
  })
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    permissions: user.permissions.map((entry) => entry.permission)
  }
}
