export const APP_PORT = 5174;
export const MOCK_API_PORT = 8090;
export const E2E_WORKERS = process.env.CI ? 2 : 4;

export const MOCK_API_ORIGIN = `http://localhost:${MOCK_API_PORT}`;

export function mockApiPortOf(workerIndex: number): number {
  return MOCK_API_PORT + workerIndex;
}

export const ADMIN_APP_PORT = 5184;
export const ADMIN_MOCK_PORT = 8100;
export const ADMIN_MOCK_ORIGIN = `http://localhost:${ADMIN_MOCK_PORT}`;

export function adminMockPortOf(workerIndex: number): number {
  return ADMIN_MOCK_PORT + workerIndex;
}
