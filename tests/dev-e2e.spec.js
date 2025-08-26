import { test, expect } from "@playwright/test";
import { getDevDomain, getLocalDomain, getLoggedInPage } from "./helpers";
import AxeBuilder from "@axe-core/playwright";

test("Verify Arbeidsplassen DEV homepage loads", async ({ page }) => {
  await page.goto(getDevDomain());

  try {
    const h1 = page.locator("h1").first();
    await expect(h1, "Page load failed").toBeVisible();
  } catch (e) {
    throw new Error(`${e.message.split("\n")[0]}`);
  }
});

test("Check accessibility on pages", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000); // 10 minute timeout
  await getLoggedInPage(page);
  const baseUrl = getDevDomain();
  const visitedUrls = new Set();
  const urlsToVisit = new Set([baseUrl]);
  const accessibilityIssues = {};
  const maxPagesToCheck = 500; // Limit to 500 pages

  const additionalPages = ["/bedrift", "/min-side"];
  additionalPages.forEach((pagePath) => {
    const fullUrl = new URL(pagePath, baseUrl).toString();
    urlsToVisit.add(fullUrl);
  });

  const checkAccessibility = async (url) => {
    if (visitedUrls.has(url) || visitedUrls.size >= maxPagesToCheck) return;

    console.log(`Checking: ${url}`);
    await page.waitForTimeout(500);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    visitedUrls.add(url);

    // Check for h1 with retries
    let h1Found = false;

    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        const h1 = page.locator("h1").first();
        await expect(h1).toBeVisible({ timeout: 10000 });
        h1Found = true;
        break;
      } catch (e) {
        console.error(`No h1 found on attempt ${attempt} for ${url}`);
        if (attempt < 2) {
          console.log("Waiting 10s and retrying...");
          await page.waitForTimeout(10000);
          await page.reload({ waitUntil: "domcontentloaded" });
        }
      }
    }

    if (!h1Found) {
      console.error("No h1 found");
    }

    // Check accessibility
    //TODO: Verify that color contrast check works.
    try {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .exclude(".arb-skip-link")
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        accessibilityIssues[url] = accessibilityScanResults.violations;
      }
    } catch (e) {
      console.error(`Accessibility check failed for ${url}:`, e);
    }

    // Only collect more links if we haven't reached the limit
    if (visitedUrls.size < maxPagesToCheck) {
      const links = await page.$$eval(
        "a[href]",
        (anchors, base) =>
          anchors
            .map((anchor) => anchor.href)
            .filter((href) => {
              // Skip if href is empty
              if (!href) return false;

              // Skip external domains
              if (!href.startsWith(base)) return false;

              // Skip specific paths
              const excludedPaths = [
                "/stillinger/stilling",
                "/stillingsregistrering",
                "/cv",
                "/oauth2",
              ];

              if (excludedPaths.some((path) => href.includes(path))) {
                return false;
              }

              // Skip anchors, mailto, and tel links
              if (
                href.includes("#") ||
                href.includes("mailto:") ||
                href.includes("tel:")
              ) {
                return false;
              }

              return true;
            }),
        baseUrl
      );

      for (const link of links) {
        if (visitedUrls.size >= maxPagesToCheck) break;
        if (!visitedUrls.has(link) && !urlsToVisit.has(link)) {
          urlsToVisit.add(link);
        }
      }
    }
  };

  while (urlsToVisit.size > 0 && visitedUrls.size < maxPagesToCheck) {
    const [nextUrl] = urlsToVisit;
    await checkAccessibility(nextUrl);
    urlsToVisit.delete(nextUrl);
  }

  // Log all accessibility issues found
  const issueCount = Object.keys(accessibilityIssues).length;
  if (issueCount > 0) {
    const errorDetails = Object.entries(accessibilityIssues)
      .map(
        ([url, issues]) =>
          `URL: ${url}\n` +
          issues
            .map((issue) => `- ${issue.description} (${issue.helpUrl})`)
            .join("\n")
      )
      .join("\n\n");

    throw new Error(
      `Found ${issueCount} accessibility issues:\n\n${errorDetails}`
    );
  }
});

test("Favorites are working in DEV", async ({ page }) => {
  const loggedInPage = await getLoggedInPage(page);

  await loggedInPage.goto(getDevDomain() + "/stillinger", {
    waitUntil: "domcontentloaded",
  });
  await expect(loggedInPage.locator("article").first()).toBeVisible({
    timeout: 10000,
  });
  await loggedInPage.waitForLoadState("networkidle");

  const firstJobAd = loggedInPage.locator("article").first();
  await expect(firstJobAd).toBeVisible({ timeout: 10000 });

  const firstJobAdHeading = await firstJobAd.locator("h2").textContent();

  const firstJobAdFavoritesButton = firstJobAd.locator("button");
  await expect(firstJobAdFavoritesButton).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const currentAriaLabel = await firstJobAdFavoritesButton.getAttribute(
    "aria-label"
  );

  // If it already is favorited, remove it before adding again
  if (currentAriaLabel === "Lagret") {
    await firstJobAdFavoritesButton.click();
    await page.waitForTimeout(2000);
    await expect(firstJobAdFavoritesButton).toHaveAttribute(
      "aria-label",
      "Lagre",
      { timeout: 5000 }
    );
  }

  await firstJobAdFavoritesButton.click();
  await page.waitForTimeout(2000);

  await expect(firstJobAdFavoritesButton).toHaveAttribute(
    "aria-label",
    "Lagret",
    { timeout: 5000 }
  );

  //Check that the favorite exists on the favorites page
  await page.goto(getDevDomain() + "/stillinger/favoritter");

  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible({ timeout: 10000 });

  const matchingFavorite = page.locator("article", {
    has: page.locator(`a`, { hasText: firstJobAdHeading?.trim() || "" }),
  });

  await expect(matchingFavorite).toBeVisible({ timeout: 10000 });
});
