import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /*
   * Browser-mode tests render through Vite's dependency optimizer. If `react`
   * and `react-dom` are optimised separately they end up as two module
   * instances, the hooks dispatcher is null, and every render dies with
   * "Cannot read properties of null (reading 'useEffect')". Listing them
   * together keeps one copy.
   */
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime']
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@preload': resolve('src/preload'),
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  test: {
    globals: true,
    setupFiles: ['src/renderer/src/test-setup.ts'],
    /*
     * Two lanes, split by file name so both run under a plain `pnpm test`:
     *
     * - `unit` is node with per-file `@vitest-environment jsdom` opt-in.
     * - `browser` runs the same components in real Chromium. jsdom applies no
     *   stylesheet at all, so anything about computed size, layout or colour is
     *   invisible to it — see FileTree.browser.test.tsx. This replaces an e2e
     *   assertion that needed a whole Electron launch for one font size.
     *
     * The tailwind plugin is registered here so `?inline` CSS imports in the
     * browser lane compile the real stylesheet rather than a stub.
     */
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.{ts,tsx}'],
          coverage: {
            provider: 'v8',
            include: [
              'src/main/**/*.ts',
              'src/preload/**/*.ts',
              'src/renderer/src/**',
              'src/shared/**/*.ts'
            ],
            exclude: ['src/**/__tests__/**', 'src/main/index.ts', 'src/main/windows.ts']
          }
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            // Desktop-sized, because layout tests assert measured pixels: the
            // default 414px viewport leaves no room beside a 320px document
            // minimum, so every width clamps to the sidebar minimum instead.
            viewport: { width: 1280, height: 800 },
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
})
