import { test, expect } from "@playwright/test";
import { getProdDomain } from "./helpers.js";

test.describe("PROD uptime", () => {
  test.describe.configure({
    retries: 4,
    timeout: 60_000,
  });

  test("Verify Arbeidsplassen PROD homepage loads", async ({ page }) => {
    await page.goto(getProdDomain(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
  });

  test("/stillinger is working in PROD and count is above 0", async ({ page }) => {
    await page.goto(`${getProdDomain()}/stillinger`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const treffHeading = page.locator("h2", { hasText: /treff/i }).first();
    await expect(treffHeading).toBeVisible({ timeout: 20_000 });

    const parseTreff = (text) => {
      const normalized = text.replace(/\u00A0/g, " "); // NBSP -> space
      const match = normalized.match(/(\d[\d\s]*)/);
      if (!match) {
        return 0;
      }
      return Number(match[1].replace(/\s/g, ""));
    };

    await expect
        .poll(async () => parseTreff(await treffHeading.innerText()), { timeout: 30_000 })
        .toBeGreaterThan(0);
  });
});
