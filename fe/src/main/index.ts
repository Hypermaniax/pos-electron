import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { loadConfig } from './config'
import { registerIpcHandlers } from './ipc'
import { log } from './logger'

let mainWindow: BrowserWindow | null = null

function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return
  mainWindow.show()
  mainWindow.focus()
}

app.disableHardwareAcceleration()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'POS Parkir',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => showWindow())
  setTimeout(() => showWindow(), 3000)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase()
      const isToggleDevTools =
        key === 'f12' ||
        (input.control && input.shift && (key === 'i' || key === 'j')) ||
        (input.meta && input.alt && key === 'i')
      if (isToggleDevTools) event.preventDefault()
    })
  }

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const config = loadConfig()
  log('info', 'Aplikasi dimulai', {
    version: app.getVersion(),
    deviceId: config.deviceId,
    mode: config.operationalMode
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
