import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./e2e",
  outputDir: process.env.MIREN_TEST_OUTPUT ?? join(tmpdir(), "miren-e2e-results"),
  fullyParallel: false,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3147", timezoneId: "Asia/Jerusalem", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } } },
    { name: "chromium-narrow", use: { browserName: "chromium", viewport: { width: 320, height: 740 }, launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } } },
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 }, launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run start -- --port 3147 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3147",
    reuseExistingServer: !process.env.CI,
    env: { YOUCAM_API_KEY: "", YOUCAM_PUBLIC_KEY: "", MIREN_FORCE_MOCK: "1" },
    timeout: 60_000,
  },
});
