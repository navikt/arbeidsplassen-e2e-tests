import { test, expect } from "@playwright/test";
import { getProdDomain } from "./helpers.js";

test("Verify Arbeidsplassen PROD homepage loads", async ({ page }) => {
  test.setTimeout(2 * 60 * 1000); // 1 minute timeout for this test
  const maxAttempts = 5;
  const minDelay = 2000;
  const maxDelay = 5000;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(getProdDomain());
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay =
          Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all attempts failed
  throw lastError;
});

test("/stillinger is working in PROD and count is above 0", async ({
  page,
}) => {
  test.setTimeout(2 * 60 * 1000); // 1 minute timeout for this test
  const maxAttempts = 5;
  const minDelay = 2000;
  const maxDelay = 5000;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(getProdDomain() + "/stillinger");

      const h2 = page.locator("h2", { hasText: "treff" }).first();
      await expect(h2).toHaveText(/[\d\s]+.*treff/i, { timeout: 10000 });

      const text = await h2.innerText();

      const match = text.match(/[\d\s]+/);
      const number = parseInt(match?.[0].replace(/\s/g, "") || "0", 10);

      expect(number).toBeGreaterThan(0);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay =
          Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all attempts failed
  throw lastError;
});
