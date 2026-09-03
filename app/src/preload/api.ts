import { IpcEvents } from '@shared/ipc-events'

export interface IPCRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  /** Fire-and-forget send (Renderer -> Main, no reply). */
  send(channel: string, ...args: unknown[]): void
  on(channel: string, listener: (...args: unknown[]) => void): void
  removeListener(channel: string, listener: (...args: unknown[]) => void): void
}

export interface OsporeAPI {
  /** Health-check the IPC bridge; resolves 'pong' from the main process. */
  ping(): Promise<string>
}

export function createOsporeAPI(ipcRenderer: IPCRendererLike): OsporeAPI {
  return {
    ping: (): Promise<string> => ipcRenderer.invoke(IpcEvents.PING) as Promise<string>
  }
}
