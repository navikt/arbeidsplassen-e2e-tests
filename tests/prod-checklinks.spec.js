import { test } from "@playwright/test";
import { getProdDomain } from "./helpers";

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 20_000;
const NAVIGATION_TIMEOUT_MS = 30_000;
const HTML_VALIDATION_TIMEOUT_MS = 25_000;
const HTML_FETCH_TIMEOUT_MS = 20_000;

const HTML_VALIDATOR_URL = process.env.HTML_VALIDATOR_URL;
const HTML_VALIDATION_USER_AGENT = "Validator.nu/LV http://validator.w3.org/services";

const MAX_HTML_VALIDATIONS_PER_RUN = Number(process.env.MAX_HTML_VALIDATIONS_PER_RUN ?? "100");

const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const fetchWithTimeout = async (url, init, timeoutMs) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const isOkStatus = (status) => {
  // 2xx/3xx = OK, og 401 lar vi passere som før
  if (status < 400) {
    return true;
  }
  if (status === 401) {
    return true;
  }
  return false;
};

const fetchHtmlForValidation = async (page, url) => {
  const headers = {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": HTML_VALIDATION_USER_AGENT,
  };

  const attempts = 2;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    await sleep(randomBetween(0, 150));

    const response = await page.request.get(url, {
      headers,
      timeout: HTML_FETCH_TIMEOUT_MS,
    });

    const status = response?.status() ?? 0;

    if (status === 429) {
      const backoffMs = randomBetween(1500, 10_000);
      console.warn(`[HTML] 429 from site for ${url} (attempt ${attempt}/${attempts}), sleeping ${backoffMs}ms`);
      await sleep(backoffMs);
      continue;
    }

    // Aksepter 2xx/3xx (Playwright følger ofte redirects, men vi er litt rause)
    if (status > 0 && status < 400) {
      return await response.text();
    }

    console.warn(`[HTML] Unexpected status ${status} when fetching HTML for ${url} (attempt ${attempt}/${attempts})`);

    if (attempt < attempts) {
      await sleep(randomBetween(200, 800));
    }
  }

  return null;
};

async function validateLink(link, page) {
  // NB: denne funksjonen returnerer null når alt er OK, og "link" når den mener lenken er broken
  console.log("Validating link", link);

  const headers = {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": USER_AGENT,
  };

  const attempts = 2;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Litt jitter for å ikke slå alt på samme millisekund
    // (men ikke sekunder med delay per lenke)
    await sleep(randomBetween(0, 150));

    try {
      const headResponse = await page.request.head(link, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      });

      const headStatus = headResponse?.status() ?? 0;

      if (headStatus === 429) {
        const backoffMs = randomBetween(1500, 10_000);
        console.warn(`[HEAD] 429 rate limit for ${link} (attempt ${attempt}/${attempts}), sleeping ${backoffMs}ms`);
        await sleep(backoffMs);
        continue;
      }

      if (isOkStatus(headStatus)) {
        return null;
      }

      // Mange servere støtter ikke HEAD (405), og noen blokkerer HEAD (403) selv om GET funker.
      if (headStatus === 405 || headStatus === 403) {
        const getResponse = await page.request.get(link, {
          headers,
          timeout: REQUEST_TIMEOUT_MS,
        });

        const getStatus = getResponse?.status() ?? 0;

        if (getStatus === 429) {
          const backoffMs = randomBetween(1500, 10_000);
          console.warn(`[GET] 429 rate limit for ${link} (attempt ${attempt}/${attempts}), sleeping ${backoffMs}ms`);
          await sleep(backoffMs);
          continue;
        }

        if (isOkStatus(getStatus)) {
          return null;
        }

        // Hvis vi fortsatt får 403/405 etter GET, er dette ofte bot/WAF eller metode-restriksjon.
        // I praksis er det ofte bedre å skippe enn å feile hele testen pga eksterne domener.
        if (getStatus === 403 || getStatus === 405) {
          console.warn(`[SKIP] ${link} returned ${getStatus} even after GET fallback (likely blocked).`);
          return null;
        }

        console.error(`[GET] invalid status ${getStatus} for ${link} (attempt ${attempt}/${attempts})`);
      } else {
        console.error(`[HEAD] invalid status ${headStatus} for ${link} (attempt ${attempt}/${attempts})`);
      }
    } catch (error) {
      console.error(`Error reaching ${link} (attempt ${attempt}/${attempts}):`, error);
    }

    if (attempt < attempts) {
      await sleep(randomBetween(200, 800));
    }
  }

  return link;
}

// Teller og flagg for validatoren
let htmlValidationCount = 0;
let htmlValidatorRateLimited = false;
let htmlValidatorMissingLogged = false;

async function validateHtml(page, url) {
  if (!HTML_VALIDATOR_URL) {
    if (!htmlValidatorMissingLogged) {
      htmlValidatorMissingLogged = true;
      console.warn(
          `[HTML] HTML_VALIDATOR_URL er ikke satt. Skipper HTML-validering i denne testrunden.`,
      );
    }
    return { hasErrors: false, skipped: true };
  }

  if (htmlValidatorRateLimited) {
    console.log(
        `[HTML] Skipper HTML-validering for ${url} – validator ble rate-limitet (429) tidligere i denne testrunden.`,
    );
    return { hasErrors: false, skipped: true };
  }

  if (htmlValidationCount >= MAX_HTML_VALIDATIONS_PER_RUN) {
    console.log(
        `[HTML] Skipper HTML-validering for ${url} – har allerede validert ${htmlValidationCount} sider i denne testrunden.`,
    );
    return { hasErrors: false, skipped: true };
  }

  htmlValidationCount += 1;

  try {
    console.log(
        `[HTML] Validerer HTML for: ${url} (${htmlValidationCount}/${MAX_HTML_VALIDATIONS_PER_RUN})`,
    );

    const html = await fetchHtmlForValidation(page, url);

    if (!html) {
      console.warn(`[HTML] Klarte ikke å hente HTML for validering fra ${url}. Skipper validering for denne siden.`);
      return { hasErrors: false, skipped: true };
    }

    const response = await fetchWithTimeout(
        HTML_VALIDATOR_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
          body: html,
        },
        HTML_VALIDATION_TIMEOUT_MS,
    );

    if (response.status === 429) {
      htmlValidatorRateLimited = true;
      console.warn(
          `[HTML] Validatoren returnerte 429 Too Many Requests for ${url}. Deaktiverer videre HTML-validering i denne testrunden.`,
      );
      return { hasErrors: false, skipped: true };
    }

    if (!response.ok) {
      console.warn(
          `[HTML] Validatoren returnerte ${response.status} ${response.statusText} for ${url}. Skipper validering for denne siden.`,
      );
      return { hasErrors: false, skipped: true };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const snippet = (await response.text()).slice(0, 120);
      console.warn(
          `[HTML] Uventet content-type (${contentType}) for ${url}. Første tegn: ${snippet}`,
      );
      return { hasErrors: false, skipped: true };
    }

    const result = await response.json();
    let hasErrors = false;

    if (Array.isArray(result.messages) && result.messages.length > 0) {
      const errors = result.messages.filter((msg) => msg.type === "error");
      const warnings = result.messages.filter((msg) => msg.type === "warning");

      if (errors.length > 0) {
        console.error(`❌ Found ${errors.length} HTML validation errors on ${url}:`);
        errors.forEach((error, index) => {
          console.error(
              `  ${index + 1}. [Line ${error.lastLine || "?"}, Col ${error.lastColumn || "?"}] ${error.message}`,
          );
          if (error.extract) {
            console.error(`     ${error.extract.trim()}`);
          }
        });
        hasErrors = true;
      }

      if (warnings.length > 0) {
        console.warn(`⚠️  Found ${warnings.length} HTML validation warnings on ${url}`);
        warnings.forEach((warning, index) => {
          console.warn(`  ${index + 1}. ${warning.message}`);
          if (warning.extract) {
            console.warn(`     ${warning.extract.trim()}`);
          }
        });
      }
    }

    return { hasErrors, skipped: false };
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : String(error);
    console.warn(`[HTML] Feil ved kall til HTML-validator for ${url}: ${message}. Skipper validering for denne siden.`);
    return { hasErrors: false, skipped: true };
  }
}

const toCanonicalUrl = (input) => {
  const url = new URL(input);
  url.hash = "";

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
};

test("Check internal links, external links and validate HTML on internal pages.", async ({ page }) => {
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
    urlsToVisit.add(toCanonicalUrl(fullUrl));
  });

  const checkLinks = async (url) => {
    const canonicalUrl = toCanonicalUrl(url);

    if (visitedUrls.has(canonicalUrl) || visitedUrls.size >= maxPagesToCheck) {
      return;
    }

    const baseHost = new URL(baseUrl).hostname;
    const currentHost = new URL(url).hostname;
    const isSameDomain = currentHost === baseHost;

    visitedUrls.add(canonicalUrl);

    if (!isSameDomain || visitedUrls.size >= maxPagesToCheck) {
      return;
    }

    console.log(`Checking: ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
      // Best effort: noen sider blir aldri “network idle”, men “load” kan fortsatt skje.
      await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
    } catch (error) {
      const message = typeof error?.message === "string" ? error.message : String(error);
      console.error(`Failed to load ${url}:`, message);
      linkIssues[url] = `Failed to load page for link check: ${message}`;
      return;
    }

    const { hasErrors } = await validateHtml(page, url);
    if (hasErrors) {
      if (Object.keys(linkIssues).length < 10) {
        linkIssues[url] = `HTML validation failed for ${url}`;
      } else if (Object.keys(linkIssues).length === 10) {
        linkIssues[url] =
            `HTML validation failed for ${url}\n\n` +
            `Found more than 10 pages with validation errors, only showing first 10`;
      }
    }

    const validationError = await validateLink(url, page);
    if (validationError) {
      console.error(`Broken link found on: ${page.url()} ${url}`);
      linkIssues[url] = `Broken link found on ${url} -> ${page.url()}`;
    }

    const links = await page.$$eval(
        "a[href]",
        (anchors) =>
            anchors
                .map((anchor) => anchor.href)
                .filter((href) => {
                  if (!href) {
                    return false;
                  }

                  const excludedPaths = ["/stillinger/stilling", "/stillingsregistrering", "/cv", "/oauth2", "https://login.idporten.no/"];
                  if (excludedPaths.some((path) => href.includes(path))) {
                    return false;
                  }

                  if (href.includes("#") || href.includes("mailto:") || href.includes("tel:")) {
                    return false;
                  }

                  return true;
                }),
    );

    for (const link of links) {
      if (visitedUrls.size >= maxPagesToCheck) {
        break;
      }

      const linkUrl = new URL(link);
      const externalKey = toCanonicalUrl(link);

      if (!visitedUrls.has(link) && !urlsToVisit.has(link)) {
        if (linkUrl.hostname === new URL(baseUrl).hostname) {
          urlsToVisit.add(toCanonicalUrl(link));
        } else if (!validatedExternalLinks.has(externalKey)) {
          try {
            const error = await validateLink(link, page);
            validatedExternalLinks.add(externalKey);

            if (error) {
              console.error(`Broken external link found on ${url}: ${link}`);
              linkIssues[url] = `Broken external link found on ${url} -> ${link}`;
            } else {
              console.log(`VALID: ${link}`);
            }
          } catch (err) {
            console.error(`Error validating external link ${link}:`, err);
          }
        }
      }
    }
  };

  while (urlsToVisit.size > 0 && visitedUrls.size < maxPagesToCheck) {
    const [nextUrl] = urlsToVisit;
    await checkLinks(nextUrl);
    urlsToVisit.delete(nextUrl);
  }

  const issueCount = Object.keys(linkIssues).length;
  if (issueCount > 0) {
    const errorMessages = Object.values(linkIssues).join("\n");
    throw new Error(`Found ${issueCount} errors:\n\n${errorMessages}`);
  }
});
