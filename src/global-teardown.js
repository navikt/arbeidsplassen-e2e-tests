import { getFailedTests } from "./global-state.js";
import sendSlackMessage from "./sendSlackMessage.js";

const MAX_TESTS_IN_MESSAGE = 10;

function dedupeFailedTests(failedTests) {
  const uniqueMap = new Map();

  for (const test of failedTests) {
    const key = `${test.projectName || "unknown"}::${test.title}::${String(
        test.error ?? ""
    )}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, test);
    }
  }

  return Array.from(uniqueMap.values());
}

function parseError(error) {
  const text = String(error ?? "");
  const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

  const headerLine = lines[0] ?? "Unknown error";
  const rest = lines.slice(1);

  const htmlValidationUrls = [];
  const otherLines = [];

  for (const line of rest) {
    const prefix = "HTML validation failed for ";
    if (line.startsWith(prefix)) {
      const url = line.slice(prefix.length).trim();
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

function getCiLinks() {
  const links = [];

  // GitHub Actions (disse env-ene settes automatisk i GitHub)
  const githubRepository = process.env.GITHUB_REPOSITORY;
  const githubRunId = process.env.GITHUB_RUN_ID;

  if (githubRepository && githubRunId) {
    const githubUrl = `https://github.com/${githubRepository}/actions/runs/${githubRunId}`;
    links.push(`<${githubUrl}|GitHub Actions>`);
  }

  // NAIS – la workflowen sette denne eksplisitt
  const naisJobsUrl = process.env.NAIS_JOBS_URL;
  if (naisJobsUrl) {
    links.push(`<${naisJobsUrl}|NAIS jobber>`);
  }

  return links;
}

function buildBlocksForFailedTests(failedTests) {
  const uniqueFailedTests = dedupeFailedTests(failedTests).slice(
      0,
      MAX_TESTS_IN_MESSAGE
  );

  const browserNames = new Set(
      uniqueFailedTests.map((t) => t.projectName || "unknown")
  );

  const headerText = "❌ Arbeidsplassen E2E – tester feilet";

  /** @type {Array<import("@slack/web-api").KnownBlock | any>} */
  const blocks = [];

  // Header
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: headerText,
      emoji: true,
    },
  });

  // Oppsummeringsseksjon
  blocks.push({
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Browser(e):*\n\`${Array.from(browserNames).join(", ")}\``,
      },
      {
        type: "mrkdwn",
        text: `*Antall feilede tester:*\n${uniqueFailedTests.length}`,
      },
    ],
  });

  blocks.push({
    type: "divider",
  });

  // En seksjon per test
  uniqueFailedTests.forEach((test, index) => {
    const projectName = test.projectName || "unknown";
    const title = test.title || "Unknown test";
    const { headerLine, htmlValidationUrls } = parseError(test.error);

    let text = `*${index + 1}. [${projectName}] ${title}*\n`;
    text += `\`${headerLine}\``;

    if (htmlValidationUrls.length > 0) {
      text += "\n*Sider med valideringsfeil:*\n";
      const urlLines = htmlValidationUrls.map((url) => {
        const slackUrl =
            url.startsWith("http://") || url.startsWith("https://")
                ? `<${url}|${url}>`
                : url;
        return `• ${slackUrl}`;
      });

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

  const ciLinks = getCiLinks();
  const contextElements = [
    {
      type: "mrkdwn",
      text: "_Mer informasjon om tester som feiler finnes i CI-loggene._",
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

  return {
    text: headerText, // fallback for notifikasjoner / eldre klienter
    blocks,
  };
}

export default async function globalTeardown() {
  const failedTests = getFailedTests();

  if (failedTests.length === 0) {
    console.log("All tests passed across all browsers!");
    return;
  }

  const payload = buildBlocksForFailedTests(failedTests);
  await sendSlackMessage(payload);
}
