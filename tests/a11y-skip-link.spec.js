import { test, expect } from "@playwright/test";
import {getDevDomain} from "./helpers.js";

test("Skip-lenken kan nås tidlig med tastatur og hopper til hovedinnhold", async ({ page }) => {
    await page.goto(getDevDomain(), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    let foundSkipLink = false;
    /**
     * TODO: når skiplink flytting øverst i body før cookies, kan dette fjernes
     * da skip-link alltid vil være første tabbable element.
     * @type {number}
     */
    const maxTabs = 4;

    for (let i = 0; i < maxTabs; i += 1) {
        await page.keyboard.press("Tab");

        const activeInfo = await page.evaluate(() => {
            const activeElement = document.activeElement;
            if (!activeElement) {
                return {
                    text: "",
                    className: "",
                    href: "",
                };
            }

            return {
                text: (activeElement.textContent || "").toLowerCase(),
                className: activeElement.className || "",
                href: activeElement.getAttribute("href") || "",
            };
        });

        const isSkipLink =
            activeInfo.text.includes("hopp til innhold") ||
            activeInfo.href === "#main-content";

        if (isSkipLink) {
            foundSkipLink = true;
            break;
        }
    }

    expect(
        foundSkipLink,
        `Skip-lenken skal kunne nås med Tab innen ${maxTabs} tastetrykk (selv om cookiebanner får fokus først)`,
    ).toBe(true);

    const mainExists = await page.evaluate(() => {
        const main = document.querySelector("main#main-content");
        return main != null;
    });

    expect(mainExists, '<main id="main-content"> skal finnes på siden.').toBe(
        true,
    );

    // 3) Aktiver skip-link og sjekk at neste Tab havner inne i main
    await page.keyboard.press("Enter");

    // Nå simulerer vi det du gjør manuelt: én Tab etter hoppet
    await page.keyboard.press("Tab");

    const isInsideMainAfterTab = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!activeElement) {
            return false;
        }
        const closestMain = activeElement.closest("main#main-content");
        return closestMain != null;
    });

    expect(
        isInsideMainAfterTab,
        "Etter å ha brukt skip-link og deretter Tab én gang til, skal fokus være på et element inne i <main id=\"main-content\">.",
    ).toBe(true);
});
