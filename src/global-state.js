const failedTests = [];

export function addFailedTest(testInfo) {
  failedTests.push({
    title: testInfo.title,
    error: testInfo.error?.message || "Test failed",
    projectName: testInfo.projectName || "unknown",
  });
}

export function getFailedTests() {
  return failedTests;
}
