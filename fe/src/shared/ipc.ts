export const IpcChannels = {
  configGet: 'config:get',
  configUpdate: 'config:update'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
