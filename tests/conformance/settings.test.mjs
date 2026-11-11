/**
 * Conformance payload for dualtran-utools (spec 2.0.0).
 *
 * The payload is read off the *real rendered page*, not off the source text:
 * index.app.html is served over loopback, models.dev is stubbed with
 * tests/conformance/fixtures/models-dev-sample.json, and every list below comes from the live
 * <select> elements + inputs. A source that renders the wrong UI therefore
 * fails here even if it looks right in a diff.
 *
 *   node tests/conformance/settings.test.mjs      # print payload + validate
 *   npm run conformance                           # same, via the shared runner
 *
 * `default export` is the payload builder the runner imports (module.default);
 * running the file directly also asserts and prints a one-line result, which is
 * the vitest-style test entry point described in the task's TDD procedure.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { SPEC_VERSION, validatePayload } from "../../scripts/conformance/validate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const HOST = "dualtran-utools";
const CONFIG = path.join(ROOT, "conformance.json");

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));

/** Playwright's bundled chromium first; a system Chrome keeps the sandbox usable. */
const CHROME_CANDIDATES = [
  process.env.DT_CHROME,
  "/root/.hermes/tools/chromium-1208/chrome-linux64/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
].filter(Boolean);

async function launch() {
  let fallbackError = null;
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    fallbackError = error;
  }
  for (const executablePath of CHROME_CANDIDATES) {
    if (!fs.existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ headless: true, executablePath });
    } catch (error) {
      fallbackError = error;
    }
  }
  throw new Error(`no Chromium could be launched: ${fallbackError && fallbackError.message}`);
}

/** index.app.html plus whatever it references from the repo, on loopback. */
async function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const file = path.join(ROOT, url.pathname === "/" ? "index.app.html" : url.pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    const ext = path.extname(file);
    const type =
      ext === ".html" ? "text/html; charset=utf-8" : ext === ".css" ? "text/css" : "text/javascript";
    res.writeHead(200, { "content-type": type });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// Helper functions must be passed BY REFERENCE: a string argument is evaluated by
// Playwright as an expression, so an arrow-function literal there is never called.
function optionsIn(id) {
  const select = document.getElementById(id);
  if (!select) throw new Error(`missing #${id}`);
  return Array.from(select.options).map((option) => ({
    value: option.value,
    label: (option.textContent || "").trim(),
    selected: option.selected,
  }));
}

function setAndChange({ id, value }) {
  const node = document.getElementById(id);
  node.value = value;
  node.dispatchEvent(new Event("change"));
  return node.value;
}

function typeAndChange({ id, value }) {
  const node = document.getElementById(id);
  node.value = value;
  node.dispatchEvent(new Event("input"));
  node.dispatchEvent(new Event("change"));
  return node.value;
}
async function openPage(browser, origin, fixture) {
  const context = await browser.newContext({ viewport: { width: 980, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  // No network: models.dev is the only remote call the page makes, and it is stubbed.
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("https://models.dev/api.json")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      });
    }
    if (url.startsWith(origin)) return route.continue();
    return route.abort();
  });
  await page.goto(`${origin}/index.app.html`);
  // The catalogue lands asynchronously; wait until it has settled before reading the UI.
  await page.waitForFunction(() => document.querySelectorAll("#aiProvider option").length > 0);
  // Wait until the catalogue has settled — the page shows either a loaded/offline count
  // or an error. Whether the merged provider list is correct is the validator's job, not
  // this wait's: waiting for "a c: entry exists" would turn a product bug into a timeout.
  await page.waitForFunction(
    () => {
      const text = (document.getElementById("catalogState").textContent || "").trim();
      return text.length > 0 && !/\d(\.\.\.|…)\s*$/.test(text) && !/loading/i.test(text);
    },
    undefined,
    { timeout: 20000 }
  );
  await page.evaluate(() => {
    document.getElementById("settings").open = true;
  });
  return { page, context, pageErrors };
}

/** Source of truth for provider identity: which BUILTIN entry / catalogue id a value means. */
async function providerSources(page) {
  return page.evaluate(() => {
    const select = document.getElementById("aiProvider");
    return Array.from(select.options).map((option) => {
      const value = option.value;
      if (value.startsWith("c:")) return { value, source: "models.dev", id: value.slice(2) };
      const id = value.replace(/^b:/, "");
      return { value, source: id === "custom" ? "custom" : "built-in", id };
    });
  });
}

async function buildPayload() {
  const fixture = readJson("tests/conformance/fixtures/models-dev-sample.json");
  const languageNames = readJson("tests/conformance/fixtures/language-names.json");
  const server = await startServer();
  const browser = await launch();
  try {
    const { page, context, pageErrors } = await openPage(browser, server.origin, fixture);
    const config = readJson("conformance.json");

    const sources = await providerSources(page);
    const sourceOf = new Map(sources.map((entry) => [entry.value, entry.source]));

    // ── R1: language pickers ────────────────────────────────────────────────
    const targetOptions = await page.evaluate(optionsIn, "target");
    const sourceOptions = await page.evaluate(optionsIn, "source");
    const language = {
      control: "select",
      current: await page.evaluate(() => document.getElementById("target").value),
      options: targetOptions.map(({ value, label }) => ({ value, label })),
      sourceOptions: sourceOptions.map(({ value, label }) => ({ value, label })),
      // The fixture is the whole expectation: every code it names must be pickable,
      // and every label derived from it must read "Name (code)".
      fixture: languageNames,
    };

    // ── R2: one provider list ───────────────────────────────────────────────
    const providerOptions = await page.evaluate(optionsIn, "aiProvider");
    const provider = {
      control: "select",
      current: await page.evaluate(() => document.getElementById("aiProvider").value),
      options: providerOptions.map((option) => ({
        value: option.value,
        label: option.label,
        source: sourceOf.get(option.value),
      })),
    };

    // ── R2: models, per provider, as rendered after switching to it ─────────
    // The custom provider is the free-text escape hatch by definition: its model picker
    // only offers "Custom…", so "no fixed model list" is the honest report there.
    const byProvider = {};
    const customEntries = {};
    const providerState = {};
    for (const option of providerOptions) {
      const selectedProvider = await page.evaluate(setAndChange, { id: "aiProvider", value: option.value });
      if (selectedProvider !== option.value) {
        throw new Error(`provider "${option.value}" could not be selected`);
      }
      const models = await page.evaluate(optionsIn, "aiModelSelect");
      const real = models.filter((entry) => !/^__custom/.test(entry.value));
      if (real.length) {
        byProvider[option.value] = real.map((entry) => ({ value: entry.value, label: entry.label }));
      }
      // `__custom__` (labelled "Custom…" etc.) is the escape hatch, not a catalogue
      // model: R2 pins it last, so it is recorded separately for its own assertion.
      customEntries[option.value] = models
        .map((entry) => entry.value)
        .filter((value) => /^__custom/.test(value));
      providerState[option.value] = {
        endpoint: await page.evaluate(() => document.getElementById("aiBaseUrl").value),
      };
    }
    // Probe R3 on a catalogue provider: its endpoint comes from models.dev, not from a
    // hardcoded built-in, so the autofill is genuinely exercised.
    const probeProvider = providerOptions.find((option) => option.value === "c:cohere") || providerOptions[0];
    await page.evaluate(setAndChange, { id: "aiProvider", value: probeProvider.value });
    const model = {
      control: "select",
      byProvider,
      selectedProvider: await page.evaluate(() => document.getElementById("aiProvider").value),
      selectedModel: await page.evaluate(() => document.getElementById("aiModelSelect").value),
      // Where "Custom…" sat in each list; R2 requires it last.
      customEntries,
    };

    // ── R3: endpoint autofill from a clean load, then a user override ───────
    // The expected base is what the page's own resolver says for the probe provider, so
    // the check fails if the field is filled with the wrong provider's endpoint.
    const endpoint = await page.evaluate(
      ({ probe, alternative }) => {
        const base = document.getElementById("aiBaseUrl");
        const select = document.getElementById("aiProvider");
        const set = (value) => {
          select.value = value;
          select.dispatchEvent(new Event("change"));
        };
        // A clean state: clear the field, then let the page fill the provider's base.
        base.value = "";
        set(probe);
        const filledFirst = base.value;
        set(alternative);
        const filledSwitch = base.value;
        // The user takes over: later switches must not revert this.
        base.value = "https://proxy.example/v1";
        base.dispatchEvent(new Event("input"));
        base.dispatchEvent(new Event("change"));
        set(probe);
        const afterOverride = base.value;
        set(alternative);
        const afterOverrideSwitch = base.value;
        return { filledFirst, filledSwitch, afterOverride, afterOverrideSwitch };
      },
      { probe: probeProvider.value, alternative: "b:deepseek" }
    );
    const probeId = probeProvider.value.startsWith("c:") ? probeProvider.value.slice(2) : "";
    const providerApi = await page.evaluate(
      ({ id, cached }) =>
        id && cached[id] && window.__dtConformance
          ? window.__dtConformance.catalogBase(id, cached[id])
          : "",
      {
        id: probeId,
        cached: Object.fromEntries(
          Object.entries(fixture).map(([key, value]) => [key, { api: value.api || "", pkg: value.npm || "" }])
        ),
      }
    );

    // ── R4: reasoning sentinel + resolution ─────────────────────────────────
    const reasoningOptions = await page.evaluate(optionsIn, "aiReasoning");
    const reasoningDefault = await page.evaluate(() => document.getElementById("aiReasoning").value);
    // Resolution comes from the page itself (window.__dtConformance), driven through the
    // real model dropdown, so a regression in the ladder is a payload failure, not a
    // missing case.
    const ladder = await page.evaluate(async () => {
      const hook = window.__dtConformance;
      // A page without the hook cannot report resolution; "" for every case makes the
      // validator say so instead of the harness throwing a TypeError.
      if (!hook) return {};
      const select = document.getElementById("aiReasoning");
      const pickProvider = (value) => {
        const provider = document.getElementById("aiProvider");
        provider.value = value;
        provider.dispatchEvent(new Event("change"));
      };
      const modelSelect = document.getElementById("aiModelSelect");
      const modelInput = document.getElementById("aiModel");
      const cases = {};
      const levels = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
      const providerIds = Array.from(document.getElementById("aiProvider").options).map((o) => o.value);
      for (const provider of providerIds) {
        pickProvider(provider);
        const declared = Array.from(modelSelect.options)
          .map((option) => option.value)
          .filter((value) => value !== "__custom__")
          .slice(0, 40);
        for (const value of declared) {
          modelSelect.value = value;
          modelInput.value = value;
          // The reasoning options are rebuilt per model; the page listens on the model
          // select and the free-text input, so dispatch to get the real control state.
          modelSelect.dispatchEvent(new Event("change"));
          modelInput.dispatchEvent(new Event("input"));
          select.value = "__lowest__";
          const active = hook.reasoningValuesFor().filter((level) => levels.indexOf(level) >= 0);
          if (!active.length) {
            // No declared level at all: the page must send no reasoning parameter.
            (cases["none-declared"] = cases["none-declared"] || []).push({
              setting: "__lowest__",
              provider,
              model: value,
              options: [],
              value: hook.resolveReasoning(),
            });
            continue;
          }
          const resolved = hook.resolveReasoning();
          // R4: `lowest` resolves to the first *declared* level in the none → minimal →
          // low ladder, and to "" when the model declares nothing in it (a model that
          // only offers medium/high sends no reasoning parameter by default).
          const wanted = ["none", "minimal", "low"].find((level) => active.indexOf(level) >= 0) || "";
          (cases[wanted || "none-declared"] = cases[wanted || "none-declared"] || []).push({
            setting: "__lowest__",
            provider,
            model: value,
            options: active,
            value: resolved,
          });
          for (const level of active) {
            // The control only offers levels the current model declares; an explicit
            // pick is only meaningful for one of them.
            if (!Array.from(select.options).some((option) => option.value === level)) continue;
            select.value = level;
            (cases[level] = cases[level] || []).push({
              setting: level,
              provider,
              model: value,
              options: active,
              value: hook.resolveReasoning(),
            });
          }
        }
      }
      return cases;
    });
    const reasoning = {
      control: "select",
      default: reasoningDefault,
      options: reasoningOptions.map((option) => option.value),
      resolved: ladder,
    };

    // ── R5: locale matrix + keys the page actually uses ─────────────────────
    const localesDir = path.join(ROOT, "locales");
    const localeCodes = fs
      .readdirSync(localesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(localesDir, entry.name, "messages.json")))
      .map((entry) => entry.name)
      .sort();
    const files = {};
    for (const code of localeCodes) {
      const raw = readJson(path.join("locales", code, "messages.json"));
      files[code] = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [
          key,
          // The uTools keyword 「翻译」 is product content every locale names on purpose;
          // it is not untranslated text, so the payload reports it as a placeholder.
          String(typeof value === "object" ? value.message : value).replace(/「[^」]*」/g, "KEYWORD"),
        ])
      );
    }
    const html = fs.readFileSync(path.join(ROOT, "index.app.html"), "utf8");
    const used = [...new Set([...html.matchAll(/\bt\(\s*"([A-Za-z0-9_]+)"/g)].map((match) => match[1]))].sort();
    const keys = [...new Set(Object.keys(files.en || {}))].sort();

    const payload = {
      spec: SPEC_VERSION,
      host: HOST,
      language,
      provider,
      model,
      endpoint: {
        control: "text",
        autofill: {
          provider: model.selectedProvider,
          providerApi,
          before: "",
          after: endpoint.filledFirst,
          userEdited: "https://proxy.example/v1",
          afterSwitch: endpoint.afterOverride,
        },
        // Extra evidence the validator does not read; kept for the record.
        observed: endpoint,
      },
      reasoning,
      i18n: { locales: localeCodes, keys, sourceLocale: "en", files, used },
      pageErrors,
      providerState,
    };
    await context.close();
    return payload;
  } finally {
    await browser.close();
    await server.close();
  }
}

export default buildPayload;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  const payload = await buildPayload();
  const summary = validatePayload(payload, config);
  console.log(JSON.stringify(payload, null, 2));
  console.log(
    `PASS ${summary.host}: ${summary.languages} languages, ${summary.providers} providers, ${summary.localeCount} locales (spec ${summary.spec})`
  );
}
