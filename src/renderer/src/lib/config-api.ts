import type { AppConfig, Result } from '@shared/types'

const STORAGE_KEY = 'pos.demo.config'

function defaultConfig(): AppConfig {
  return {
    siteServerUrl: 'http://127.0.0.1:4311',
    deviceId: 'demo-device-0001',
    laneName: 'Loket 1',
    gateName: 'Gerbang 1',
    operationalMode: 'operator',
    sessionTimeoutSeconds: 300,
    printerName: null
  }
}

let cached: AppConfig | null = null

function browserConfig(): AppConfig {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cached = raw
      ? { ...defaultConfig(), ...(JSON.parse(raw) as Partial<AppConfig>) }
      : defaultConfig()
  } catch {
    cached = defaultConfig()
  }
  return cached
}

export const configApi = {
  get: (): Promise<Result<AppConfig>> => {
    if (window.pos) return window.pos.config.get()
    return Promise.resolve({ ok: true, data: browserConfig() })
  },
  update: (patch: Partial<AppConfig>): Promise<Result<AppConfig>> => {
    if (window.pos) return window.pos.config.update(patch)
    cached = { ...browserConfig(), ...patch }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
    } catch {
      // penyimpanan browser tidak tersedia; konfigurasi tetap di memori
    }
    return Promise.resolve({ ok: true, data: cached })
  }
}
