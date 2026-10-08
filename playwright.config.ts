import { defineConfig, devices } from "@playwright/test";

/**
 * Not executed in the environment these tests were written in — no network access to
 * `npx playwright install` browser binaries, and no installed node_modules to boot the app
 * itself. Written to the real routes/markup/API contract and reviewed carefully, but
 * `pnpm exec playwright test` against a running `pnpm dev` (or `pnpm build && pnpm start`)
 * is the real verification step before trusting these.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Runs the real dev stack (API + Vite) so tests exercise real enquiry submission,
    // not a mock. Requires `pnpm install` to have run first.
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
