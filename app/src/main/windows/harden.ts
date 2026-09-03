import { shell } from 'electron'
import type { BrowserWindow } from 'electron'

/**
 * Lock a window's navigation down.
 *
 * Every Ospore renderer is a local SPA: after the initial load it must never
 * navigate anywhere. A successful navigation would hand the preload bridge —
 * and with it the whole IPC surface — to a remote page. So `will-navigate` is
 * denied, http(s) targets (e.g. a link the user clicked) open in the OS
 * browser instead, and anything else is dropped. Reload of the current page
 * and dev-server (HMR) URLs stay allowed.
 */
export function hardenNavigation(window: BrowserWindow): void {
  const { webContents } = window

  webContents.on('will-navigate', (event, url) => {
    if (isInternalNavigation(url, webContents.getURL())) return
    event.preventDefault()
    if (isHttpUrl(url)) void shell.openExternal(url)
  })

  // window.open / target=_blank: never create a child window; http(s) goes to
  // the OS browser, file:/custom protocols are dropped entirely.
  webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/** Reloading the current page and dev-server (HMR) navigations are internal. */
function isInternalNavigation(url: string, currentUrl: string): boolean {
  if (url === currentUrl) return true
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  return Boolean(devUrl && url.startsWith(devUrl))
}
