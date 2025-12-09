import { test, expect } from "@playwright/test";
import { getDevDomain } from "./helpers";

// TODO: Kopiere disse testene for andre nøkkelsider (søk, stillingsdetalj)
test.describe("Reflow og tekst-avstand på forsiden", () => {
    test("Ingen horisontal scroll på 320px bredde", async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto(getDevDomain(), { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");

        const scrollWidth = await page.evaluate(() => {
            return document.documentElement.scrollWidth;
        });

        expect(
            scrollWidth,
            `Forventet ingen horisontal scroll, men scrollWidth=${scrollWidth}`,
        ).toBeLessThanOrEqual(320);
    });

    test("Siden fungerer med økt tekst-avstand", async ({ page }) => {
        await page.goto(getDevDomain(), { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");

        // Simuler brukerens egne stilark med økt tekst-avstand (WCAG 1.4.12-verdier)
        await page.addStyleTag({
            content: `
        body {
          line-height: 1.5 !important;
        }
        p, a, li, span, button, input, label {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
      `,
        });

        // Minimum-sjekk: hovedoverskrift er fortsatt synlig
        const h1 = page.locator("h1").first();
        await expect(h1, "H1 skal fortsatt være synlig ved økt tekst-avstand").toBeVisible();
    });
});
