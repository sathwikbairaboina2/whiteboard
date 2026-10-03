import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  grepInvert: /@demo/,
  use: { baseURL: 'http://localhost:5412', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm exec vite build && pnpm exec vite preview --port 5412 --strictPort', url: 'http://localhost:5412', timeout: 180_000, reuseExistingServer: false },
    { command: 'node server/signaling.ts', env: { PORT: '5415' }, port: 5415, reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
