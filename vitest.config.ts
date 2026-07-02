import "dotenv/config";
import { defineConfig } from "vitest/config";
import { AIFailureReporter } from "./src/AIFailureReporter";

export default defineConfig({
  test: { reporters: ["default", new AIFailureReporter()] },
});
