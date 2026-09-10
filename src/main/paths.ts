/**
 * Data-directory resolution.
 *
 * `OSPORE_DATA_DIR` is set explicitly by dev (`$PWD/.test-data`), by the deploy
 * launcher (`<runtime>/data`) and by the E2E fixture (a temp dir), so all three
 * stay isolated and predictable. Falls back to Electron's `userData`.
 */

import { app } from 'electron'

export function resolveDataDir(): string {
  const override = process.env['OSPORE_DATA_DIR']
  if (override && override.trim() !== '') return override
  return app.getPath('userData')
}
