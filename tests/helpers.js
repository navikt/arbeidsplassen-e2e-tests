import { expect } from "@playwright/test";

const DEV_DOMAIN = "https://arbeidsplassen.intern.dev.nav.no";
const PROD_DOMAIN = "https://arbeidsplassen.nav.no";
const LOCAL_DOMAIN = "http://localhost:3000";

export const getLoggedInPage = async (page) => {
  await page.goto("https://arbeidsplassen.intern.dev.nav.no", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle");

  const login = page.locator("button", { hasText: "Logg inn" }).first();
  await login.click();

  expect(page.url()).toMatch(
    `https://login.test.idporten.no/authorize/selector`
  );
  await page.waitForLoadState("networkidle");

  const loginIdPorten = page.locator("a", { hasText: "TestID" }).first();
  await loginIdPorten.click();

  expect(
    page.url().startsWith("https://testid.test.idporten.no/authorize")
  ).toBe(true);
  await page.waitForLoadState("networkidle");

  await page.fill("input[id=pid]", "07499738492");

  await page.click("button[type=submit]");

  expect(page.url()).toMatch(`https://arbeidsplassen.intern.dev.nav.no/`);

  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle(
    "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
  );

  await expect(
    page.locator("a", { hasText: "Min side" }).first()
  ).toBeVisible();

  return page;
};

export const getDevDomain = () => {
  if (process.env.LOCALHOST === "true") {
    return LOCAL_DOMAIN;
  }
  return DEV_DOMAIN;
};

export const getProdDomain = () => {
  if (process.env.LOCALHOST === "true") {
    return LOCAL_DOMAIN;
  }
  return PROD_DOMAIN;
};

export const getLocalDomain = () => {
  return LOCAL_DOMAIN;
};
