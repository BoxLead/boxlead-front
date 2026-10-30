import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { ADMIN_APP_PORT, ADMIN_MOCK_PORT, adminMockPortOf, APP_PORT, E2E_WORKERS, MOCK_API_PORT, mockApiPortOf } from './e2e/ports.ts'

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

const adminMockServers = Array.from({ length: E2E_WORKERS }, (_, workerIndex) => {
  const port = adminMockPortOf(workerIndex)
  return {
    command: `node e2e/admin-mock/server.ts`,
    url: `http://localhost:${port}/__health`,
    env: { MOCK_ADMIN_PORT: String(port), MOCK_APP_ORIGIN: `http://localhost:${ADMIN_APP_PORT}` },
    reuseExistingServer: !process.env.CI,
  }
})

const ADMIN_OUT_DIR = fileURLToPath(new URL('./dist-admin-e2e', import.meta.url))

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: E2E_WORKERS,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['dot'], ['blob']] : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    locale: 'es-AR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', testIgnore: 'admin/**', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', testIgnore: 'admin/**', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 }, hasTouch: true } },
    {
      name: 'admin-desktop',
      testDir: 'e2e/admin',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: `http://localhost:${ADMIN_APP_PORT}` },
    },
    {
      name: 'admin-mobile',
      testDir: 'e2e/admin',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 }, hasTouch: true, baseURL: `http://localhost:${ADMIN_APP_PORT}` },
    },
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
    ...adminMockServers,
    {
      command: `npx vite build --config vite.admin.config.ts --outDir ${ADMIN_OUT_DIR} && npx vite preview --config vite.admin.config.ts --outDir ${ADMIN_OUT_DIR} --port ${ADMIN_APP_PORT} --strictPort`,
      url: `http://localhost:${ADMIN_APP_PORT}`,
      env: { VITE_API_BASE_URL: `http://localhost:${ADMIN_MOCK_PORT}` },
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
