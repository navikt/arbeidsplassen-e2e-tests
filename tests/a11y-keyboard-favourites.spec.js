import { test, expect } from "@playwright/test";
import { getDevDomain, getLoggedInPage } from "./helpers";

// TODO: lage flere slike funksjonstester
test("Bruker kan lagre en favoritt kun med tastatur", async ({ page }) => {
    const loggedInPage = await getLoggedInPage(page);

    await loggedInPage.goto(getDevDomain() + "/stillinger", {
        waitUntil: "domcontentloaded",
    });
    await loggedInPage.waitForLoadState("networkidle");

    const firstJobAd = loggedInPage.locator("article").first();
    await expect(firstJobAd).toBeVisible({ timeout: 10000 });

    const favouritesButton = firstJobAd
        .locator('button[aria-label="Lagre"], button[aria-label="Lagret"]')
        .first();

    await expect(favouritesButton).toBeVisible({ timeout: 10000 });

    // Sett fokus programmatisk, deretter bruk tastaturet
    await favouritesButton.focus();

    const labelBefore = await favouritesButton.getAttribute("aria-label");

    // Space bør utløse knappen (tastaturbruk)
    await loggedInPage.keyboard.press("Space");
    await loggedInPage.waitForTimeout(500);

    const labelAfter = await favouritesButton.getAttribute("aria-label");

    expect(
        labelAfter,
        "aria-label skal endre seg når favoritt toggles med tastatur",
    ).not.toBe(labelBefore);
});
