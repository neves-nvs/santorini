// Runs before the Playwright tests so that a missing browser stops the run with one clear message
// instead of failing every test. Usage: node scripts/ensure-browser.mjs [channel]
// With a channel (for example "chrome") it checks that installed browser; without one, Playwright's own Chromium.
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { chromium } from "@playwright/test";

const channel = process.argv[2] || undefined;
const installCommand = "pnpm exec playwright install chromium";

async function canLaunch() {
  try {
    const browser = await chromium.launch({ channel });
    await browser.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist") || message.includes("is not found at")) {
      return false;
    }
    throw error;
  }
}

async function confirmInstall() {
  if (!process.stdin.isTTY) {
    return false;
  }
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question(`Playwright's Chromium is not installed. Run "${installCommand}" now? [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } catch {
    return false;
  } finally {
    terminal.close();
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!(await canLaunch())) {
  if (channel) {
    fail(`The "${channel}" browser is not installed. Install it, or unset the channel to use Playwright's Chromium.`);
  }
  if (await confirmInstall()) {
    const installed = spawnSync("pnpm", ["exec", "playwright", "install", "chromium"], { stdio: "inherit" });
    if (installed.status === 0 && (await canLaunch())) {
      process.exit(0);
    }
    fail("The browser could not be installed.");
  }
  const nixHint = spawnSync("nix", ["--version"], { stdio: "ignore" }).status === 0 ? ' Or enter the Nix shell that has them: "nix develop .#e2e".' : "";
  fail(`Playwright's Chromium is not installed. Install it with: ${installCommand}.${nixHint}`);
}
