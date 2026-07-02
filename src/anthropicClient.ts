import Anthropic from "@anthropic-ai/sdk";

// SDK throws at construction if apiKey is undefined, so fall back to a
// placeholder. explainFailure() checks ANTHROPIC_API_KEY itself before ever
// calling this client, so a missing key just disables AI calls instead of
// crashing the whole process.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "missing-anthropic-api-key",
});

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
