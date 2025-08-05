import { test, expect } from "@playwright/test";
import sendSlackMessage from "../src/sendSlackMessage";

test.setTimeout(10000); // 10 seconds timeout

// Track test failures
const failedTests = [];

test.afterEach(async ({}, testInfo) => {
  if (testInfo.status === "failed") {
    failedTests.push({
      title: testInfo.title,
      error: testInfo.error?.message || "Test failed",
    });
  }
});

test.afterAll(async () => {
  if (failedTests.length > 0) {
    const message = `❌ Arbeidsplassen E2E tests failed.`;

    const details = failedTests
      .map((test, index) => `${index + 1}. *${test.title}*\n   ${test.error}`)
      .join("\n\n");

    await sendSlackMessage(`${message}\n\n${details}`);
  }
});

test("Verify Google loads", async ({ page }) => {
  await page.goto("https://google.com/");

  await expect(page).toHaveTitle("Google");
});

// test("Test jsonplaceholder", async ({ page }) => {
//   // try {
//   //   const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
//   //   if (!response.ok) {
//   //     throw new Error(`Response status: ${response.status}`);
//   //   }
//   //
//   //   const result = await response.json();
//   //   console.log(result);
//   // } catch (error) {
//   //   console.error(error.message);
//   // }
//
//     await page.goto("https://jsonplaceholder.typicode.com/todos/1/");
//
// });
//
//
// test("Verify Arbeidsplassen PROD homepage loads", async ({ page }) => {
//   await page.goto("https://arbeidsplassen.nav.no/");
//
//   await expect(page).toHaveTitle(
//     "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
//   );
//
//   await page.screenshot({ path: "screenshots/homepage.png" });
// });
//
// test("Verify Arbeidsplassen DEV homepage loads", async ({ page }) => {
//   await page.goto("https://arbeidsplassen.intern.dev.nav.no/");
//
//   await expect(page).toHaveTitle(
//     "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
//   );
//
//   await page.screenshot({ path: "screenshots/homepage-dev.png" }); // Changed filename to avoid overwrite
// });
