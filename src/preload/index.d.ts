import type { AppConfig, Result } from '../shared/types'

export interface PosApi {
  config: {
    get: () => Promise<Result<AppConfig>>
    update: (patch: Partial<AppConfig>) => Promise<Result<AppConfig>>
  }
}

declare global {
  interface Window {
    pos: PosApi
  }
}
