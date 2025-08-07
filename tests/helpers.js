import { expect } from "@playwright/test";

export const getLoggedInPage = async (page) => {
  await page.goto("https://arbeidsplassen.intern.dev.nav.no/");

  const login = page.locator("button", { hasText: "Logg inn" }).first();
  await login.click();

  expect(page.url()).toMatch(
    `https://login.test.idporten.no/authorize/selector`
  );

  const loginIdPorten = page.locator("a", { hasText: "TestID" }).first();
  await loginIdPorten.click();

  expect(
    page.url().startsWith("https://testid.test.idporten.no/authorize")
  ).toBe(true);

  await page.fill("input[id=pid]", "07499738492");

  await page.click("button[type=submit]");

  expect(page.url()).toMatch(`https://arbeidsplassen.intern.dev.nav.no/`);

  await expect(page).toHaveTitle(
    "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
  );

  await expect(
    page.locator("a", { hasText: "Min side" }).first()
  ).toBeVisible();

  return page;
};
