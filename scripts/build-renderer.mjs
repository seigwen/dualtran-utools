#!/usr/bin/env node
/**
 * build-renderer.mjs — bundle the renderer layer (src/renderer → dist/).
 * The renderer is the uTools-allowed-to-be-bundled side (plan 63 D5).
 */
import esbuild from "esbuild";
import fs from "node:fs";

await esbuild.build({
  entryPoints: ["src/renderer/app.js"],
  outfile: "dist/renderer.js",
  bundle: true,
  format: "iife",
  target: "es2018",
  minify: true,
  logLevel: "info",
});

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("src/renderer/style.css", "dist/style.css");
console.log("[build-renderer] dist/renderer.js + dist/style.css ready");
