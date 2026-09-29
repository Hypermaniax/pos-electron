import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { AppConfig } from '../shared/types'
import { AppConfigSchema } from '../shared/schemas'
import { log } from './logger'

const defaults = (): AppConfig => ({
  siteServerUrl: 'http://127.0.0.1:4000',
  deviceId: randomUUID(),
  laneName: 'Loket 1',
  gateName: 'Gerbang 1',
  operationalMode: 'operator',
  sessionTimeoutSeconds: 300,
  printerName: null
})

let cached: AppConfig | null = null

// URL default lama yang tidak pernah dipakai; dimigrasi agar config.json lama mengarah ke server.
const STALE_DEFAULT_URLS = ['http://127.0.0.1:4311']

function migrateStored(stored: Partial<AppConfig>): Partial<AppConfig> {
  if (
    typeof stored.siteServerUrl === 'string' &&
    STALE_DEFAULT_URLS.includes(stored.siteServerUrl.replace(/\/+$/, ''))
  ) {
    return { ...stored, siteServerUrl: defaults().siteServerUrl }
  }
  return stored
}

function configPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

function persist(config: AppConfig): void {
  mkdirSync(dirname(configPath()), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8')
}

export function loadConfig(): AppConfig {
  if (cached) return cached
  try {
    if (existsSync(configPath())) {
      const raw = JSON.parse(readFileSync(configPath(), 'utf-8')) as Partial<AppConfig>
      cached = AppConfigSchema.parse({ ...defaults(), ...migrateStored(raw) })
    } else {
      cached = defaults()
      persist(cached)
      log('info', 'Konfigurasi awal dibuat', { deviceId: cached.deviceId })
    }
  } catch (error) {
    log('error', 'Konfigurasi gagal dibaca, memakai default', {
      reason: error instanceof Error ? error.message : String(error)
    })
    cached = defaults()
  }
  return cached
}

export function updateConfig(patch: Partial<AppConfig>): AppConfig {
  const merged = { ...loadConfig(), ...patch }
  const parsed = AppConfigSchema.parse(merged)
  persist(parsed)
  cached = parsed
  log('info', 'Konfigurasi diperbarui', {
    laneName: parsed.laneName,
    mode: parsed.operationalMode
  })
  return parsed
}
