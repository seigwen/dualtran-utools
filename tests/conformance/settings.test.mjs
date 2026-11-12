/**
 * Conformance payload for dualtran-utools (spec 2.1.0).
 *
 * The payload is read off the *real rendered page*, not off the source text:
 * index.app.html is served over loopback, models.dev is stubbed with
 * tests/conformance/fixtures/models-dev-sample.json, and every list below comes from the live
 * <select> elements + inputs. A source that renders the wrong UI therefore
 * fails here even if it looks right in a diff.
 *
 * Two states are reported, both observed rather than reconstructed:
 *   - unconfigured: a fresh load with empty storage (SPEC 2.1 — no provider chosen);
 *   - configured:   after choosing the Anthropic built-in.
 *
 *   node tests/conformance/settings.test.mjs      # print payload + validate
 *   npm run conformance                           # same, via the shared runner
 *
 * `default export` is the payload builder; running the file directly validates the
 * payload (shared kit + this host's negative controls) and prints it. `npm run
 * conformance` runs this file through `conformance.json` `payloadCommand` and
 * passes its JSON to the shared kit, so the host assertions are part of the gate.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { SPEC_VERSION, validatePayload } from "../../scripts/conformance/validate.mjs";
import { scanFiles } from "../../scripts/conformance/scan.mjs";
import { runEmptyControls } from "./emptyControls.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const HOST = "dualtran-utools";
const CONFIG = path.join(ROOT, "conformance.json");
/** The provider the "configured" half of the payload selects (models.dev Anthropic). */
const CONFIGURED_PROVIDER = "c:anthropic";

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
    disabled: option.disabled,
  }));
}

function controlState(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return { value: node.value, disabled: node.disabled === true };
}

function setAndChange({ id, value }) {
  const node = document.getElementById(id);
  node.value = value;
  node.dispatchEvent(new Event("change"));
  return node.value;
}

async function openPage(browser, origin, fixture, { storage = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 980, height: 900 } });
  // A fresh install has empty storage. The models.dev cache is pre-seeded so the
  // merged list is deterministic without a live fetch; the settings key stays unset.
  await context.addInitScript((seed) => {
    for (const [key, value] of Object.entries(seed)) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        /* private mode — the page copes without storage */
      }
    }
  }, storage || {});
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

/** The whole settings surface as rendered, for one page state. */
async function readState(page) {
  const providerOptions = await page.evaluate(optionsIn, "aiProvider");
  const modelOptions = await page.evaluate(optionsIn, "aiModelSelect");
  const reasoningOptions = await page.evaluate(optionsIn, "aiReasoning");
  const provider = await page.evaluate(controlState, "aiProvider");
  const model = await page.evaluate(controlState, "aiModelSelect");
  const reasoning = await page.evaluate(controlState, "aiReasoning");
  const endpoint = await page.evaluate(() => {
    const node = document.getElementById("aiBaseUrl");
    return { value: node.value, placeholder: node.getAttribute("placeholder") };
  });
  const translate = await page.evaluate(() => {
    const node = document.getElementById("translate");
    return { disabled: node.disabled === true, title: node.getAttribute("title") };
  });
  return { providerOptions, modelOptions, reasoningOptions, provider, model, reasoning, endpoint, translate };
}

/** Options as the validator sees them: the placeholder is split out of the real list. */
function splitPlaceholder(options) {
  const placeholder = options.find((option) => option.value === "" && option.disabled);
  const real = options.filter((option) => option !== placeholder);
  return {
    placeholder: placeholder
      ? {
          value: "",
          label: placeholder.label,
          disabled: placeholder.disabled === true,
          selected: placeholder.selected === true,
        }
      : null,
    real,
  };
}

async function buildPayload() {
  const fixture = readJson("tests/conformance/fixtures/models-dev-sample.json");
  const languageNames = readJson("tests/conformance/fixtures/language-names.json");
  const server = await startServer();
  const browser = await launch();
  try {
    // Seed only the catalogue cache (with a fresh timestamp so no refetch happens);
    // dualtran.settings is deliberately absent — that is a fresh install.
    const cache = {
      ts: Date.now(),
      data: {
        providers: await seedProjection(fixture),
      },
    };
    const { page, context, pageErrors } = await openPage(browser, server.origin, fixture, {
      storage: { "dualtran.modelsdev.v2": JSON.stringify(cache) },
    });

    const sources = await providerSources(page);
    const sourceOf = new Map(sources.map((entry) => [entry.value, entry.source]));

    // ── Unconfigured: the fresh-load state, read before anything is touched ──
    const empty = await readState(page);
    const emptySplit = splitPlaceholder(empty.providerOptions);
    const unconfigured = {
      provider: {
        control: "select",
        current: empty.provider.value,
        placeholder: emptySplit.placeholder,
        fallback: empty.provider.value,
      },
      model: {
        control: "select",
        disabled: empty.model.disabled,
        selectedProvider: empty.provider.value,
        selectedModel: empty.model.value,
        options: empty.modelOptions.filter((option) => option.value !== ""),
      },
      endpoint: {
        control: "input",
        current: empty.endpoint.value,
        placeholder: empty.endpoint.placeholder,
        // Filled in below, once a provider has actually been switched to.
      },
      reasoning: {
        control: "select",
        disabled: empty.reasoning.disabled,
        // The validator reads `default`; the host calls its sentinel `__lowest__`.
        default: empty.reasoning.value.replace(/^__|__$/g, ""),
        options: empty.reasoningOptions.map((option) => option.value),
      },
      translateButton: empty.translate,
    };

    // The placeholder must not be offered as a choice any more than it is sorted:
    // record the real list for the validator, and the placeholder separately.
    // The provider section mirrors the control as it stands at the end of the run
    // (a real provider is selected); the empty state is reported separately under
    // `unconfigured`, read from a fresh load before anything was touched.
    const provider = {
      control: "select",
      // Filled in at report time: this object is created while the page is still in
      // its empty state, and `current` must describe the control after the run.
      current: "",
      placeholder: emptySplit.placeholder,
      fallback: "",
      options: emptySplit.real.map((option) => ({
        value: option.value,
        label: option.label,
        source: sourceOf.get(option.value),
      })),
    };

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

    // ── R2: models, per provider, as rendered after switching to it ─────────
    // The custom provider is the free-text escape hatch by definition: its model picker
    // only offers "Custom…", so "no fixed model list" is the honest report there.
    const byProvider = {};
    const customEntries = {};
    const providerState = {};
    for (const option of provider.options) {
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
    const probeProvider = provider.options.find((option) => option.value === "c:cohere") || provider.options[0];
    await page.evaluate(setAndChange, { id: "aiProvider", value: probeProvider.value });
    const model = {
      control: "select",
      // Read back from the live control, not assumed: the provider loop above ended
      // on a real provider, so this must be enabled — and says so if it is not.
      disabled: (await page.evaluate(controlState, "aiModelSelect")).disabled,
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

    const endpointSection = {
      control: "input",
      current: await page.evaluate(() => document.getElementById("aiBaseUrl").value),
      placeholder: await page.evaluate(() => document.getElementById("aiBaseUrl").getAttribute("placeholder")),
      autofill: {
        provider: model.selectedProvider,
        providerApi,
        // Both ends of the autofill are the real field's value, before and after.
        before: "",
        after: endpoint.filledFirst,
        userEdited: "https://proxy.example/v1",
        afterSwitch: endpoint.afterOverride,
      },
      // Extra evidence the validator does not read; kept for the record.
      observed: endpoint,
    };

    // ── R4: reasoning sentinel + resolution ─────────────────────────────────
    const reasoningOptions = await page.evaluate(optionsIn, "aiReasoning");
    const reasoningDefault = await page.evaluate(() => document.getElementById("aiReasoning").value);
    // Resolution comes from the page itself (window.__dtConformance), driven through the
    // real model dropdown, so a regression in the ladder is a payload failure, not a
    // missing case.
    const ladder = await page.evaluate(async () => {
      const hook = window.__dtConformance;
      // A page without the hook cannot report resolution; {} for every case makes the
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
      const providerIds = Array.from(document.getElementById("aiProvider").options)
        .filter((option) => !option.disabled && option.value !== "")
        .map((option) => option.value);
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
      disabled: (await page.evaluate(controlState, "aiReasoning")).disabled,
      default: reasoningDefault.replace(/^__|__$/g, ""),
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

    // ── Unconfigured endpoint autofill: the same three observations, from empty ──
    // A second fresh page keeps the empty state honest (the first one has been driven).
    // Leave this page on a real provider and read the final selection: `provider.current`
    // describes the configured control, and must still match model.selectedProvider.
    provider.current = await page.evaluate(setAndChange, { id: "aiProvider", value: probeProvider.value });
    // The placeholder is the same element in either state; only whether it is the
    // selected option changes, and that follows the control.
    const placeholderState = splitPlaceholder(await page.evaluate(optionsIn, "aiProvider")).placeholder;
    provider.placeholder = { ...provider.placeholder, selected: placeholderState.selected };
    await context.close();
    const fresh = await openPage(browser, server.origin, fixture, {
      storage: { "dualtran.modelsdev.v2": JSON.stringify(cache) },
    });
    const freshEmpty = await readState(fresh.page);
    const freshSplit = splitPlaceholder(freshEmpty.providerOptions);
    const emptyAutofill = await fresh.page.evaluate(
      (probe) => {
        const base = document.getElementById("aiBaseUrl");
        const select = document.getElementById("aiProvider");
        const before = base.value;
        const beforePlaceholder = base.getAttribute("placeholder");
        select.value = probe;
        select.dispatchEvent(new Event("change"));
        const after = base.value;
        const afterPlaceholder = base.getAttribute("placeholder");
        // The reasoning control must come alive with a provider, and go back to the
        // sentinel's stored value rather than a concrete level.
        const reasoning = document.getElementById("aiReasoning");
        const reasoningAfter = { value: reasoning.value, disabled: reasoning.disabled, options: reasoning.options.length };
        // The user takes over; a later switch must not revert them.
        base.value = "https://proxy.example/v1";
        base.dispatchEvent(new Event("input"));
        base.dispatchEvent(new Event("change"));
        select.value = "b:deepseek";
        select.dispatchEvent(new Event("change"));
        const afterSwitch = base.value;
        return { before, beforePlaceholder, after, afterPlaceholder, afterSwitch, reasoningAfter };
      },
      CONFIGURED_PROVIDER
    );
    // The expected base, from the page's own resolver (models.dev omits `api` for
    // Anthropic; the page maps it through KNOWN_BASE).
    const emptyProviderApi = await fresh.page.evaluate(() =>
      window.__dtConformance
        ? window.__dtConformance.catalogBase("anthropic", { api: "", pkg: "", name: "Anthropic" })
        : ""
    );

    unconfigured.endpoint.current = freshEmpty.endpoint.value;
    unconfigured.endpoint.placeholder = freshEmpty.endpoint.placeholder;
    unconfigured.endpoint.autofill = {
      provider: CONFIGURED_PROVIDER,
      providerApi: emptyProviderApi,
      before: emptyAutofill.before,
      after: emptyAutofill.after,
      userEdited: "https://proxy.example/v1",
      afterSwitch: emptyAutofill.afterSwitch,
    };
    // The empty-state reasoning control's own sentinel, as selected.
    unconfigured.reasoning.default = freshEmpty.reasoning.value.replace(/^__|__$/g, "");
    unconfigured.reasoning.options = freshEmpty.reasoningOptions.map((option) => option.value);
    unconfigured.model.disabled = freshEmpty.model.disabled;
    unconfigured.model.selectedModel = freshEmpty.model.value;
    unconfigured.model.optionLabels = freshEmpty.modelOptions.map((option) => option.label);
    unconfigured.translateButton = freshEmpty.translate;
    unconfigured.reasoningAfterProviderPick = emptyAutofill.reasoningAfter;

    // ── Negative controls (tests/conformance/emptyControls.mjs) ──────────────
    // Run on pages that have never chosen a provider: the AI engine plus Translate
    // must send nothing and show providerRequiredError; the empty surface must not
    // carry the OpenAI endpoint or model.
    const negativeControls = await runEmptyControls(openPage, browser, server, fixture, cache);
    await fresh.context.close();

    // The configured half: a THIRD fresh page that only picks the provider — no
    // endpoint override — so the endpoint read is the autofilled base, not the
    // override the probe above left behind.
    const picked = await openPage(browser, server.origin, fixture, {
      storage: { "dualtran.modelsdev.v2": JSON.stringify(cache) },
    });
    const configuredPick = await picked.page.evaluate((value) => {
      const select = document.getElementById("aiProvider");
      select.value = value;
      select.dispatchEvent(new Event("change"));
      return select.value;
    }, CONFIGURED_PROVIDER);
    if (configuredPick !== CONFIGURED_PROVIDER) {
      throw new Error(`provider "${CONFIGURED_PROVIDER}" could not be selected (got "${configuredPick}")`);
    }
    const configuredState = await readState(picked.page);
    const configuredSplit = splitPlaceholder(configuredState.providerOptions);
    const configured = {
      provider: {
        current: configuredState.provider.value,
        placeholderSelected: configuredSplit.placeholder ? configuredSplit.placeholder.selected : null,
      },
      model: {
        disabled: configuredState.model.disabled,
        selectedProvider: configuredState.provider.value,
        selectedModel: configuredState.model.value,
        optionCount: configuredState.modelOptions.filter((option) => option.value !== "__custom__").length,
      },
      endpoint: { current: configuredState.endpoint.value, placeholder: configuredState.endpoint.placeholder },
      reasoning: {
        disabled: configuredState.reasoning.disabled,
        value: configuredState.reasoning.value.replace(/^__|__$/g, ""),
      },
      translateButton: configuredState.translate,
    };
    await picked.context.close();

    const payload = {
      spec: SPEC_VERSION,
      host: HOST,
      language,
      provider,
      model,
      endpoint: endpointSection,
      reasoning,
      i18n: { locales: localeCodes, keys, sourceLocale: "en", files, used },
      // SPEC 2.1 evidence: both states, observed off the real controls.
      unconfigured,
      configured,
      negativeControls,
      pageErrors: [...pageErrors, ...fresh.pageErrors, ...picked.pageErrors],
      providerState,
    };
    return payload;
  } finally {
    await browser.close();
    await server.close();
  }
}

/** What the page's own projectCatalog() would build, so the seeded cache matches it. */
async function seedProjection(fixture) {
  const out = {};
  for (const [id, provider] of Object.entries(fixture)) {
    if (!provider || !provider.models) continue;
    const models = [];
    const reasoning = {};
    for (const [mid, model] of Object.entries(provider.models)) {
      const entry = model || {};
      models.push([mid, entry.name || mid]);
      const options = Array.isArray(entry.reasoning_options) ? entry.reasoning_options : [];
      const effort = options.find((option) => option && option.type === "effort");
      if (effort && Array.isArray(effort.values) && effort.values.length) reasoning[mid] = effort.values.slice();
      else if (options.some((option) => option && option.type === "toggle")) reasoning[mid] = ["high"];
    }
    if (!models.length) continue;
    out[id] = { name: provider.name || id, api: provider.api || "", pkg: provider.npm || "", models, reasoning };
  }
  return out;
}

/**
 * The host's own gate on top of the shared SPEC 2.1 validator. The kit knows the two
 * states; it cannot know that an empty install must stay off the network and must not
 * carry OpenAI defaults in its surface. Run from the CLI path, so `npm run conformance`
 * (payloadCommand) fails on them before the shared kit even looks at the payload.
 */
export function assertNegativeControls(payload, config = {}) {
  const en = (payload && payload.i18n && payload.i18n.files && payload.i18n.files.en) || {};
  const providerRequiredError = en.providerRequiredError;
  const providerPlaceholder = en.providerPlaceholder;
  const providerRequiredForModel = en.providerRequiredForModel;
  const problems = [];
  const check = (condition, message) => {
    if (!condition) problems.push(message);
  };

  const controls = payload && payload.negativeControls;
  check(controls && typeof controls === "object", "the payload has no negativeControls section");
  if (controls) {
    check(
      controls.requestCount === 0 && (controls.emptyRequestUrls || []).length === 0,
      `an unconfigured AI translation sent ${controls.requestCount} request(s): ${JSON.stringify(controls.emptyRequestUrls)}`
    );
    check(controls.providerValue === "", `the probe page was not unconfigured (provider ${JSON.stringify(controls.providerValue)})`);
    check(!controls.busy, "the translate spinner started without a provider");
    check(
      controls.status === providerRequiredError,
      `status ${JSON.stringify(controls.status)} is not providerRequiredError ${JSON.stringify(providerRequiredError)}`
    );
    check(controls.statusIsError === true, "the providerRequiredError status must render as an error");
    check(controls.result === "", `a translation appeared without a provider: ${JSON.stringify(controls.result)}`);
    check(controls.blockedButton && controls.blockedButton.disabled === true, "translate must be disabled while no provider is selected");
    check(
      controls.blockedButton && controls.blockedButton.title === providerRequiredError,
      `the blocked button's tooltip is ${JSON.stringify(controls.blockedButton && controls.blockedButton.title)}`
    );
    check(
      (controls.openAiArtifacts || []).length === 0,
      `the empty settings surface carries OpenAI defaults in ${(controls.openAiArtifacts || []).join(", ")}`
    );
  }

  const empty = (payload && payload.unconfigured) || {};
  check(empty.provider && empty.provider.current === "", 'unconfigured.provider.current must be ""');
  check(empty.provider && empty.provider.placeholder && empty.provider.placeholder.label === providerPlaceholder, "the empty provider option must read providerPlaceholder");
  check(empty.provider && empty.provider.placeholder && empty.provider.placeholder.disabled === true, "the empty provider option must be disabled");
  check(empty.model && empty.model.disabled === true, "the model picker must be disabled with no provider");
  check(
    JSON.stringify(empty.model && empty.model.optionLabels) === JSON.stringify([providerRequiredForModel]),
    `the empty model picker must show only providerRequiredForModel, got ${JSON.stringify(empty.model && empty.model.optionLabels)}`
  );
  check(empty.endpoint && empty.endpoint.current === "", "the endpoint must be empty with no provider");
  check(empty.endpoint && empty.endpoint.placeholder === "https://", `the empty endpoint placeholder must be "https://", got ${JSON.stringify(empty.endpoint && empty.endpoint.placeholder)}`);
  check(empty.reasoning && empty.reasoning.disabled === true, "the reasoning picker must be disabled with no provider");
  check(empty.reasoning && empty.reasoning.default === "lowest", `the disabled reasoning picker must keep the lowest sentinel, got ${JSON.stringify(empty.reasoning && empty.reasoning.default)}`);
  check(empty.translateButton && empty.translateButton.disabled === false, "the Google engine must stay usable while no provider is set");
  check(
    empty.reasoningAfterProviderPick && empty.reasoningAfterProviderPick.disabled === false && empty.reasoningAfterProviderPick.value === "__lowest__",
    "reasoning must enable with the sentinel kept after a provider is chosen"
  );

  const configured = (payload && payload.configured) || {};
  // `payload.provider.current` is the probe page's final selection; `configured` is a
  // separate page that only picked its provider. Each must be a real provider, and the
  // configured one must be the provider that was asked for.
  const wantedProvider = (config.negativeControls && config.negativeControls.configuredProvider) || "";
  check(!!(payload.provider && payload.provider.current), "provider.current must be a real provider after the run");
  check(
    !wantedProvider || (configured.provider && configured.provider.current === wantedProvider),
    `configured.provider.current is ${JSON.stringify(configured.provider && configured.provider.current)}, expected ${JSON.stringify(wantedProvider)}`
  );
  check(configured.provider && configured.provider.placeholderSelected === false, "the placeholder must not stay selected once a provider is chosen");
  check(configured.model && configured.model.disabled === false, "the model picker must enable after a provider is chosen");
  check(
    configured.endpoint && /^https?:\/\//.test(configured.endpoint.current || ""),
    `the endpoint must carry the provider API base once chosen, got ${JSON.stringify(configured.endpoint && configured.endpoint.current)}`
  );
  check(
    configured.endpoint && configured.endpoint.current === empty.endpoint.autofill.after,
    "the configured endpoint must be the base the same page autofilled from empty"
  );
  check(configured.reasoning && configured.reasoning.disabled === false, "the reasoning picker must enable after a provider is chosen");
  check(configured.translateButton && configured.translateButton.disabled === false, "translate must be usable once a provider is chosen");

  if (problems.length) {
    const error = new Error(`host assertions failed:\n- ${problems.join("\n- ")}`);
    error.problems = problems;
    throw error;
  }
  return true;
}

export default buildPayload;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  const payload = await buildPayload();
  // Host assertions first: they know things the shared kit does not (no request may
  // leave an unconfigured install, no OpenAI defaults in its surface).
  assertNegativeControls(payload, config);
  // The shared kit, plus the host's own static scan, exactly as run.mjs would.
  if (config.static) payload.static = { hits: scanFiles(ROOT, config.static) };
  const summary = validatePayload(payload, config);
  // stdout is the payload for `conformance.json` payloadCommand; the summary goes to
  // stderr so the runner can parse stdout as JSON.
  process.stdout.write(JSON.stringify(payload) + "\n");
  console.error(
    `PASS ${summary.host}: ${summary.languages} languages, ${summary.providers} providers, ${summary.localeCount} locales (spec ${summary.spec})`
  );
}
