export function newKey(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}
