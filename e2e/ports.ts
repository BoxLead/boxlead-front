export const APP_PORT = 5174;
export const MOCK_API_PORT = 8090;
export const E2E_WORKERS = process.env.CI ? 2 : 4;

export const MOCK_API_ORIGIN = `http://localhost:${MOCK_API_PORT}`;

export function mockApiPortOf(workerIndex: number): number {
  return MOCK_API_PORT + workerIndex;
}
