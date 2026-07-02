// tests/api/api.spec.ts
import { describe, it, expect } from "vitest";

describe("Test Case API", () => {
  it("creates a test case with the correct priority", async ({ task }) => {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Verify login", module: "Login", priority: "P1" }),
    });

    const body = await response.json();

    // Capture the API response BEFORE asserting.
    task.meta.apiResponse = {
      method: "POST",
      endpoint: "/posts",
      status: response.status,
      body,
    };

    // Intentionally wrong — this mock API echoes "P1", not "P2".
    expect(body.priority).toBe("P2");
  });
});
