import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { anthropic, AI_MODEL } from "./anthropicClient";

export interface FailureContext {
  testName: string;
  filePath: string;
  errorMessage: string;
  stackTrace?: string;
  pageState?: {
    url?: string;
    title?: string;
    visibleText?: string;
  };
  apiResponse?: {
    method?: string;
    endpoint?: string;
    status?: number;
    body?: unknown;
  };
}

const FailureExplanationSchema = z.object({
  explanation: z
    .string()
    .describe(
      "Specific root cause referencing the actual field, selector, status code, or value involved",
    ),
  suggestedFix: z.string().describe("Concrete, actionable fix"),
  confidence: z.enum(["high", "medium", "low"]),
});

export type FailureExplanation = z.infer<typeof FailureExplanationSchema>;

const TOOL_NAME = "report_failure_analysis";

const jsonSchema = zodToJsonSchema(FailureExplanationSchema, TOOL_NAME).definitions![TOOL_NAME];

const SYSTEM_PROMPT = `You are a senior SDET triaging automated test failures.
Be specific — reference the actual field, selector, status code, or value involved.`;

export async function explainFailure(context: FailureContext): Promise<FailureExplanation> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      explanation: "AI explanation skipped: ANTHROPIC_API_KEY not configured.",
      suggestedFix: "Set ANTHROPIC_API_KEY to enable AI failure analysis.",
      confidence: "low",
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(context) }],
      tools: [
        {
          name: TOOL_NAME,
          description: "Report the structured analysis of a test failure.",
          input_schema: jsonSchema as any,
          strict: true,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use",
    );

    if (!toolUse) {
      throw new Error("Model did not return a tool_use block");
    }

    // Belt-and-suspenders: validate against the same Zod schema.
    return FailureExplanationSchema.parse(toolUse.input);
  } catch (err) {
    return {
      explanation: `AI explanation failed: ${(err as Error).message}`,
      suggestedFix: "Review the raw error/stack trace manually.",
      confidence: "low",
    };
  }
}

function buildPrompt(context: FailureContext): string {
  const lines = [
    `Test: ${context.testName}`,
    `File: ${context.filePath}`,
    `Error: ${context.errorMessage}`,
  ];
  if (context.stackTrace) lines.push(`Stack:\n${context.stackTrace.slice(0, 1500)}`);
  if (context.pageState) lines.push(`Page state:\n${JSON.stringify(context.pageState, null, 2)}`);
  if (context.apiResponse)
    lines.push(`API response:\n${JSON.stringify(context.apiResponse, null, 2)}`);
  return lines.join("\n\n");
}
