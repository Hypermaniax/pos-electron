import { Prisma, type ParkingSession } from '../generated/prisma/client'
import type { Db } from './db'

const RAW_COLUMNS = `id,
  ticket_number AS "ticketNumber",
  plate_number AS "plateNumber",
  vehicle_type AS "vehicleType",
  entry_time AS "entryTime",
  session_status AS "sessionStatus",
  payment_status AS "paymentStatus",
  lane_in AS "laneIn",
  amount`

export function findSessionById(db: Db, id: string) {
  return db.parkingSession.findUnique({ where: { id } })
}

export function findFirstSession(db: Db, where: Prisma.ParkingSessionWhereInput) {
  return db.parkingSession.findFirst({ where })
}

export function closeSessionIfPaid(db: Db, id: string, closedAt: Date) {
  return db.parkingSession.updateMany({
    where: { id, paymentStatus: 'PAID' },
    data: { sessionStatus: 'CLOSED', closedAt }
  })
}

export function updateSessionById(
  db: Db,
  id: string,
  data: Prisma.ParkingSessionUncheckedUpdateInput
) {
  return db.parkingSession.update({ where: { id }, data })
}

export function updateSessionIfPaymentStatus(
  db: Db,
  input: { id: string; from: string; data: Prisma.ParkingSessionUncheckedUpdateInput }
) {
  return db.parkingSession.updateMany({
    where: { id: input.id, paymentStatus: input.from },
    data: input.data
  })
}

export function updateSessions(
  db: Db,
  where: Prisma.ParkingSessionWhereInput,
  data: Prisma.ParkingSessionUncheckedUpdateInput
) {
  return db.parkingSession.updateMany({ where, data })
}

export function searchSessionsByScan(db: Db, ticket: string, plate: string) {
  return db.$queryRaw<ParkingSession[]>`
    SELECT ${Prisma.raw(RAW_COLUMNS)} FROM parking_sessions
    WHERE upper(replace(ticket_number, ' ', '')) = ${ticket}
      OR upper(replace(plate_number, ' ', '')) = ${plate}
    ORDER BY entry_time DESC`
}

export function searchSessionsByText(db: Db, normalized: string, compacted: string) {
  return db.$queryRaw<ParkingSession[]>`
    SELECT ${Prisma.raw(RAW_COLUMNS)} FROM parking_sessions
    WHERE upper(ticket_number) LIKE '%' || ${normalized} || '%'
      OR upper(replace(plate_number, ' ', '')) LIKE '%' || ${compacted} || '%'
    ORDER BY entry_time DESC`
}
