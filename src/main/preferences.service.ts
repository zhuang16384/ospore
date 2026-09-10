import { normalizeLayout, type LayoutPreferences } from '@shared/layout'
import type { ConfigStore } from './config/config.store'

/**
 * Persisted UI preferences.
 *
 * The only *write* path in v0 — every other channel reads. It is still not a
 * domain mutation: the workspace and the filesystem are untouched, and the only
 * thing that changes is how the window is laid out.
 *
 * The value arrives from the renderer, so it is normalized rather than trusted.
 * `config.json` is hand-editable too, and the same normalization catches that on
 * the way back in.
 */
export interface PreferencesService {
  layout(): LayoutPreferences
  setLayout(next: unknown): LayoutPreferences
}

export function createPreferencesService(config: ConfigStore): PreferencesService {
  return {
    layout: () => config.read().layout,
    setLayout: (next) => config.setLayout(normalizeLayout(next)).layout
  }
}
