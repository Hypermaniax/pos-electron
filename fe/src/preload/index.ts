import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc'
import type { AppConfig, Result } from '../shared/types'

const api = {
  config: {
    get: (): Promise<Result<AppConfig>> => ipcRenderer.invoke(IpcChannels.configGet),
    update: (patch: Partial<AppConfig>): Promise<Result<AppConfig>> =>
      ipcRenderer.invoke(IpcChannels.configUpdate, patch)
  },
  printer: {
    print: (content: string): Promise<Result<{ success: boolean }>> =>
      ipcRenderer.invoke(IpcChannels.printerPrint, content)
  },
  gate: {
    open: (gateName: string): Promise<Result<{ status: string; message: string }>> =>
      ipcRenderer.invoke(IpcChannels.gateOpen, gateName)
  },
  scanner: {
    onInput: (callback: (data: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: string): void => callback(data)
      ipcRenderer.on(IpcChannels.scannerInput, handler)
      return () => {
        ipcRenderer.removeListener(IpcChannels.scannerInput, handler)
      }
    }
  },
  session: {
    lock: (): Promise<void> => ipcRenderer.invoke(IpcChannels.sessionLock)
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke(IpcChannels.appVersion)
  }
}

contextBridge.exposeInMainWorld('pos', api)
