import { defineConfig, devices } from '@playwright/test'
import { APP_PORT, E2E_WORKERS, MOCK_API_PORT, mockApiPortOf } from './e2e/ports.ts'

const AUTH0_DOMAIN = 'auth0.test'
const AUTH0_CLIENT_ID = 'e2e-client'

const mockApiServers = Array.from({ length: E2E_WORKERS }, (_, workerIndex) => {
  const port = mockApiPortOf(workerIndex)
  return {
    command: `node e2e/mock-api/server.ts`,
    url: `http://localhost:${port}/__health`,
    env: { MOCK_API_PORT: String(port), MOCK_APP_ORIGIN: `http://localhost:${APP_PORT}` },
    reuseExistingServer: !process.env.CI,
  }
})

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: E2E_WORKERS,
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
    ...mockApiServers,
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      env: {
        VITE_API_BASE_URL: `http://localhost:${MOCK_API_PORT}`,
        VITE_AGENT_API_BASE_URL: `http://localhost:${MOCK_API_PORT}`,
        VITE_AUTH0_DOMAIN: AUTH0_DOMAIN,
        VITE_AUTH0_CLIENT_ID: AUTH0_CLIENT_ID,
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
