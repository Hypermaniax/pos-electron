import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

type Level = 'info' | 'warn' | 'error'

function logDir(): string {
  return join(app.getPath('userData'), 'logs')
}

function line(level: Level, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString()
  const suffix = meta ? ` ${JSON.stringify(meta)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${suffix}\n`
}

export function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  const text = line(level, message, meta)
  if (level === 'error') console.error(text.trimEnd())
  else if (level === 'warn') console.warn(text.trimEnd())
  else console.log(text.trimEnd())

  if (!app.isReady()) return
  try {
    mkdirSync(logDir(), { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    appendFileSync(join(logDir(), `pos-${date}.log`), text, 'utf-8')
  } catch {
    // logging must never crash the app
  }
}
