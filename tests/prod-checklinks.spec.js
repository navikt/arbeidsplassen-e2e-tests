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

async function validateHtmlWithW3C(page, url) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Validating HTML for: ${url} (Attempt ${attempt}/${maxRetries})`
      );

      const html = await page.content();

      const validatorUrl = "https://validator.w3.org/nu/?out=json";
      const response = await fetch(validatorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        },
        body: html,
      });

      const result = await response.json();
      let hasErrors = false;

      if (result.messages && result.messages.length > 0) {
        const errors = result.messages.filter((msg) => msg.type === "error");
        const warnings = result.messages.filter(
          (msg) => msg.type === "warning"
        );

        if (errors.length > 0) {
          console.error(
            `❌ Found ${errors.length} HTML validation errors on ${url}:`
          );
          errors.forEach((error, index) => {
            console.error(
              `  ${index + 1}. [Line ${error.lastLine || "?"}, Col ${
                error.lastColumn || "?"
              }] ${error.message}`
            );
            if (error.extract) {
              console.error(`     ${error.extract.trim()}`);
            }
          });
          hasErrors = true;
        }

        if (warnings.length > 0) {
          console.warn(
            `⚠️  Found ${warnings.length} HTML validation warnings on ${url}`
          );
          warnings.forEach((warning, index) => {
            console.warn(`  ${index + 1}. ${warning.message}`);
            if (warning.extract) {
              console.warn(`     ${warning.extract.trim()}`);
            }
          });
        }
      }

      // Return whether we found any validation errors
      return { hasErrors };
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delay = Math.floor(Math.random() * 9000) + 1000; // 1-10 seconds
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `❌ HTML validation failed after ${maxRetries} attempts for ${url}:`,
          lastError
        );
        throw lastError; // Only throw for network errors, not validation errors
      }
    }
  }
}

test("Check internal links, external links and validate HTML on internal pages.", async ({
  page,
}) => {
  test.setTimeout(30 * 60 * 1000); // 30 minute timeout
  const baseUrl = getProdDomain();

  const visitedUrls = new Set();
  const urlsToVisit = new Set([baseUrl]);
  const linkIssues = {};
  const validatedExternalLinks = new Set(); // Track validated external links
  const maxPagesToCheck = 1000; // Limit to 1000 pages

  await validateLink(baseUrl, page);

  const additionalPages = ["/bedrift"];
  additionalPages.forEach((pagePath) => {
    const fullUrl = new URL(pagePath, baseUrl).toString();
    urlsToVisit.add(fullUrl);
  });

  const checkLinks = async (url) => {
    if (visitedUrls.has(url) || visitedUrls.size >= maxPagesToCheck) return;

    const isSameDomain = new URL(url).hostname === new URL(baseUrl).hostname;
    visitedUrls.add(url);
    if (isSameDomain && visitedUrls.size < maxPagesToCheck) {
      console.log(`Checking: ${url}`);

      const maxRetries = 3;
      const minDelay = 1000; // 1 second
      const maxDelay = 10000; // 10 seconds
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Add random delay between retries (but not before first attempt)
          if (attempt > 1) {
            const delay =
              Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            console.log(`Retry attempt ${attempt} after ${delay}ms delay...`);
            await page.waitForTimeout(delay);
          }

          await page.goto(url, { waitUntil: "domcontentloaded" });
          await page.waitForLoadState("networkidle");

          // Add W3C HTML validation
          try {
            const { hasErrors } = await validateHtmlWithW3C(page, url);
            if (hasErrors) {
              if (Object.keys(linkIssues).length < 10) {
                linkIssues[url] = `HTML validation failed for ${url}`;
              } else if (Object.keys(linkIssues).length === 10) {
                linkIssues[
                  url
                ] = `HTML validation failed for ${url} \n\nFound more than pages with validation errors, only showing first 10`;
              }
            }
          } catch (error) {
            // Only throw for network errors, not validation errors
            throw error;
          }

          lastError = null;
          break; // Success - exit retry loop
        } catch (error) {
          lastError = error;
          if (attempt === maxRetries) {
            console.error(
              `Failed after ${maxRetries} attempts for ${url}:`,
              error.message
            );
          } else {
            console.log(`Attempt ${attempt} failed: ${error.message}`);
          }
        }
      }

      if (lastError) {
        throw lastError; // Re-throw the last error if all retries failed
      }

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
        // Only process if we haven't seen this URL before and it's not already queued
        if (!visitedUrls.has(link) && !urlsToVisit.has(link)) {
          // Only add to visit queue if it's the same domain
          if (linkUrl.hostname === new URL(baseUrl).hostname) {
            urlsToVisit.add(link);
          } else if (!validatedExternalLinks.has(link)) {
            // Only validate external links we haven't seen
            // Validate external links but don't follow them
            try {
              const error = await validateLink(link, page);
              validatedExternalLinks.add(link); // Mark this external link as validated
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
    throw new Error(`Found ${issueCount} errors:\n\n${errorMessages}`);
  }
});
