import { shell } from 'electron'
import { IpcEvents } from '@shared/ipc-events'
import type { IPCMainLike } from '../ipc'

/**
 * Handing a URL to the OS browser.
 *
 * The renderer can only ever pass an http(s) URL: anything else (file:, custom
 * schemes, shell metacharacters) is rejected here rather than relying on
 * `shell.openExternal` to refuse it.
 */
export function registerShellHandlers(ipc: IPCMainLike): void {
  ipc.handle(IpcEvents.OPEN_EXTERNAL, async (_event, url): Promise<void> => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new Error('Only http(s) URLs can be opened externally')
    }
    await shell.openExternal(url)
  })
}
