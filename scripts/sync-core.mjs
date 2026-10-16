#!/usr/bin/env node
/**
 * sync-core.mjs — stage @dualtran/core for the uTools plugin (plan 63 D5-A).
 *
 * Unlike the Obsidian host (which bundles), the uTools preload side must ship
 * READABLE, unbundled-by-us sources: this script stages the core's own
 * unminified esbuild output as a sibling directory of preload.js.
 *
 * CORE_REPO env overrides the default extension path.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE_REPO = process.env.CORE_REPO || "/root/DualTran-extension";
const STAGE = path.join(HOST_ROOT, "dualtran-core");

execFileSync("npm", ["run", "build:core"], { cwd: CORE_REPO, stdio: "inherit" });

const corePkg = JSON.parse(
  fs.readFileSync(path.join(CORE_REPO, "package.json"), "utf8").replace(/^\s*\/\/.*$/gm, "")
);
fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
for (const f of ["index.mjs"]) {
  fs.copyFileSync(path.join(CORE_REPO, "dist-core", f), path.join(STAGE, f));
}
for (const f of ["LICENSE", "PROVENANCE.md"]) {
  fs.copyFileSync(path.join(CORE_REPO, f), path.join(STAGE, f));
}
fs.writeFileSync(
  path.join(STAGE, "package.json"),
  JSON.stringify(
    {
      name: "dualtran",
      version: corePkg.version || "0.0.0",
      type: "module",
      main: "index.mjs",
      exports: { ".": "./index.mjs" },
      license: "MPL-2.0",
    },
    null,
    2
  ) + "\n"
);
console.log(`[sync-core] staged dualtran-core/ (index.mjs ${(fs.statSync(path.join(STAGE, "index.mjs")).size / 1024).toFixed(0)} KB, unminified)`);
