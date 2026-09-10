import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { getOrCreateMainWindow } from './windows'
import { ipcManager, setupIPC } from './ipc'
import { createConfigStore } from './config/config.store'
import { createWorkspaceService } from './workspace.service'
import { resolveDataDir } from './paths'

/**
 * Main-process entry.
 *
 * `onReady` is a short assembly script: each subsystem is one line, and the
 * subsystems themselves know nothing about each other (the workspace service
 * receives the config store, IPC receives the workspace service).
 */

// On Linux, keep the session's native Ozone backend (Wayland or X11), but
// quiet two Chromium behaviors that misbehave on current Wayland compositors:
// - WebGPU-on-Vulkan-via-GL-interop (Chromium >= ~146): forces a native Vulkan
//   device in the GPU process on Wayland, printing the misleading
//   "'--ozone-platform=wayland' is not compatible with Vulkan" ERROR at every
//   startup (wayland_surface_factory.cc:252) even though rendering is fine
//   (electron/electron#50462: cosmetic; gpu_compositing/webgl stay "enabled").
//   `--use-webgpu-adapter=opengles` opts out of that path; note that
//   `--disable-features=Vulkan` does NOT silence it (verified empirically on
//   Electron 42 / KDE Wayland / Intel i915).
// - WaylandWpColorManagerV1: the wp_color_management_v1 protocol support
//   spews non-fatal color-space errors on KDE Plasma 6 (upstream ships this
//   flag as the kill switch for exactly that).
// Forcing --ozone-platform=x11 instead segfaults the GPU process (exit 139)
// under XWayland on the dev box, so this is the quiet AND stable combination.
// Switches must be set before app ready — hence top-of-module.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('use-webgpu-adapter', 'opengles')
  app.commandLine.appendSwitch('disable-features', 'WaylandWpColorManagerV1')
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

  const config = createConfigStore(resolveDataDir())
  const workspace = createWorkspaceService(config)
  setupIPC(ipcManager, workspace)

  await getOrCreateMainWindow()
}

app.whenReady().then(onReady)
