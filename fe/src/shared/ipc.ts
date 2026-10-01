export const IpcChannels = {
  configGet: 'config:get',
  configUpdate: 'config:update',
  printerPrint: 'printer:print',
  gateOpen: 'gate:open',
  scannerInput: 'scanner:input',
  sessionLock: 'session:lock',
  appVersion: 'app:version'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
