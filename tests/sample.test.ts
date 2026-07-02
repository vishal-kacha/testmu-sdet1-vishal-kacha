import { describe, it, expect } from "vitest";
import puppeteer from "puppeteer";

describe("sample puppeteer test", () => {
  it("loads example.com and checks title", async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://example.com");
    const title = await page.title();
    expect(title).toBe("Example Domain");
    await browser.close();
  });
});
