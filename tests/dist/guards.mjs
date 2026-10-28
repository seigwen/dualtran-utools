#!/usr/bin/env node
/**
 * Dist guards (plan 63 B3). Run AFTER `npm run build` + `node scripts/sync-core.mjs`:
 *   node tests/dist/guards.mjs
 * Checks the uTools plugin contract (plugin.json schema + referenced files),
 * the built renderer, the staged core, and the preload-side readability rule
 * (unbundled, unminified, every line readable).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin.json"), "utf8"));

// plugin.json contract
for (const key of ["pluginName", "description", "author", "version", "logo", "main", "preload", "features"]) {
  assert.ok(plugin[key], `plugin.json is missing "${key}"`);
}
assert.match(plugin.version, /^\d+\.\d+\.\d+$/, "plugin.json version must be plain semver");
assert.ok(Array.isArray(plugin.features) && plugin.features.length > 0, "at least one feature is required");
assert.ok(plugin.features[0].code, "feature code is required");
assert.ok(
  Array.isArray(plugin.features[0].cmds) && plugin.features[0].cmds.includes("tr"),
  'the primary feature must keep the "tr" keyword'
);

// Selected text only reaches a plugin through a 匹配指令 (over/regex). Without one
// uTools can never hand the selection over — the plugin then silently ignores it
// (the 0.1.3 regression this guard pins).
const overCommand = (plugin.features[0].cmds || []).find(
  (cmd) => cmd && typeof cmd === "object" && cmd.type === "over"
);
assert.ok(
  overCommand,
  'the primary feature must declare an "over" 匹配指令 — uTools carries selected text to nothing else'
);
assert.ok(String(overCommand.label || "").trim().length > 0, "the over command needs a label");
assert.ok(
  Number.isInteger(overCommand.minLength) && overCommand.minLength >= 1,
  "the over command needs minLength >= 1"
);
assert.ok(
  Number.isInteger(overCommand.maxLength) && overCommand.maxLength > overCommand.minLength,
  "the over command needs a maxLength above minLength"
);

// i18n: every shipped locale carries every key of the English catalogue, and only
// Chinese may contain CJK — the uTools panel label 「翻译」 is a UI literal that is
// deliberately identical everywhere.
const LOCALES = path.join(ROOT, "locales");
const enCatalogue = JSON.parse(fs.readFileSync(path.join(LOCALES, "en", "messages.json"), "utf8"));
const enKeys = Object.keys(enCatalogue);
assert.ok(enKeys.length >= 30, `the English catalogue looks too small (${enKeys.length} keys)`);
const localeCodes = fs
  .readdirSync(LOCALES)
  .filter((code) => fs.existsSync(path.join(LOCALES, code, "messages.json")));
assert.ok(localeCodes.length >= 30, `expected dozens of locales, got ${localeCodes.length}`);
for (const code of localeCodes) {
  const catalogue = JSON.parse(fs.readFileSync(path.join(LOCALES, code, "messages.json"), "utf8"));
  assert.deepEqual(Object.keys(catalogue), enKeys, `${code}: keys/order must match locales/en`);
  for (const key of enKeys) {
    const value = catalogue[key] && catalogue[key].message;
    assert.ok(typeof value === "string" && value.trim().length > 0, `${code}: "${key}" is missing or empty`);
  }
  // Japanese legitimately uses kanji; Chinese is the source language. Every other
  // catalogue must be free of Chinese once the uTools panel label is removed.
  if (!code.startsWith("zh") && !code.startsWith("ja")) {
    const withoutLabel = JSON.stringify(catalogue).replace(/「翻译」/g, "");
    assert.ok(!/[\u4e00-\u9fff]/.test(withoutLabel), `${code}: contains untranslated Chinese`);
  }
}
const i18nBundlePath = path.join(ROOT, "dist", "i18n.js");
assert.ok(fs.existsSync(i18nBundlePath), "missing dist/i18n.js — run npm run build");
const i18nBundle = fs.readFileSync(i18nBundlePath, "utf8");
for (const code of localeCodes) assert.ok(i18nBundle.includes(`"${code}":`), `dist/i18n.js is missing ${code}`);

// referenced files exist
for (const rel of [plugin.logo, plugin.main, plugin.preload, "dist/renderer.js", "dist/style.css", "dualtran-core/index.mjs"]) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel} — run build / sync-core first`);
}

// preload-side readability rule: unbundled, unminified, every line readable
const preloadFiles = ["preload.js", ...fs.readdirSync(path.join(ROOT, "preload")).map((f) => path.join("preload", f))];
for (const rel of preloadFiles) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.ok(src.trim().length > 0, `${rel} is empty`);
  for (const line of src.split("\n")) {
    assert.ok(line.length <= 400, `${rel} has an over-long line (${line.length} chars) — preload code must be readable`);
  }
  assert.ok(!/sourceMappingURL/.test(src), `${rel} must not reference a source map`);
}
const coreSrc = fs.readFileSync(path.join(ROOT, "dualtran-core", "index.mjs"), "utf8");
assert.ok(coreSrc.split("\n").length > 1000, "dualtran-core/index.mjs does not look like the unminified esbuild output");
assert.ok(!/@license|Minified/.test(coreSrc.split("\n")[0] || ""), "dualtran-core/index.mjs looks minified");

console.log(
  `[guards] PASS — plugin ${plugin.pluginName}@${plugin.version}, ${preloadFiles.length} readable preload files, core staged (${(coreSrc.length / 1024).toFixed(0)} KB unminified)`
);
