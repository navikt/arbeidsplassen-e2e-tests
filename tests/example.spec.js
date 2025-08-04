import { test, expect } from "@playwright/test";

test.setTimeout(10000); // 10 seconds timeout

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
