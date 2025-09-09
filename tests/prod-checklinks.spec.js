import { test } from "@playwright/test";
import { getProdDomain, getLocalDomain, getLoggedInPage } from "./helpers";

function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function validateLink(link, page) {
  console.log("Validating link", link);
  let tries = 0;
  while (tries < 5) {
    tries += 1;
    // eslint-disable-next-line no-await-in-loop
    await randomDelay(250, 5000); // Forsinkelse mellom forsøk
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await page.request.head(link, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        },
        timeout: 20000, // 20 second timeout
      }); // equivalent to command "curl -I <link>"
      if (response) {
        console.log("R", response);
      }

      if (response?.status() === 429) {
        console.warn(
          `Rate limit hit for ${link} - try ${tries}, retrying after delay`
        );
        // eslint-disable-next-line no-await-in-loop
        await randomDelay(1000, 10000); // Vent 1 sekund og prøv igjen
      } else if (response?.status() < 400 || response?.status() === 401) {
        console.log(`VALID ${link}`);
        return null;
      } else {
        console.error(
          `invalid response status ${link} - try ${tries} : ${response?.status()}`
        );
      }
    } catch (error) {
      console.error(`error reaching ${link}, try ${tries} : ${error}`);
    }
  }
  return link;
}

test("Check links on pages", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000); // 10 minute timeout
  const baseUrl = getProdDomain();

  const visitedUrls = new Set();
  const urlsToVisit = new Set([baseUrl]);
  const linkIssues = {};
  const maxPagesToCheck = 500; // Limit to 500 pages

  await validateLink(baseUrl, page);

  const additionalPages = ["/bedrift"];
  additionalPages.forEach((pagePath) => {
    const fullUrl = new URL(pagePath, baseUrl).toString();
    urlsToVisit.add(fullUrl);
  });

  const checkLinks = async (url) => {
    if (visitedUrls.has(url) || visitedUrls.size >= maxPagesToCheck) return;

    const isSameDomain = new URL(url).hostname === new URL(baseUrl).hostname;
    if (isSameDomain && visitedUrls.size < maxPagesToCheck) {
      console.log(`Checking: ${url}`);
      await page.waitForTimeout(1500);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      visitedUrls.add(url);

      // Always validate the current URL
      const validationError = await validateLink(url, page);
      if (validationError) {
        console.error(`Broken link found on: ${page.url()} ${url}`);

        linkIssues[url] = `Broken link found on ${url} -> ${page.url()}`;
      }

      // Only collect more links if we haven't reached the limit and this is our domain
      const links = await page.$$eval(
        "a[href]",
        (anchors, base) =>
          anchors
            .map((anchor) => anchor.href)
            .filter((href) => {
              // Skip if href is empty
              if (!href) return false;

              // Skip specific paths
              const excludedPaths = [
                "/stillinger/stilling",
                "/stillingsregistrering",
                "/cv",
                "/oauth2",
                "https://login.idporten.no/",
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
        const linkUrl = new URL(link);
        // Only add to visit queue if it's the same domain
        if (linkUrl.hostname === new URL(baseUrl).hostname) {
          if (!visitedUrls.has(link) && !urlsToVisit.has(link)) {
            urlsToVisit.add(link);
          }
        } else {
          // Validate external links but don't follow them
          try {
            const error = await validateLink(link, page);
            if (error) {
              console.error(`Broken external link found on ${url}: ${link}`);
              linkIssues[
                url
              ] = `Broken external link found on ${url} -> ${link}`;
            } else {
              console.log(`VALID: ${link}`);
            }
          } catch (err) {
            console.error(`Error validating external link ${link}:`, err);
          }
        }
      }
    } else {
      // Validate external links but don't follow them
      try {
        const error = await validateLink(url, page);
        if (error) {
          console.error(`Broken external link found on ${url}: ${url}`);
          linkIssues[url] = `Broken external link found on ${url} -> ${url}`;
        } else {
          console.log(`VALID: ${url}`);
        }
      } catch (err) {
        console.error(`Error validating external link ${url}:`, err);
      }
    }
  };

  while (urlsToVisit.size > 0 && visitedUrls.size < maxPagesToCheck) {
    const [nextUrl] = urlsToVisit;
    await checkLinks(nextUrl);
    urlsToVisit.delete(nextUrl);
  }

  // Log all link issues found
  const issueCount = Object.keys(linkIssues).length;
  if (issueCount > 0) {
    const errorMessages = Object.values(linkIssues).join("\n");
    throw new Error(`Found ${issueCount} broken links:\n\n${errorMessages}`);
  }
});
