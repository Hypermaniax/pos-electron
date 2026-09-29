export const PREVIEW_RATES: Record<string, number> = {
  '1': 2000,
  '2': 3000,
  '3': 5000
}

export function calculateAmount(
  groupId: number,
  hours: number,
  minutes: number,
  rounding: string
): { total: number; breakdown: string } {
  const rate = PREVIEW_RATES[groupId] ?? 3000
  const totalMinutes = hours * 60 + minutes
  if (totalMinutes <= 0) return { total: 0, breakdown: 'Durasi 0 menit' }
  const unit = rounding === '60' ? 60 : 30
  const units = Math.ceil(totalMinutes / unit)
  if (unit === 60) {
    const hoursBilled = Math.max(1, units)
    return {
      total: rate * hoursBilled,
      breakdown: `${hoursBilled} jam terhitung (ceil per jam penuh)`
    }
  }
  const perHalf = Math.round(rate / 2)
  return {
    total: perHalf * units,
    breakdown: `${units} blok × 30 menit @ ${perHalf}`
  }
}
