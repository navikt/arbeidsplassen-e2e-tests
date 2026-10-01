import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBlocksForFailedTests,
  classifyChecklinksErrorLines,
  buildChecklinksHeaderText,
  CHECKLINKS_TEST_TITLE,
} from "./global-teardown.js";

// Gjenskaper teksten tests/prod-checklinks.spec.js kaster når linkIssues
// inneholder minst én feil, se den siste linja i testen.
function buildChecklinksErrorText(issueLines) {
  return `Found ${issueLines.length} errors:\n\n${issueLines.join("\n")}`;
}

function buildChecklinksFailedTest(issueLines, overrides = {}) {
  return {
    title: CHECKLINKS_TEST_TITLE,
    projectName: "chromium",
    error: buildChecklinksErrorText(issueLines),
    ...overrides,
  };
}

function findBlocksText(payload) {
  return payload.attachments[0].blocks
      .flatMap((block) => {
        const texts = [];
        if (block.text?.text) {
          texts.push(block.text.text);
        }
        if (Array.isArray(block.elements)) {
          texts.push(...block.elements.map((element) => element.text ?? ""));
        }
        return texts;
      })
      .join("\n");
}

function headerTextOf(payload) {
  const headerBlock = payload.attachments[0].blocks.find((block) => block.type === "header");
  return headerBlock?.text?.text;
}

test("klassifiserer HTML-valideringsfeil", () => {
  const classified = classifyChecklinksErrorLines(
      getLinesForTest(["HTML validation failed for https://arbeidsplassen.nav.no/sommerjobb"]),
  );

  assert.deepEqual(classified.htmlValidationUrls, [
    "https://arbeidsplassen.nav.no/sommerjobb",
  ]);
  assert.equal(classified.brokenInternalLinks.length, 0);
  assert.equal(classified.brokenExternalLinks.length, 0);
});

test("klassifiserer ødelagte interne og eksterne lenker hver for seg", () => {
  const classified = classifyChecklinksErrorLines(
      getLinesForTest([
        "Broken link found on https://arbeidsplassen.nav.no/a -> https://arbeidsplassen.nav.no/a",
        "Broken external link found on https://arbeidsplassen.nav.no/b -> https://ekstern.no/c",
      ]),
  );

  assert.equal(classified.brokenInternalLinks.length, 1);
  assert.equal(classified.brokenExternalLinks.length, 1);
  assert.equal(classified.brokenExternalLinks[0].target, "https://ekstern.no/c");
});

test("Slack-overskrift: kun HTML-feil", () => {
  const payload = buildBlocksForFailedTests([
    buildChecklinksFailedTest([
      "HTML validation failed for https://arbeidsplassen.nav.no/sommerjobb",
    ]),
  ]);

  assert.equal(headerTextOf(payload), "❌ HTML-validering feilet");

  const text = findBlocksText(payload);
  assert.match(text, /Sider med HTML-feil \(1\)/);
  assert.match(text, /sommerjobb/);
});

test("Slack-overskrift: kun intern lenkefeil", () => {
  const payload = buildBlocksForFailedTests([
    buildChecklinksFailedTest([
      "Broken link found on https://arbeidsplassen.nav.no/a -> https://arbeidsplassen.nav.no/a",
    ]),
  ]);

  assert.equal(headerTextOf(payload), "❌ Intern lenkesjekk feilet");
});

test("Slack-overskrift: kun ekstern lenkefeil", () => {
  const payload = buildBlocksForFailedTests([
    buildChecklinksFailedTest([
      "Broken external link found on https://arbeidsplassen.nav.no/b -> https://ekstern.no/c",
    ]),
  ]);

  assert.equal(headerTextOf(payload), "❌ Ekstern lenkesjekk feilet");
});

test("Slack-overskrift: blandede feiltyper", () => {
  const payload = buildBlocksForFailedTests([
    buildChecklinksFailedTest([
      "HTML validation failed for https://arbeidsplassen.nav.no/sommerjobb",
      "Broken external link found on https://arbeidsplassen.nav.no/b -> https://ekstern.no/c",
    ]),
  ]);

  assert.equal(headerTextOf(payload), "❌ Lenke- og HTML-sjekk feilet");
});

test("ukjent feilformat havner i fallback-seksjon og generisk overskrift", () => {
  const payload = buildBlocksForFailedTests([
    buildChecklinksFailedTest(["En helt uventet feiltekst uten kjent prefiks"]),
  ]);

  assert.equal(headerTextOf(payload), "❌ Arbeidsplassen E2E – tester feilet");

  const text = findBlocksText(payload);
  assert.match(text, /Andre feil \(1\)/);
  assert.match(text, /En helt uventet feiltekst uten kjent prefiks/);
});

test("begrenser antall viste elementer per seksjon", () => {
  const urls = Array.from(
      { length: 15 },
      (_, i) => `HTML validation failed for https://arbeidsplassen.nav.no/side-${i}`,
  );

  const payload = buildBlocksForFailedTests([buildChecklinksFailedTest(urls)]);
  const text = findBlocksText(payload);

  assert.match(text, /Sider med HTML-feil \(15\)/);
  assert.match(text, /\+ 5 til, se CI-loggen\./);
});

test("Slack-meldingen for checklinks skjuler testnummer, [chromium] og det lange testnavnet", () => {
  const payload = buildBlocksForFailedTests([
    buildChecklinksFailedTest([
      "HTML validation failed for https://arbeidsplassen.nav.no/sommerjobb",
    ]),
  ]);

  const text = findBlocksText(payload);
  assert.doesNotMatch(text, /\[chromium\]/);
  assert.equal(text.includes(CHECKLINKS_TEST_TITLE), false);
  assert.doesNotMatch(text, /Severity/);
});

test("kritisk uptime-feil beholder rød farge og utvikleromtale uten synlig severity", () => {
  const payload = buildBlocksForFailedTests([
    {
      title: "/stillinger is working in PROD and count is above 0",
      projectName: "chromium",
      error: "Error: expected 0 to be above 0",
    },
  ]);

  assert.equal(payload.attachments[0].color, "#E01E5A");

  const text = findBlocksText(payload);
  assert.match(text, /<!subteam\^S01J06FB8RY>/);
  assert.doesNotMatch(text, /Severity/);
});

test("ikke-kritisk generisk testfeil beholder gul farge og generisk visning", () => {
  const payload = buildBlocksForFailedTests([
    {
      title: "Verify Arbeidsplassen DEV homepage loads",
      projectName: "chromium",
      error: "Page load failed",
    },
  ]);

  assert.equal(payload.attachments[0].color, "#ECB22E");
  assert.equal(headerTextOf(payload), "❌ Arbeidsplassen E2E – tester feilet");

  const text = findBlocksText(payload);
  assert.match(text, /\[chromium\]/);
  assert.doesNotMatch(text, /Severity/);
});

function getLinesForTest(issueLines) {
  // classifyChecklinksErrorLines forventer linjer inkludert headerlinja
  // ("Found N errors:"), siden den selv hopper over den første linja.
  return ["Found errors:", ...issueLines];
}
