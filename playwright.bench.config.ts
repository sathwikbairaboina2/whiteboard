import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'bench',
  testMatch: 'browser.spec.ts',
  timeout: 180_000,
  workers: 1,
  use: { baseURL: 'http://localhost:5412' },
  webServer: [
    { command: 'pnpm exec vite build && pnpm exec vite preview --port 5412 --strictPort', url: 'http://localhost:5412', timeout: 180_000, reuseExistingServer: false },
    { command: 'node server/signaling.ts', env: { PORT: '5415' }, port: 5415, reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
