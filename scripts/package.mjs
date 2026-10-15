#!/usr/bin/env node
/**
 * package.mjs — assemble the distributable zip for uTools submission (plan 63 B3).
 *
 * Stages the plugin files, the staged core, and a RUNTIME-only node_modules
 * (npm packages exactly as published — unminified, readable; plan 63 D5-A),
 * then zips the result.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin.json"), "utf8"));
const STAGE = path.join(ROOT, ".package");
const OUT = path.join(ROOT, `dualtran-utools-${plugin.version}.zip`);

// 0. preconditions
for (const rel of ["dist/renderer.js", "dist/style.css", "dualtran-core/index.mjs"]) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    console.error(`[package] missing ${rel} — run "npm run build" and "node scripts/sync-core.mjs" first`);
    process.exit(1);
  }
}

// 1. stage the plugin files
fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
const copyDir = (rel, { skipMaps = false } = {}) => {
  const from = path.join(ROOT, rel);
  const to = path.join(STAGE, rel);
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skipMaps && entry.name.endsWith(".map")) continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
    } else {
      fs.copyFileSync(src, dst);
    }
  }
};
for (const rel of ["plugin.json", "index.html", "preload.js", "README.md", "LICENSE", "PRIVACY.md"]) {
  fs.copyFileSync(path.join(ROOT, rel), path.join(STAGE, rel));
}
fs.mkdirSync(path.join(STAGE, "docs"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "docs", "DEPENDENCIES.md"), path.join(STAGE, "docs", "DEPENDENCIES.md"));
copyDir("preload");
copyDir("dist");
copyDir("assets");
copyDir("dualtran-core", { skipMaps: true });

// 2. runtime-only node_modules (readable, as published)
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
fs.writeFileSync(
  path.join(STAGE, "package.json"),
  JSON.stringify({ name: "dualtran-utools-runtime", private: true, dependencies: pkg.dependencies }, null, 2) + "\n"
);
console.log("[package] installing runtime dependencies into the stage …");
execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--prefix", STAGE], { stdio: "inherit" });

// 3. zip it
fs.rmSync(OUT, { force: true });
execFileSync("zip", ["-rq", OUT, "."], { cwd: STAGE });
fs.rmSync(STAGE, { recursive: true, force: true });
const sizeMb = fs.statSync(OUT).size / (1024 * 1024);
console.log(`[package] ${path.basename(OUT)} — ${sizeMb.toFixed(1)} MB`);
