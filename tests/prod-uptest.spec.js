import { test, expect } from "@playwright/test";
import { getProdDomain } from "./helpers.js";

test("Verify Arbeidsplassen PROD homepage loads", async ({ page }) => {
  await page.goto(getProdDomain());

  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
});

test("/stillinger is working in PROD and count is above 0", async ({
  page,
}) => {
  await page.goto(getProdDomain() + "/stillinger");

  const h2 = page.locator("h2", { hasText: "tref" }).first();
  await expect(h2).toBeVisible();

  const text = await h2.innerText();

  // Extract number from text
  const match = text.match(/[\d\s]+/);
  const number = parseInt(match?.[0].replace(/\s/g, "") || "0", 10);

  expect(number).toBeGreaterThan(0);
});
