import { defineConfig, devices } from "@playwright/test";

/**
 * Live tests against the real Supabase project (no UI preview).
 * Default: local dev server with .env.local. Set LIVE_BASE_URL to test a deployment instead.
 */
const deployedUrl = process.env.LIVE_BASE_URL?.replace(/\/$/, "");

export default defineConfig({
  testDir: "./e2e-live",
  timeout: 60_000,
  workers: 1,
  use: { baseURL: deployedUrl ?? "http://localhost:3000", ...devices["Desktop Chrome"] },
  webServer: deployedUrl
    ? undefined
    : {
        command: "npx next dev --port 3000",
        url: "http://localhost:3000/auth/login",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
