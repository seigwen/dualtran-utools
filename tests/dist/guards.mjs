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
