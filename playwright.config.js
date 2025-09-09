// @ts-check
import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests", // Directory containing test files
  outputDir: "./test-results", // Directory for test artifacts
  globalTeardown: path.join(__dirname, "src/global-teardown.js"),
  timeout: 30 * 1000, // Global timeout for tests
  expect: {
    timeout: 10000, // Timeout for expect assertions
  },
  fullyParallel: false, // Don`t run tests in parallel
  forbidOnly: !!process.env.CI, // Fail the build on CI if you accidentally left test.only in the source code
  retries: process.env.CI ? 1 : 0, // Retry on CI only
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
    ["./src/custom-reporter.js"],
  ],
  use: {
    actionTimeout: 0, // No timeout for actions
    baseURL: "https://arbeidsplassen.nav.no",
    trace: "on-first-retry", // Record trace when retrying a failed test
    screenshot: "only-on-failure", // Take screenshots only on failure
    video: "on-first-retry", // Record video when retrying a failed test
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
