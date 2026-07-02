import { afterAll, beforeAll, describe, it, expect } from "vitest";
import puppeteer, { Browser, Page } from "puppeteer";

describe("Login Page", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it("shows the dashboard heading after login", async ({ task }) => {
    await page.goto("https://example.com");

    const heading = await page.$eval("h1", (el) => el.textContent?.trim() ?? "");

    // Capture page state BEFORE asserting, so it's available on the
    // report whether this test passes or fails.
    task.meta.pageState = {
      url: page.url(),
      title: await page.title(),
      visibleText: heading,
    };

    // Intentionally wrong on example.com — swap for a real assertion
    // once pointed at your actual app.
    expect(heading).toBe("Welcome to your Dashboard");
  });
});
