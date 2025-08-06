import { test, expect } from "@playwright/test";
import sendSlackMessage from "../src/sendSlackMessage";

test.setTimeout(30000); // 10 seconds timeout

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

test("Verify Arbeidsplassen PROD homepage loads", async ({ page }) => {
  await page.goto("https://arbeidsplassen.nav.no/");

  await expect(page).toHaveTitle(
    "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
  );

  await page.screenshot({ path: "screenshots/homepage.png" });
});

test("Verify Arbeidsplassen DEV homepage loads", async ({ page }) => {
  await page.goto("https://arbeidsplassen.intern.dev.nav.no/");

  await expect(page).toHaveTitle(
    "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
  );

  await page.screenshot({ path: "screenshots/homepage-dev.png" }); // Changed filename to avoid overwrite
});

test("/stillinger is working and count is above 0", async ({ page }) => {
  await page.goto("https://arbeidsplassen.nav.no/stillinger");

  const h2 = page.locator("h2", { hasText: "treff" }).first();
  await expect(h2).toBeVisible();

  const text = await h2.innerText();

  // Extract number from text
  const match = text.match(/[\d\s]+/);
  const number = parseInt(match?.[0].replace(/\s/g, "") || "0", 10);

  expect(number).toBeGreaterThan(0);
});
