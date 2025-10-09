#!/usr/bin/env node

import { execSync } from "node:child_process";
import { chromium } from "playwright";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function isMissingExecutableError(error) {
  return typeof error?.message === "string" && error.message.includes("Executable doesn't exist");
}

function installChromiumIfNeeded() {
  const installCommand = process.env.npm_execpath?.includes("pnpm")
    ? "pnpm exec playwright install chromium"
    : "npx playwright install chromium";

  console.log("Playwright Chromium browser missing. Installing via:", installCommand);

  execSync(installCommand, { stdio: "inherit" });
}

async function launchChromiumWithAutoInstall() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!isMissingExecutableError(error)) {
      throw error;
    }

    installChromiumIfNeeded();
    return chromium.launch();
  }
}

async function main() {
  let browser;
  let context;

  try {
    browser = await launchChromiumWithAutoInstall();
    context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(() => {
      window.__analyticsCalls = [];
      window.plausible = function (event, payload) {
        window.__analyticsCalls.push({ event, payload });
      };
    });

    await page.goto(`${baseUrl}/jobs`, { waitUntil: "networkidle" });

    const initialEvents = await page.evaluate(() => window.__analyticsCalls.length);
    if (initialEvents !== 0) {
      throw new Error(`Expected no analytics events before consent, found ${initialEvents}`);
    }

    const allowButton = page.getByRole("button", { name: "اجازه می‌دهم" });
    await allowButton.click();

    await page.waitForFunction(
      () =>
        window.__analyticsCalls.some((entry) => entry.event === "jobs:list_view") &&
        window.__analyticsCalls.some((entry) => entry.event === "analytics:consent_granted"),
      { timeout: 5000 },
    );

    console.log("Analytics smoke passed: consent + jobs:list_view events captured");
  } finally {
    await context?.close();
    await browser?.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
