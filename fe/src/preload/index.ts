import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc'
import type { AppConfig, Result } from '../shared/types'

const api = {
  config: {
    get: (): Promise<Result<AppConfig>> => ipcRenderer.invoke(IpcChannels.configGet),
    update: (patch: Partial<AppConfig>): Promise<Result<AppConfig>> =>
      ipcRenderer.invoke(IpcChannels.configUpdate, patch)
  }
}

contextBridge.exposeInMainWorld('pos', api)
