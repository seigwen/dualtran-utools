#!/usr/bin/env node
/**
 * capture-store-shots.mjs — store screenshots for the uTools listing.
 *
 * Runs the real page in Chromium (models.dev is hit for real; only Google is
 * answered locally so the shot is deterministic and offline-safe), then saves
 * three 1280x800 PNGs under docs/screenshots/.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "screenshots");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const file = path.join(ROOT, url.pathname === "/" ? "index.app.html" : url.pathname);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    "content-type":
      ext === ".html" ? "text/html; charset=utf-8" : ext === ".css" ? "text/css; charset=utf-8" : "text/javascript",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.addInitScript(`window.utools = { copyText() {}, setExpendHeight() {}, hideMainWindow() {} };`);
await page.route("**/translate_a/single**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([[["人工智能正在改变人们的工作方式。", "AI is changing how people work.", null, null, 10]], null, "en"]),
  })
);
await page.goto(`${origin}/index.app.html`);
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll("#aiProvider option")).some((option) => option.disabled)
);
fs.mkdirSync(OUT, { recursive: true });

await page.fill("#input", "AI is changing how people work.\n\nSelect text in any app, hit the uTools hotkey, and translate it.");
await page.click("#translate");
await page.waitForFunction(() => document.getElementById("result").textContent.includes("人工智能"));
await page.screenshot({ path: path.join(OUT, "01-translate.png") });

await page.evaluate(() => {
  document.getElementById("settings").open = true;
});
await page.screenshot({ path: path.join(OUT, "02-settings.png") });

await page.evaluate(() => {
  const provider = document.getElementById("aiProvider");
  const target = Array.from(provider.options).find((option) => option.value.startsWith("c:"));
  if (target) {
    provider.value = target.value;
    provider.dispatchEvent(new Event("change"));
  }
});
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "03-models-dev.png") });

await browser.close();
server.close();
console.log(`[shots] wrote ${fs.readdirSync(OUT).join(", ")}`);
