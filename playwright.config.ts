import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  // Starts (or reuses) a Typesense container on port 8109 and seeds it.
  // Not a `webServer`: Playwright SIGKILLs those, which would orphan the
  // container.
  globalSetup: './e2e/setup/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // Serves e2e/app against the built packages (`bun run build` first).
  webServer: {
    command: 'bun run e2e:app',
    reuseExistingServer: !process.env.CI,
    url: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }, */
  ],
});
