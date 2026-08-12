import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Assumes the API (:4000, SQLite) is already running and seeded
 * (see README). Playwright boots the Nuxt dev server itself on PORT (default
 * 3100 to avoid clashing with a dev server on 3000).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `nuxt dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
