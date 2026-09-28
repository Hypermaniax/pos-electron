import { createApp } from './app'
import { env } from './config/env'
import { logger } from './lib/logger'
import { connectPrisma, disconnectPrisma } from './db/prisma'

const FORCE_EXIT_TIMEOUT_MS = 10_000

async function main(): Promise<void> {
  await connectPrisma()
  logger.info({ port: env.PORT, mode: env.NODE_ENV }, 'Koneksi database siap')

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Site server berjalan di http://localhost:${env.PORT}`)
  })

  let shuttingDown = false
  const shutdown = (signal: string): void => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Menerima sinyal, menutup server...')

    const forceExit = setTimeout(() => {
      logger.error({ timeoutMs: FORCE_EXIT_TIMEOUT_MS }, 'Shutdown melewati batas waktu, memaksa keluar.')
      process.exit(1)
    }, FORCE_EXIT_TIMEOUT_MS)
    forceExit.unref()

    server.close(() => {
      clearTimeout(forceExit)
      void disconnectPrisma().finally(() => process.exit(0))
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled rejection')
  })
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Gagal menjalankan server')
  process.exitCode = 1
})
