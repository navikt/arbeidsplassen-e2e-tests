import { getFailedTests } from "../src/global-state.js";
import sendSlackMessage from "../src/sendSlackMessage.js";

export default async function globalTeardown() {
  const failedTests = getFailedTests();

  if (failedTests.length > 0) {
    const browserCount = new Set(failedTests.map((t) => t.projectName)).size;
    const message = `❌ Arbeidsplassen E2E tests failed in ${browserCount} browser${
      browserCount > 1 ? "s" : ""
    }.`;

    const details = failedTests
      .map(
        (test, index) =>
          `${index + 1}. [${test.projectName || "unknown"}] ${test.title}\n   ${
            test.error.split("\n")[0]
          }`
      )
      .join("\n\n");

    await sendSlackMessage(`${message}\n\n${details}`);
  } else {
    console.log("All tests passed across all browsers!");
  }
}
