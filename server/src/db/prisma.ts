import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../config/env'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = new PrismaClient({ adapter })

export async function connectPrisma(): Promise<void> {
  await prisma.$connect()
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
