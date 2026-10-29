import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __BOXLEAD_RELEASE__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'admin/src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'admin/src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'admin/src/**/*.test.{ts,tsx}', 'src/test/**', 'src/landing/**', 'src/pages/Legal/**'],
    },
  },
})
