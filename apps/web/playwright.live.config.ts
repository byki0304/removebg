import { defineConfig, devices } from "@playwright/test";

/** Live tests against the real Supabase project in .env.local (no UI preview). */
export default defineConfig({
  testDir: "./e2e-live",
  timeout: 60_000,
  workers: 1,
  use: { baseURL: "http://localhost:3000", ...devices["Desktop Chrome"] },
  webServer: {
    command: "npx next dev --port 3000",
    url: "http://localhost:3000/auth/login",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
