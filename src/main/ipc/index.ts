import { ipcMain } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import type { AppConfig, Result } from '../../shared/types'
import { loadConfig, updateConfig } from '../config'
import { log } from '../logger'

function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

function fail(code: string, message: string): Result<never> {
  return { ok: false, error: { code, message } }
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.configGet, () => ok<AppConfig>(loadConfig()))

  ipcMain.handle(IpcChannels.configUpdate, (_event, patch: Partial<AppConfig>) => {
    try {
      return ok<AppConfig>(updateConfig(patch))
    } catch (error) {
      log('warn', 'Pembaruan konfigurasi ditolak', {
        reason: error instanceof Error ? error.message : String(error)
      })
      return fail('CONFIG_INVALID', 'Konfigurasi tidak valid. Periksa kembali isian.')
    }
  })
}
