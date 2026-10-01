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

  ipcMain.handle(IpcChannels.printerPrint, (_event, content: string) => {
    log('info', 'Mencetak struk', { length: content.length })
    return ok({ success: true })
  })

  ipcMain.handle(IpcChannels.gateOpen, (_event, gateName: string) => {
    log('info', 'Perintah buka palang', { gateName })
    return ok({ status: 'SUCCESS', message: `Palang ${gateName} dibuka.` })
  })

  ipcMain.handle(IpcChannels.sessionLock, () => {
    log('info', 'Sesi dikunci oleh sistem')
    return undefined
  })

  ipcMain.handle(IpcChannels.appVersion, () => {
    return '0.1.0'
  })
}
