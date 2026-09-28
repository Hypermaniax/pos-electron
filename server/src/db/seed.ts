import { prisma, disconnectPrisma } from './prisma'
import { logger } from '../lib/logger'
import { hashPassword } from '../lib/password'
import { Permissions } from '../domain/permissions'
import type { Prisma } from '../generated/prisma/client'

interface SeedUser {
  id: string
  username: string
  name: string
  role: string
  password: string
  permissions: string[]
}

const OPERATOR_PERMISSIONS = [
  Permissions.SessionView,
  Permissions.PaymentCash,
  Permissions.PaymentQr,
  Permissions.PaymentCancel,
  Permissions.GateOpen,
  Permissions.ReceiptPrint,
  Permissions.ReceiptReprint,
  Permissions.ShiftManage,
  Permissions.HistoryView
]

const TECHNICIAN_PERMISSIONS = [Permissions.SessionView, Permissions.SettingsManage]

const SEED_USERS: SeedUser[] = [
  {
    id: 'usr_operator',
    username: 'operator',
    name: 'Budi Santoso',
    role: 'Operator',
    password: 'operator123',
    permissions: OPERATOR_PERMISSIONS
  },
  {
    id: 'usr_supervisor',
    username: 'supervisor',
    name: 'Siti Rahayu',
    role: 'Supervisor',
    password: 'supervisor123',
    permissions: Object.values(Permissions)
  },
  {
    id: 'usr_teknisi',
    username: 'teknisi',
    name: 'Andi Pratama',
    role: 'Teknisi',
    password: 'teknisi123',
    permissions: TECHNICIAN_PERMISSIONS
  }
]

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000)
}

const SEED_SESSIONS = [
  { id: 'ses_0001', ticket: 'TKT-20260928-0001', plate: 'B 1234 XYZ', vehicle: 'Mobil', minutes: 135, lane: 'Masuk 1' },
  { id: 'ses_0002', ticket: 'TKT-20260928-0002', plate: 'D 5678 ABC', vehicle: 'Motor', minutes: 42, lane: 'Masuk 2' },
  { id: 'ses_0003', ticket: 'TKT-20260928-0003', plate: 'B 9999 ZZ', vehicle: 'Truk', minutes: 305, lane: 'Masuk 1' },
  { id: 'ses_0004', ticket: 'TKT-20260928-0004', plate: 'B 1234 XYZ', vehicle: 'Mobil', minutes: 28, lane: 'Masuk 3' },
  { id: 'ses_0006', ticket: 'TKT-20260928-0006', plate: 'BE 2222 BB', vehicle: 'Motor', minutes: 70, lane: 'Masuk 1' }
]

export async function runSeed(): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.permission.createMany({
      data: Object.values(Permissions).map((name) => ({ name })),
      skipDuplicates: true
    })

    for (const user of SEED_USERS) {
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          username: user.username,
          passwordHash: hashPassword(user.password),
          name: user.name,
          role: user.role,
          active: true
        },
        update: {
          username: user.username,
          passwordHash: hashPassword(user.password),
          name: user.name,
          role: user.role,
          active: true
        }
      })
      await tx.userPermission.deleteMany({ where: { userId: user.id } })
      await tx.userPermission.createMany({
        data: user.permissions.map((permission) => ({ userId: user.id, permission })),
        skipDuplicates: true
      })
    }

    await tx.device.upsert({
      where: { id: 'dev_001' },
      create: {
        id: 'dev_001',
        name: 'Loket 1',
        laneName: 'Loket 1',
        gateName: 'Gerbang Keluar 1',
        mode: 'operator'
      },
      update: {
        name: 'Loket 1',
        laneName: 'Loket 1',
        gateName: 'Gerbang Keluar 1',
        mode: 'operator'
      }
    })

    for (const session of SEED_SESSIONS) {
      const data = {
        ticketNumber: session.ticket,
        plateNumber: session.plate,
        vehicleType: session.vehicle,
        entryTime: minutesAgo(session.minutes),
        sessionStatus: 'ACTIVE',
        paymentStatus: 'UNPAID',
        laneIn: session.lane,
        amount: null,
        paidAt: null,
        closedAt: null
      }
      await tx.parkingSession.upsert({
        where: { id: session.id },
        create: { id: session.id, ...data },
        update: data
      })
    }
  })
}

if (require.main === module) {
  runSeed()
    .then(() => {
      logger.info('Seed selesai.')
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'Seed gagal.')
      process.exitCode = 1
    })
    .finally(() => {
      void disconnectPrisma()
    })
}
