import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sharedAlias = { '@shared': resolve('src/shared') }

// All build/test outputs live under build-output/ so editors can hide one
// directory instead of several (out/, dist/, e2e-results/, e2e-report/).
export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: { outDir: 'build-output/out/main' }
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: {
      outDir: 'build-output/out/preload',
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'build-output/out/renderer',
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html')
        }
      }
    }
  }
})
