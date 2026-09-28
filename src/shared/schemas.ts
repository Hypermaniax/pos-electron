import { z } from 'zod'

export const AppConfigSchema = z.object({
  siteServerUrl: z.url(),
  deviceId: z.string().min(1),
  laneName: z.string().min(1),
  gateName: z.string().min(1),
  operationalMode: z.enum(['operator', 'manless']),
  sessionTimeoutSeconds: z.number().int().min(60).max(86400),
  printerName: z.string().nullable()
})

export const AppConfigPatchSchema = AppConfigSchema.partial()
