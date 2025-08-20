import { addFailedTest } from "./global-state.js";

class CustomReporter {
  onBegin(config, suite) {
    console.log(`Starting the run with ${suite.allTests().length} tests`);
  }

  onTestEnd(test, result) {
    if (result.status === "failed" || result.status === "timedOut") {
      const project = test.parent.project() || {};
      const projectName = project?.name || "unknown";

      console.log(`Test failed in ${projectName}: ${test.title}`);

      addFailedTest({
        title: test.title,
        error: result.error?.message || "Test failed",
        projectName,
      });
    }
  }

  onEnd(result) {
    console.log(`Finished the run: ${result.status}`);
  }
}

// Export a factory function
export default function () {
  return new CustomReporter();
}
