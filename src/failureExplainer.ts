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

export interface FailureExplanation {
  explanation: string;
  suggestedFix: string;
  confidence: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You are a senior SDET triaging automated test failures.
Respond ONLY with raw JSON, no markdown fences, matching exactly this shape:
{ "explanation": string, "suggestedFix": string, "confidence": "high"|"medium"|"low" }
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
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "{}";
    const parsed = JSON.parse(raw);

    return {
      explanation: parsed.explanation ?? "No explanation returned.",
      suggestedFix: parsed.suggestedFix ?? "No suggested fix returned.",
      confidence: parsed.confidence ?? "medium",
    };
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
