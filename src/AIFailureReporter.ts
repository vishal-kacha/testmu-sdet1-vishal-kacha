import fs from "node:fs";
import path from "node:path";
import type { Reporter, TestCase } from "vitest/node";
import { explainFailure, FailureContext } from "./failureExplainer";

interface FailureReportEntry {
  testName: string;
  filePath: string;
  errorMessage: string;
  aiExplanation: string;
  aiSuggestedFix: string;
  aiConfidence: string;
}

export class AIFailureReporter implements Reporter {
  private outputPath = path.resolve(process.cwd(), "test-results/ai-failure-report.json");
  private entries: FailureReportEntry[] = [];

  async onTestCaseResult(testCase: TestCase): Promise<void> {
    const result = testCase.result();
    if (result.state !== "failed") return;

    const context = this.buildContext(testCase);

    console.log(`\n✗ ${testCase.fullName}`);
    console.log(`  🧠 Requesting AI analysis...`);

    const { explanation, suggestedFix, confidence } = await explainFailure(context);

    console.log(`  📍 ${context.filePath}`);
    console.log(`  🧠 Explanation:   ${explanation}`);
    console.log(`  🔧 Suggested fix: ${suggestedFix}`);
    console.log(`  📊 Confidence:    ${confidence}\n`);

    this.entries.push({
      testName: context.testName,
      filePath: context.filePath,
      errorMessage: context.errorMessage,
      aiExplanation: explanation,
      aiSuggestedFix: suggestedFix,
      aiConfidence: confidence,
    });
  }

  onTestRunEnd(): void {
    if (this.entries.length === 0) {
      console.log("[AIFailureReporter] No failures detected - skipping report.");
      return;
    }

    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          failureCount: this.entries.length,
          entries: this.entries,
        },
        null,
        2,
      ),
    );

    console.log(
      `[AIFailureReporter] Full report (${this.entries.length} failure(s)) written to ${this.outputPath}`,
    );
  }

  private buildContext(testCase: TestCase): FailureContext {
    const result = testCase.result();
    const error = result.state === "failed" ? result.errors?.[0] : undefined;
    const meta = testCase.meta() as Record<string, unknown>;

    return {
      testName: testCase.fullName,
      filePath: testCase.module.moduleId,
      errorMessage: error?.message ?? "Unknown error",
      stackTrace: error?.stack,
      pageState: meta.pageState as FailureContext["pageState"],
      apiResponse: meta.apiResponse as FailureContext["apiResponse"],
    };
  }
}
