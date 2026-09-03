import type { OsporeAPI } from './api'

declare global {
  interface Window {
    ospore: OsporeAPI
  }
}
