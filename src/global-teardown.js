import { getFailedTests } from "./global-state.js";
import sendSlackMessage from "./sendSlackMessage.js";

const MAX_TESTS_IN_MESSAGE = 10;
const MAX_ITEMS_PER_SECTION = 10;

// Testtittelen i tests/prod-checklinks.spec.js. Brukes til å gi denne testen
// et eget, mer lesbart Slack-format i stedet for det generiske testnavnet.
const CHECKLINKS_TEST_TITLE =
    "Check internal links, external links and validate HTML on internal pages.";

// Prefiksene linjene i prod-checklinks sin feiltekst kan starte med.
// Se tests/prod-checklinks.spec.js for hvor disse tekstene settes sammen.
const HTML_VALIDATION_PREFIX = "HTML validation failed for ";
const BROKEN_EXTERNAL_LINK_PREFIX = "Broken external link found on ";
const BROKEN_INTERNAL_LINK_PREFIX = "Broken link found on ";
const PAGE_LOAD_FAILURE_PREFIX = "Failed to load page for link check: ";
const OVERFLOW_NOTE_PREFIX = "Found more than ";

function dedupeFailedTests(failedTests) {
  const uniqueMap = new Map();

  for (const test of failedTests) {
    const key = `${test.projectName || "unknown"}::${test.title}::${String(
        test.error ?? "",
    )}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, test);
    }
  }

  return Array.from(uniqueMap.values());
}

function getErrorLines(error) {
  const text = String(error ?? "");
  return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
}

function parseError(error) {
  const lines = getErrorLines(error);
  const headerLine = lines[0] ?? "Unknown error";
  const rest = lines.slice(1);

  const htmlValidationUrls = [];
  const otherLines = [];

  for (const line of rest) {
    if (line.startsWith(HTML_VALIDATION_PREFIX)) {
      const url = line.slice(HTML_VALIDATION_PREFIX.length).trim();
      if (url.length > 0) {
        htmlValidationUrls.push(url);
      }
    } else {
      otherLines.push(line);
    }
  }

  return {
    headerLine,
    htmlValidationUrls,
    otherLines,
  };
}

// Deler feilteksten fra prod-checklinks opp i kategoriene testen faktisk kan
// produsere. Se tests/prod-checklinks.spec.js for hvor hver tekst settes sammen.
function classifyChecklinksErrorLines(lines) {
  const htmlValidationUrls = [];
  const brokenInternalLinks = [];
  const brokenExternalLinks = [];
  const pageLoadFailures = [];
  const overflowNotes = [];
  const unknownLines = [];

  // Hopper over selve "Found X errors:"-headerlinja fra Error-objektet.
  for (const line of lines.slice(1)) {
    if (line.startsWith(HTML_VALIDATION_PREFIX)) {
      const url = line.slice(HTML_VALIDATION_PREFIX.length).trim();
      if (url.length > 0) {
        htmlValidationUrls.push(url);
      }
      continue;
    }

    if (line.startsWith(BROKEN_EXTERNAL_LINK_PREFIX)) {
      const remainder = line.slice(BROKEN_EXTERNAL_LINK_PREFIX.length).trim();
      const [source, target] = remainder.split(" -> ").map((part) => part?.trim());
      if (target) {
        brokenExternalLinks.push({ source, target });
      }
      continue;
    }

    // Må sjekkes etter BROKEN_EXTERNAL_LINK_PREFIX, siden begge starter med "Broken ... link found on ".
    if (line.startsWith(BROKEN_INTERNAL_LINK_PREFIX)) {
      const remainder = line.slice(BROKEN_INTERNAL_LINK_PREFIX.length).trim();
      const [source, target] = remainder.split(" -> ").map((part) => part?.trim());
      if (source) {
        brokenInternalLinks.push({ source, target });
      }
      continue;
    }

    if (line.startsWith(PAGE_LOAD_FAILURE_PREFIX)) {
      const message = line.slice(PAGE_LOAD_FAILURE_PREFIX.length).trim();
      if (message.length > 0) {
        pageLoadFailures.push(message);
      }
      continue;
    }

    if (line.startsWith(OVERFLOW_NOTE_PREFIX)) {
      overflowNotes.push(line);
      continue;
    }

    unknownLines.push(line);
  }

  return {
    htmlValidationUrls,
    brokenInternalLinks,
    brokenExternalLinks,
    pageLoadFailures,
    overflowNotes,
    unknownLines,
  };
}

// Velger en overskrift ut fra hvilke feiltyper som faktisk finnes. Returnerer
// null når vi ikke kan si noe sikkert, slik at den generiske overskriften brukes.
function buildChecklinksHeaderText(classified) {
  const hasHtmlErrors = classified.htmlValidationUrls.length > 0;
  const hasInternalErrors =
      classified.brokenInternalLinks.length > 0 || classified.pageLoadFailures.length > 0;
  const hasExternalErrors = classified.brokenExternalLinks.length > 0;

  const typeCount = [hasHtmlErrors, hasInternalErrors, hasExternalErrors].filter(
      Boolean,
  ).length;

  if (typeCount >= 2) {
    return "❌ Lenke- og HTML-sjekk feilet";
  }

  if (hasHtmlErrors) {
    return "❌ HTML-validering feilet";
  }

  if (hasInternalErrors) {
    return "❌ Intern lenkesjekk feilet";
  }

  if (hasExternalErrors) {
    return "❌ Ekstern lenkesjekk feilet";
  }

  return null;
}

function toSlackLink(url) {
  if (typeof url !== "string" || url.length === 0) {
    return url ?? "";
  }

  return url.startsWith("http://") || url.startsWith("https://")
      ? `<${url}|${url}>`
      : url;
}

// Bygger én mrkdwn-seksjon per feilkategori, begrenset til MAX_ITEMS_PER_SECTION
// linjer slik at meldingen holder seg innenfor Slack sin blokkgrense.
function buildListSectionBlock(title, items, formatItem) {
  if (items.length === 0) {
    return null;
  }

  const shown = items.slice(0, MAX_ITEMS_PER_SECTION);
  const lines = shown.map((item) => `• ${formatItem(item)}`);

  let text = `*${title} (${items.length})*\n${lines.join("\n")}`;
  if (items.length > MAX_ITEMS_PER_SECTION) {
    text += `\n_+ ${items.length - MAX_ITEMS_PER_SECTION} til, se CI-loggen._`;
  }

  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text,
    },
  };
}

function buildChecklinksDetailBlocks(classified) {
  const blocks = [];

  const sections = [
    buildListSectionBlock("Sider med HTML-feil", classified.htmlValidationUrls, (url) =>
        toSlackLink(url),
    ),
    buildListSectionBlock(
        "Interne sider som ikke svarer",
        classified.brokenInternalLinks,
        ({ source, target }) => {
          const base = toSlackLink(source);
          return target && target !== source
              ? `${base} (omdirigert til ${toSlackLink(target)})`
              : base;
        },
    ),
    buildListSectionBlock("Sider som ikke lastet", classified.pageLoadFailures, (message) => message),
    buildListSectionBlock(
        "Ødelagte eksterne lenker",
        classified.brokenExternalLinks,
        ({ source, target }) => {
          const link = toSlackLink(target);
          return source ? `${link} (funnet på ${toSlackLink(source)})` : link;
        },
    ),
    buildListSectionBlock("Andre feil", classified.unknownLines, (line) => line),
  ];

  for (const section of sections) {
    if (section) {
      blocks.push(section);
    }
  }

  if (classified.overflowNotes.length > 0) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `_${classified.overflowNotes[0]}_` }],
    });
  }

  return blocks;
}

function getCiLinks() {
  const links = [];

  const githubRepository = process.env.GITHUB_REPOSITORY;
  const githubRunId = process.env.GITHUB_RUN_ID;

  if (githubRepository && githubRunId) {
    const githubUrl = `https://github.com/${githubRepository}/actions/runs/${githubRunId}`;
    links.push(`<${githubUrl}|GitHub Actions>`);
  }

  const naisJobsUrl = process.env.NAIS_JOBS_URL;
  if (naisJobsUrl) {
    links.push(`<${naisJobsUrl}|NAIS jobber>`);
  }

  return links;
}

function buildBlocksForFailedTests(failedTests) {
  const uniqueFailedTests = dedupeFailedTests(failedTests).slice(
      0,
      MAX_TESTS_IN_MESSAGE,
  );

/*  const browserNames = new Set(
      uniqueFailedTests.map((t) => t.projectName || "unknown"),
  );*/

  const defaultHeaderText = "❌ Arbeidsplassen E2E – tester feilet";

  // Når prod-checklinks er eneste feilende test, kan vi si noe mer presist
  // enn det generiske, lange testnavnet i selve overskriften.
  const isSoleChecklinksFailure =
      uniqueFailedTests.length === 1 &&
      uniqueFailedTests[0].title === CHECKLINKS_TEST_TITLE;

  const checklinksClassification = isSoleChecklinksFailure
      ? classifyChecklinksErrorLines(getErrorLines(uniqueFailedTests[0].error))
      : null;

  const headerText =
      (checklinksClassification && buildChecklinksHeaderText(checklinksClassification)) ||
      defaultHeaderText;

  const CRITICAL_TEST_TITLES = [
    "/stillinger is working in PROD and count is above 0",
  ];

  const isCritical = uniqueFailedTests.some((failedTest) =>
      CRITICAL_TEST_TITLES.includes(failedTest.title)
  );

  // Bruk eksplisitt hex-farge for å være sikker på at Slack faktisk farger stripen
  const color = isCritical ? "#E01E5A" : "#ECB22E"

  /** @type {Array<any>} */
  const blocks = [];

  // Header (kun inni attachment, ikke som separat text)
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: headerText,
      emoji: true,
    },
  });

  if (isCritical) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<!subteam^S01J06FB8RY>`, // Group ID for @arbeidsplassen_no-devs
      },
    });
  }

  blocks.push({ type: "divider" });

  if (checklinksClassification) {
    // Egen, kategorisert visning for prod-checklinks i stedet for det
    // generiske testnavnet og «Error: Found N errors»-linja.
    blocks.push(...buildChecklinksDetailBlocks(checklinksClassification));
  } else {
    // En seksjon per test (generisk format, uendret for andre testfiler)
    uniqueFailedTests.forEach((test, index) => {
      const projectName = test.projectName || "unknown";
      const title = test.title || "Unknown test";
      const { headerLine, htmlValidationUrls } = parseError(test.error);

      let text = `*${index + 1}. [${projectName}] ${title}*\n`;
      text += `\`${headerLine}\``;

      if (htmlValidationUrls.length > 0) {
        text += "\n*Sider med valideringsfeil:*\n";
        const urlLines = htmlValidationUrls.map((url) => `• ${toSlackLink(url)}`);
        text += urlLines.join("\n");
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      });
    });
  }

  const ciLinks = getCiLinks();
  const contextElements = [
    {
      type: "mrkdwn",
      text: isSoleChecklinksFailure
          ? "_Detaljer i CI-loggene._"
          : "_Mer informasjon om tester som feiler finnes i CI-loggene._",
    },
  ];

  if (ciLinks.length > 0) {
    contextElements.push({
      type: "mrkdwn",
      text: `• ${ciLinks.join(" • ")}`,
    });
  }

  blocks.push({
    type: "context",
    elements: contextElements,
  });

  // Viktig: ingen top-level text her → bare attachment med farge + blocks
  return {
    attachments: [
      {
        color,
        fallback: headerText, // vises i notifikasjoner / eldre klienter
        blocks,
      },
    ],
  };
}

export {
  buildBlocksForFailedTests,
  classifyChecklinksErrorLines,
  buildChecklinksHeaderText,
  buildChecklinksDetailBlocks,
  CHECKLINKS_TEST_TITLE,
};

export default async function globalTeardown() {
  const failedTests = getFailedTests();

  if (failedTests.length === 0) {
    console.log("All tests passed across all browsers!");
    return;
  }

  const payload = buildBlocksForFailedTests(failedTests);
  await sendSlackMessage(payload);
}
