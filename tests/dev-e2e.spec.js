import { test, expect } from "@playwright/test";
import sendSlackMessage from "../src/sendSlackMessage";
import { getDevDomain, getLoggedInPage } from "./helpers";

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
      .map(
        (test, index) =>
          `${index + 1}. *${test.title}*\n   ${test.error.split("\n")[0]}`
      )
      .join("\n\n");

    await sendSlackMessage(`${message}\n\n${details}`);
  }
});

test("Verify Arbeidsplassen DEV homepage loads", async ({ page }) => {
  await page.goto(getDevDomain());

  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
});

test("Favorites are working in DEV", async ({ page }) => {
  const loggedInPage = await getLoggedInPage(page);

  await loggedInPage.goto(getDevDomain() + "/stillinger");
  await expect(loggedInPage.locator("article").first()).toBeVisible({
    timeout: 10000,
  });

  const firstJobAd = loggedInPage.locator("article").first();
  await expect(firstJobAd).toBeVisible({ timeout: 10000 });

  const firstJobAdHeading = await firstJobAd.locator("h2").textContent();

  const firstJobAdFavoritesButton = firstJobAd.locator("button");
  await expect(firstJobAdFavoritesButton).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const currentAriaLabel = await firstJobAdFavoritesButton.getAttribute(
    "aria-label"
  );

  // If it already is favorited, remove it before adding again
  if (currentAriaLabel === "Lagret") {
    await firstJobAdFavoritesButton.click();
    await page.waitForTimeout(2000);
    await expect(firstJobAdFavoritesButton).toHaveAttribute(
      "aria-label",
      "Lagre",
      { timeout: 5000 }
    );
  }

  await firstJobAdFavoritesButton.click();
  await page.waitForTimeout(2000);

  await expect(firstJobAdFavoritesButton).toHaveAttribute(
    "aria-label",
    "Lagret",
    { timeout: 5000 }
  );

  //Check that the favorite exists on the favorites page
  await page.goto(getDevDomain() + "/stillinger/favoritter");

  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible({ timeout: 10000 });

  const matchingFavorite = page.locator("article", {
    has: page.locator(`a`, { hasText: firstJobAdHeading?.trim() || "" }),
  });

  await expect(matchingFavorite).toBeVisible({ timeout: 10000 });
});
