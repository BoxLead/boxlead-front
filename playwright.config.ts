import { defineConfig, devices } from '@playwright/test'

const MOCK_API_PORT = 8090
const APP_PORT = 5174

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 }, hasTouch: true } },
  ],
  webServer: [
    {
      command: `node e2e/mock-api/server.ts`,
      url: `http://localhost:${MOCK_API_PORT}/__health`,
      env: { MOCK_API_PORT: String(MOCK_API_PORT), MOCK_APP_ORIGIN: `http://localhost:${APP_PORT}` },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      env: { VITE_API_BASE_URL: `http://localhost:${MOCK_API_PORT}` },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
