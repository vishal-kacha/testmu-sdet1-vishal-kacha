// vitest.d.ts
import "vitest";
import type { FailureContext } from "./src/failureExplainer";

declare module "vitest" {
  interface TaskMeta {
    pageState?: FailureContext["pageState"];
    apiResponse?: FailureContext["apiResponse"];
  }
}
