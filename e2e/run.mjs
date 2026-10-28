/**
 * run.mjs — uTools plugin E2E (host API stubbed, real page, real fetch).
 *
 * The page is a plain HTML document, so the only host surface to stub is
 * `window.utools` (copyText / setExpendHeight). Everything else — the provider
 * dropdown, the reasoning resolution, the spinner — is the shipped code.
 *
 * Scenarios follow the cross-host contract (see
 * DualTran-manage/94-host-e2e-plan.md): settings shape, Google translate,
 * AI request body, loading visibility, error path, persistence.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const ARTIFACTS = path.join(ROOT, "e2e-artifacts");
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures", "modelsdev.json"), "utf8"));

const UTools_STUB = `
  window.__copied = [];
  window.__dtOutbox = [];
  window.__dtFetches = [];
  window.addEventListener("message", (event) => {
    if (event && event.data && event.data.__dualtran === true) window.__dtOutbox.push(event.data);
  });
  const __dtFetch = window.fetch.bind(window);
  window.fetch = (...args) => { window.__dtFetches.push(String(args[0])); return __dtFetch(...args); };
  window.utools = {
    copyText(text) { window.__copied.push(text); },
    setExpendHeight() {},
    hideMainWindow() {},
  };
`;

/** Static server for index.app.html + a scripted OpenAI/Google endpoint on /v1. */
async function startServer() {
  const requests = [];
  let ai = { status: 200, delayMs: 0, content: "译文" };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let body = raw;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        /* keep raw */
      }
      requests.push({ method: req.method, url: req.url, body, headers: req.headers });

      if (url.pathname === "/v1/chat/completions") {
        if (ai.delayMs) await new Promise((resolve) => setTimeout(resolve, ai.delayMs));
        if (ai.status !== 200) {
          res.writeHead(ai.status, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "mock failure" } }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
        res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: ai.content } }] }));
        return;
      }

      const file = path.join(ROOT, url.pathname === "/" ? "index.app.html" : url.pathname);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end("not found");
        return;
      }
      const ext = path.extname(file);
      res.writeHead(200, {
        "content-type": ext === ".html" ? "text/html; charset=utf-8" : ext === ".css" ? "text/css" : "text/javascript",
      });
      fs.createReadStream(file).pipe(res);
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    clear: () => (requests.length = 0),
    setAi: (next) => (ai = { ...ai, ...next }),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function openPage(browser, origin, options = {}) {
  const context = await browser.newContext({ viewport: { width: 960, height: 900 }, ...options });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (message) => logs.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));

  await page.addInitScript(UTools_STUB);
  await page.route("https://models.dev/api.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) })
  );
  await page.route("**/translate_a/single**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([[["译文", url.searchParams.get("q") || "", null, null, 10]], null, "en"]),
    });
  });

  await page.goto(`${origin}/index.app.html`);
  await page.waitForFunction(() => document.querySelectorAll("#aiProvider option").length > 0);
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("#aiProvider option")).some((option) => option.disabled)
  );
  // Open the settings drawer so the inputs are actionable.
  await page.evaluate(() => {
    document.getElementById("settings").open = true;
  });
  return { page, context, logs };
}

/** Hidden selects cannot be driven by selectOption; set + dispatch like a user. */
async function pick(page, id, value) {
  return page.evaluate(
    ({ id, value }) => {
      const select = document.getElementById(id);
      select.value = value;
      select.dispatchEvent(new Event("change"));
      return select.value;
    },
    { id, value }
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scenarios = [];
const scenario = (name, run) => scenarios.push({ name, run });

scenario("settings-shape", async ({ browser, server }) => {
  const { page, context } = await openPage(browser, server.origin);
  const shape = await page.evaluate(() => {
    const provider = document.getElementById("aiProvider");
    const options = Array.from(provider.options);
    const divider = options.findIndex((option) => option.disabled);
    const reasoning = document.getElementById("aiReasoning");
    return {
      count: options.length,
      first: options[0] && options[0].value,
      dividerText: divider >= 0 ? options[divider].textContent.trim() : null,
      afterDivider: divider >= 0 ? options.slice(divider + 1).map((option) => option.value) : [],
      reasoning: Array.from(reasoning.options).map((option) => option.value),
    };
  });
  assert(shape.first && shape.first.startsWith("b:"), `built-ins must lead, got ${shape.first}`);
  assert(shape.dividerText === "── more ──", `divider must read "── more ──", got ${shape.dividerText}`);
  assert(shape.afterDivider.some((value) => value.startsWith("c:")), "catalogue providers must follow the divider");
  assert(shape.reasoning[0] === "__lowest__", `reasoning must default to lowest, got ${shape.reasoning[0]}`);
  assert(shape.reasoning[1] === "", `second reasoning option must be provider default`);
  await page.screenshot({ path: path.join(ARTIFACTS, "settings-shape", "screenshot.png"), fullPage: true });
  await context.close();
});

scenario("google-translate", async ({ browser, server }) => {
  const { page, context } = await openPage(browser, server.origin);
  await page.fill("#input", "Hello world");
  await page.click("#translate");
  await page.waitForFunction(() => document.getElementById("result").textContent.trim().length > 0, null, {
    timeout: 5000,
  });
  const state = await page.evaluate(() => ({
    result: document.getElementById("result").textContent,
    status: document.getElementById("status").textContent,
  }));
  assert(state.result.includes("译文"), `expected 译文, got ${state.result}`);
  assert(/Done/.test(state.status), `expected Done, got ${state.status}`);
  await page.screenshot({ path: path.join(ARTIFACTS, "google-translate", "screenshot.png") });
  await context.close();
});

scenario("ai-request-body", async ({ browser, server }) => {
  const { page, context } = await openPage(browser, server.origin);
  await pick(page, "aiProvider", "b:openai");
  // Built-ins ship a fixed model list; the free-text row is how a user picks gpt-5.
  await pick(page, "aiModelSelect", "__custom__");
  await page.fill("#aiModel", "gpt-5");
  await page.dispatchEvent("#aiModel", "input");
  await page.fill("#aiBaseUrl", `${server.origin}/v1`);
  await pick(page, "aiReasoning", "low");
  await page.fill("#aiApiKey", "test-key");
  await pick(page, "engine", "ai");
  await page.fill("#input", "Hello world");
  server.clear();
  await page.click("#translate");
  await page.waitForFunction(() => document.getElementById("result").textContent.trim().length > 0, null, {
    timeout: 5000,
  });
  const call = server.requests.find((entry) => entry.url === "/v1/chat/completions");
  assert(call, "no AI request reached the mock endpoint");
  assert(call.body.model === "gpt-5", `wrong model: ${call.body.model}`);
  assert(call.body.reasoning_effort === "low", `wrong reasoning_effort: ${call.body.reasoning_effort}`);
  assert(call.headers.authorization === "Bearer test-key", `wrong auth: ${call.headers.authorization}`);
  fs.writeFileSync(path.join(ARTIFACTS, "ai-request-body", "requests.json"), JSON.stringify(server.requests, null, 2));
  await page.screenshot({ path: path.join(ARTIFACTS, "ai-request-body", "screenshot.png") });
  await context.close();
});

scenario("loading-visible", async ({ browser, server }) => {
  const { page, context } = await openPage(browser, server.origin);
  await pick(page, "aiProvider", "b:openai");
  // Built-ins ship a fixed model list; the free-text row is how a user picks gpt-5.
  await pick(page, "aiModelSelect", "__custom__");
  await page.fill("#aiModel", "gpt-5");
  await page.dispatchEvent("#aiModel", "input");
  await page.fill("#aiBaseUrl", `${server.origin}/v1`);
  await page.fill("#aiApiKey", "test-key");
  await pick(page, "engine", "ai");
  await page.fill("#input", "Hello world");
  server.setAi({ delayMs: 1200 });
  await page.click("#translate");
  await page.waitForFunction(() => document.getElementById("status").classList.contains("busy"), null, {
    timeout: 1500,
  });
  await page.screenshot({ path: path.join(ARTIFACTS, "loading-visible", "screenshot-while-busy.png") });
  await page.waitForFunction(() => !document.getElementById("status").classList.contains("busy"), null, {
    timeout: 6000,
  });
  const after = await page.evaluate(() => ({
    busy: document.getElementById("status").classList.contains("busy"),
    disabled: document.getElementById("translate").disabled,
  }));
  assert(!after.busy, "spinner stayed after the response");
  assert(!after.disabled, "translate button stayed disabled");
  await context.close();
});

scenario("error-path", async ({ browser, server }) => {
  const { page, context } = await openPage(browser, server.origin);
  await pick(page, "aiProvider", "b:openai");
  // Built-ins ship a fixed model list; the free-text row is how a user picks gpt-5.
  await pick(page, "aiModelSelect", "__custom__");
  await page.fill("#aiModel", "gpt-5");
  await page.dispatchEvent("#aiModel", "input");
  await page.fill("#aiBaseUrl", `${server.origin}/v1`);
  await page.fill("#aiApiKey", "bad-key");
  await pick(page, "engine", "ai");
  await page.fill("#input", "Hello world");
  server.setAi({ status: 401, delayMs: 0 });
  await page.click("#translate");
  await page.waitForFunction(() => document.getElementById("status").classList.contains("error"), null, {
    timeout: 5000,
  });
  const state = await page.evaluate(() => ({
    text: document.getElementById("status").textContent,
    busy: document.getElementById("status").classList.contains("busy"),
    disabled: document.getElementById("translate").disabled,
  }));
  assert(/401/.test(state.text), `error must mention 401, got ${state.text}`);
  assert(!state.busy, "spinner must be cleared on failure");
  assert(!state.disabled, "translate button must be usable again");
  await page.screenshot({ path: path.join(ARTIFACTS, "error-path", "screenshot.png") });
  await context.close();
});

scenario("persistence", async ({ browser, server }) => {
  const { page, context } = await openPage(browser, server.origin);
  await pick(page, "aiProvider", "c:orcarouter");
  await pick(page, "aiModelSelect", "orcarouter/fusion-mini");
  await pick(page, "aiReasoning", "high");
  await page.fill("#aiBaseUrl", `${server.origin}/v1`);
  await pick(page, "target", "ja");
  await page.click("#translate");
  await page.waitForFunction(() => document.getElementById("status").textContent.length > 0, null, { timeout: 5000 });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("#aiProvider option").length > 0);
  const restored = await page.evaluate(() => ({
    provider: document.getElementById("aiProvider").value,
    model: document.getElementById("aiModelSelect").value,
    reasoning: document.getElementById("aiReasoning").value,
    target: document.getElementById("target").value,
  }));
  assert(restored.provider === "c:orcarouter", `provider not persisted: ${restored.provider}`);
  assert(restored.model === "orcarouter/fusion-mini", `model not persisted: ${restored.model}`);
  assert(restored.reasoning === "high", `reasoning not persisted: ${restored.reasoning}`);
  assert(restored.target === "ja", `target not persisted: ${restored.target}`);
  await page.screenshot({ path: path.join(ARTIFACTS, "persistence", "screenshot.png") });
  await context.close();
});

scenario("enter-text", async ({ browser, server }) => {
  const { page, context } = await openPage(browser, server.origin);

  // The preload registers onPluginEnter before the page exists, so the page must
  // announce readiness — otherwise a first-entry delivery has nowhere to land.
  const boot = await page.evaluate(() => window.__dtOutbox.slice());
  assert(
    boot.some((message) => message.type === "ready"),
    `page must announce readiness for the preload, got ${JSON.stringify(boot)}`
  );

  const deliver = (message) => page.evaluate((payload) => window.postMessage(payload, "*"), message);
  const translateCalls = () =>
    page.evaluate(() => window.__dtFetches.filter((url) => url.includes("translate_a/single")).length);

  // A text-bearing entry (划词 / pasted / `dt <text>`) fills the box and runs once.
  await deliver({ __dualtran: true, type: "input", text: "Hello world" });
  await page.waitForFunction(() => document.getElementById("result").textContent.trim().length > 0, null, {
    timeout: 5000,
  });
  const state = await page.evaluate(() => ({
    input: document.getElementById("input").value,
    result: document.getElementById("result").textContent,
    acks: window.__dtOutbox.filter((message) => message.type === "ack").length,
  }));
  assert(state.input === "Hello world", `entry text must land in the input, got "${state.input}"`);
  assert(state.result.includes("译文"), `entry text must be translated, got "${state.result}"`);
  assert(state.acks >= 1, "the page must ack the delivery so the preload stops re-posting");

  // The preload retries until acked; a repeated delivery of the same text must
  // not translate twice.
  const callsAfterFirst = await translateCalls();
  await deliver({ __dualtran: true, type: "input", text: "Hello world" });
  await page.waitForTimeout(300);
  const callsAfterRetry = await translateCalls();
  assert(
    callsAfterRetry === callsAfterFirst,
    `an identical retry must be deduped, got ${callsAfterRetry - callsAfterFirst} extra request(s)`
  );

  // A bare keyword entry carries no text: focus the box, hint, and never translate
  // the keyword itself.
  await page.evaluate(() => {
    document.getElementById("input").value = "";
  });
  await deliver({ __dualtran: true, type: "focus" });
  await page.waitForTimeout(200);
  const bare = await page.evaluate(() => ({
    status: document.getElementById("status").textContent,
    focused: document.activeElement === document.getElementById("input"),
  }));
  assert((await translateCalls()) === callsAfterFirst, "a bare keyword entry must not translate anything");
  assert(bare.focused, "a bare keyword entry must focus the input");
  const enCatalogue = JSON.parse(fs.readFileSync(path.join(ROOT, "locales", "en", "messages.json"), "utf8"));
  assert(
    bare.status === enCatalogue.utNoTextHint.message,
    `expected the entry hint, got "${bare.status}"`
  );

  await page.screenshot({ path: path.join(ARTIFACTS, "enter-text", "screenshot.png") });
  await context.close();
});

scenario("i18n-locale", async ({ browser, server }) => {
  const read = (code) => JSON.parse(fs.readFileSync(path.join(ROOT, "locales", code, "messages.json"), "utf8"));
  const de = read("de");
  const { page, context } = await openPage(browser, server.origin, { locale: "de-DE" });
  const state = await page.evaluate(() => ({
    translate: document.getElementById("translate").textContent,
    copy: document.getElementById("copy").textContent,
    placeholder: document.getElementById("input").getAttribute("placeholder"),
    engineTitle: document.getElementById("engine").title,
    uiLang: document.getElementById("uiLang").value,
    uiLangOptions: document.getElementById("uiLang").options.length,
  }));
  assert(state.translate === de.btnTranslate.message, `translate button must be German, got "${state.translate}"`);
  assert(state.copy === de.btncopy.message, `copy button must be German, got "${state.copy}"`);
  assert(state.placeholder === de.utPlaceholder.message, `placeholder must be German, got "${state.placeholder}"`);
  assert(state.engineTitle === de.utEngine.message, `engine title must be German, got "${state.engineTitle}"`);
  assert(state.uiLang === "auto", `language picker must default to auto, got "${state.uiLang}"`);
  assert(state.uiLangOptions >= 30, `language picker must list the catalogues, got ${state.uiLangOptions}`);

  // Dynamic text goes through t() too.
  await page.click("#translate");
  const status = await page.evaluate(() => document.getElementById("status").textContent);
  assert(status === de.utStatusNothing.message, `status must be German, got "${status}"`);

  await page.screenshot({ path: path.join(ARTIFACTS, "i18n-locale", "screenshot.png") });
  await context.close();
});

async function main() {
  fs.rmSync(ARTIFACTS, { recursive: true, force: true });
  for (const entry of scenarios) fs.mkdirSync(path.join(ARTIFACTS, entry.name), { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  for (const entry of scenarios) {
    const started = Date.now();
    process.stdout.write(`▶ ${entry.name} … `);
    try {
      await entry.run({ browser, server });
      console.log(`ok (${Date.now() - started} ms)`);
    } catch (error) {
      failures.push(entry.name);
      console.log(`FAILED\n  ${error && error.stack ? error.stack.split("\n").slice(0, 4).join("\n  ") : error}`);
      fs.writeFileSync(
        path.join(ARTIFACTS, entry.name, "error.txt"),
        String(error && error.stack ? error.stack : error)
      );
    } finally {
      server.clear();
    }
  }

  await browser.close();
  await server.close();

  if (failures.length) {
    console.error(`\n${failures.length}/${scenarios.length} scenarios failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`\n${scenarios.length}/${scenarios.length} scenarios passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
