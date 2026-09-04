import { contextBridge, ipcRenderer } from 'electron'
import { createOsporeAPI } from './api'

const ospore = createOsporeAPI(ipcRenderer)

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('ospore', ospore)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.ospore = ospore
}
