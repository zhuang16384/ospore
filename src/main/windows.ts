import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { hardenNavigation } from './windows/harden'

/**
 * Window factory.
 *
 * A module-level reference to the live window plus a `getOrCreate*` accessor so
 * callers never care whether the window is new or reused. `show: false` +
 * `ready-to-show` avoids a white flash on cold start.
 */

let mainWindow: BrowserWindow | null = null

/** Default size when no saved geometry exists. */
const DEFAULT_WIDTH = 920
const DEFAULT_HEIGHT = 720

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    show: false,
    title: 'Ospore',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  window.on('ready-to-show', () => window.show())

  window.on('closed', () => {
    mainWindow = null
  })

  // Deny all navigation/window-opens; http(s) goes to the OS browser. Without
  // this, a link would navigate the window and expose the IPC bridge.
  hardenNavigation(window)

  // HMR for renderer based on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow = window
  return window
}

export async function getOrCreateMainWindow(): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
  return createMainWindow()
}

/**
 * Live main window, or null if none. Callers that push events to the renderer
 * use this rather than holding their own reference.
 */
export function getMainWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
  return null
}
