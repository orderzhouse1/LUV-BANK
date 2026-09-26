import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const root = process.cwd();
const envFile = path.resolve(root, ".env");
const webUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: webUrl,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @luv-bank/api exec tsx --env-file="${envFile}" src/server.ts`,
      url: `${apiUrl}/api/v1/health/ready`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        // Local E2E must not inherit a shell NODE_ENV=production that rejects HTTP origins.
        NODE_ENV: "development",
        ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE: "false",
      },
    },
    {
      command: "pnpm --filter @luv-bank/web exec next start --port 3000",
      url: webUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    },
  ],
});
