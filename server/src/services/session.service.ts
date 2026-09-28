import { prisma } from '../db/prisma'
import { Errors } from '../lib/errors'
import { calculateAmount, durationMinutes } from '../domain/tariff'
import {
  findSessionById,
  searchSessionsByScan,
  searchSessionsByText
} from '../repositories/session.repository'
import type {
  ParkingSession,
  SearchInput
} from '../domain/types'
import type { ParkingSession as ParkingSessionRow } from '../generated/prisma/client'

export type SessionRow = ParkingSessionRow

export function toParkingSession(row: ParkingSessionRow): ParkingSession {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    plateNumber: row.plateNumber,
    vehicleType: row.vehicleType,
    entryTime: row.entryTime.toISOString(),
    durationMinutes: durationMinutes(row.entryTime.toISOString()),
    amount: row.amount ?? calculateAmount(row.vehicleType, row.entryTime.toISOString()),
    sessionStatus: row.sessionStatus as ParkingSession['sessionStatus'],
    paymentStatus: row.paymentStatus as ParkingSession['paymentStatus'],
    laneIn: row.laneIn,
    canExit: row.paymentStatus === 'PAID'
  }
}

function compact(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '')
}

export function parseScanPayload(
  payload: string
): { ticketNumber: string; plateNumber: string } | null {
  const trimmed = payload.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { ticket?: unknown; plate?: unknown }
      if (parsed.ticket && parsed.plate) {
        return { ticketNumber: String(parsed.ticket), plateNumber: String(parsed.plate) }
      }
    } catch {
      return null
    }
    return null
  }
  const parts = trimmed
    .split(/[|;,\t]/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    return { ticketNumber: parts[0]!, plateNumber: parts[1]! }
  }
  if (/^TKT-/i.test(trimmed)) {
    return { ticketNumber: trimmed, plateNumber: '' }
  }
  return null
}

export async function searchSessions(input: SearchInput): Promise<ParkingSession[]> {
  if (input.mode === 'scan') {
    const parsed = parseScanPayload(input.payload ?? '')
    if (!parsed) {
      throw Errors.validation('Payload scan tidak dapat dibaca. Coba pindai ulang tiket.')
    }
    const rows = await searchSessionsByScan(
      prisma,
      compact(parsed.ticketNumber),
      compact(parsed.plateNumber)
    )
    return rows.map(toParkingSession)
  }

  const rawQuery = input.plateNumber?.trim() || input.ticketNumber?.trim()
  if (!rawQuery) {
    throw Errors.validation('Masukkan nomor tiket atau nomor plat kendaraan.')
  }
  const rows = await searchSessionsByText(prisma, rawQuery.toUpperCase(), compact(rawQuery))
  return rows.map(toParkingSession)
}

export async function getSessionOrThrow(sessionId: string): Promise<SessionRow> {
  const row = await findSessionById(prisma, sessionId)
  if (!row) throw Errors.notFound('NOT_FOUND', 'Sesi parkir tidak ditemukan.')
  return row
}

export async function getSession(sessionId: string): Promise<ParkingSession> {
  return toParkingSession(await getSessionOrThrow(sessionId))
}

export function resolveSessionAmount(session: SessionRow): number {
  return session.amount ?? calculateAmount(session.vehicleType, session.entryTime.toISOString())
}
