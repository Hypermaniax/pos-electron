import type { AppConfig, Result } from '../shared/types'

export interface PosApi {
  config: {
    get: () => Promise<Result<AppConfig>>
    update: (patch: Partial<AppConfig>) => Promise<Result<AppConfig>>
  }
  printer: {
    print: (content: string) => Promise<Result<{ success: boolean }>>
  }
  gate: {
    open: (gateName: string) => Promise<Result<{ status: string; message: string }>>
  }
  scanner: {
    onInput: (callback: (data: string) => void) => () => void
  }
  session: {
    lock: () => Promise<void>
  }
  app: {
    version: () => Promise<string>
  }
}

declare global {
  interface Window {
    pos: PosApi
  }
}
