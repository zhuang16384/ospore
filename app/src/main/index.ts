import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { getOrCreateMainWindow } from './windows'
import { setupIPC } from './ipc'

/**
 * Main-process entry.
 *
 * `main()` only wires lifecycle hooks; real assembly happens in `onReady`,
 * where each subsystem is a one-line `setupXxx()` call. Window creation is
 * delegated to `getOrCreateMainWindow()` so this file owns no BrowserWindow
 * logic.
 */

// On Linux, keep the session's native Ozone backend (Wayland or X11), but
// disable two Chromium features that misbehave on current Wayland compositors:
// - Vulkan: unsupported by Chromium's Wayland backend (startup ERROR log);
// - WaylandWpColorManagerV1: the wp_color_management_v1 protocol support
//   spews non-fatal color-space errors on KDE Plasma 6 (upstream ships this
//   flag as the kill switch for exactly that).
// Forcing --ozone-platform=x11 instead segfaults the GPU process (exit 139)
// under XWayland on the dev box, so disabled-features is the quiet AND
// stable combination. Switches must be set before app ready — hence
// top-of-module.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-features', 'Vulkan,WaylandWpColorManagerV1')
}

// Default open or close DevTools by F12 in development and ignore
// CommandOrControl + R in production.
app.on('browser-window-created', (_, window) => {
  optimizer.watchWindowShortcuts(window)
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Main-process safety net: never white-screen / silent-crash.
process.on('uncaughtException', (error) => {
  console.error('[Ospore Main] Uncaught exception:', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Ospore Main] Unhandled rejection:', reason)
})

// On macOS it's common to re-create a window when the dock icon is clicked.
app.on('activate', () => {
  app.whenReady().then(() => getOrCreateMainWindow())
})

async function onReady(): Promise<void> {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.ospore.app')

  // Each setupXxx() registers its own IPC handlers + initializes its own state.
  setupIPC()

  await getOrCreateMainWindow()
}

app.whenReady().then(onReady)
