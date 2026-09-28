/** Tarif contoh untuk backend test. Authority tarif produksi ada di parking-engine. */

const RATES: Record<string, number> = {
  Motor: 2000,
  Mobil: 3000,
  Truk: 5000,
  Bus: 7000
}

export function vehicleRate(vehicleType: string): number {
  return RATES[vehicleType] ?? 3000
}

export function calculateAmount(vehicleType: string, entryTime: string, now = Date.now()): number {
  const minutes = Math.max(1, Math.ceil((now - new Date(entryTime).getTime()) / 60_000))
  const hours = Math.max(1, Math.ceil(minutes / 60))
  return vehicleRate(vehicleType) * hours
}

export function durationMinutes(entryTime: string, now = Date.now()): number {
  return Math.max(1, Math.ceil((now - new Date(entryTime).getTime()) / 60_000))
}
