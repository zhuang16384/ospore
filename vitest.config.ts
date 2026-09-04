import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
    // renderer tests opt into jsdom via per-file `@vitest-environment jsdom`;
    // main/preload tests use the default `node` environment.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/renderer/src/test-setup.ts'],
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
})
