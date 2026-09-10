import { IpcEvents } from '@shared/ipc-events'
import type { LayoutPreferences } from '@shared/layout'
import type { IPCMainLike } from '../ipc'
import type { PreferencesService } from '../preferences.service'

/**
 * Layout preference IPC — the one write channel in v0.
 *
 * `layout:set` takes whatever the renderer sends, because the renderer is not a
 * trust boundary worth carving finely here; the service normalizes it before it
 * reaches disk.
 */
export function registerLayoutHandlers(ipc: IPCMainLike, preferences: PreferencesService): void {
  ipc.handle(IpcEvents.LAYOUT_GET, (): LayoutPreferences => preferences.layout())

  ipc.handle(IpcEvents.LAYOUT_SET, (_event, layout): LayoutPreferences =>
    preferences.setLayout(layout)
  )
}
