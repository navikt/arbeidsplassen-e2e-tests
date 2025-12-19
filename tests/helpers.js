import { expect } from "@playwright/test";

/** @typedef {import("@playwright/test").Page} Page */

const DEV_DOMAIN = "https://arbeidsplassen.intern.dev.nav.no";
const PROD_DOMAIN = "https://arbeidsplassen.nav.no";
const LOCAL_DOMAIN = "http://localhost:3000";

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/** @param {Page} page */
export const getLoggedInPage = async (page) => {
  const baseUrl = getDevDomain();

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  const loginButton = page.getByRole("button", { name: "Logg inn" }).first();
  await expect(loginButton).toBeVisible();

  await Promise.all([
    page.waitForURL(/https:\/\/login\.test\.idporten\.no\/authorize\/selector/),
    loginButton.click(),
  ]);

  const testIdLink = page.getByRole("link", { name: "TestID" }).first();
  await expect(testIdLink).toBeVisible();

  await Promise.all([
    page.waitForURL(/https:\/\/testid\.test\.idporten\.no\/authorize/),
    testIdLink.click(),
  ]);

  const pidInput = page.locator("input#pid");
  await expect(pidInput).toBeVisible();
  await pidInput.fill("07499738492");

  const submitButton = page.locator("button[type=submit]");
  await expect(submitButton).toBeVisible();

  await Promise.all([
    page.waitForURL(new RegExp(`^${escapeRegExp(baseUrl)}/`)),
    submitButton.click(),
  ]);

  await expect(page).toHaveTitle("Arbeidsplassen.no - Alle ledige jobber, samlet på én plass");
  await expect(page.locator("a", { hasText: "Min side" }).first()).toBeVisible();

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
