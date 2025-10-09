#!/usr/bin/env node

import puppeteer from "puppeteer";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function main() {
  let browser;

  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      window.__analyticsCalls = [];
      window.plausible = function (event, payload) {
        window.__analyticsCalls.push({ event, payload });
      };
    });

    await page.goto(`${baseUrl}/jobs`, { waitUntil: "networkidle0" });

    const initialEvents = await page.evaluate(() => window.__analyticsCalls.length);
    if (initialEvents !== 0) {
      throw new Error(`Expected no analytics events before consent, found ${initialEvents}`);
    }

    const allowButton = await page.waitForXPath("//button[contains(., 'اجازه می‌دهم')]");
    if (!allowButton) {
      throw new Error("Consent allow button not found");
    }

    await allowButton.click();

    await page.waitForFunction(
      () =>
        window.__analyticsCalls.some((entry) => entry.event === "jobs:list_view") &&
        window.__analyticsCalls.some((entry) => entry.event === "analytics:consent_granted"),
      { timeout: 5000 },
    );

    console.log("Analytics smoke passed: consent + jobs:list_view events captured");
  } finally {
    await browser?.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
