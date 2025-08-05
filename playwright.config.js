// @ts-check
import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests", // Directory containing test files
  outputDir: "./test-results", // Directory for test artifacts
  // timeout: 30 * 1000, // Global timeout for tests
  // expect: {
  //   timeout: 5000, // Timeout for expect assertions
  // },
  fullyParallel: false, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Fail the build on CI if you accidentally left test.only in the source code
  retries: 0, // Retry on CI only
  workers: 1, // Opt out of parallel tests on CI
  // reporter: [
  //   ["html", { outputFolder: "playwright-report", open: "never" }],
  //   ["list"],
  // ],
  use: {
    // actionTimeout: 0, // No timeout for actions
    baseURL: "https://arbeidsplassen.nav.no",
    trace: "on-first-retry", // Record trace when retrying a failed test
    // screenshot: "only-on-failure", // Take screenshots only on failure
    // video: "on-first-retry", // Record video when retrying a failed test
    // launchOptions: {
    //   args: ["--no-zygote"],
    // }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],
});
