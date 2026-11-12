#!/usr/bin/env node
/**
 * apply-locale-keys.mjs — write the SPEC 2.1 empty-state keys into every
 * `locales/<code>/messages.json`.
 *
 * Only the three keys named in tests/fixtures/newLocaleKeys.js are added (in the
 * English source order, so every catalogue keeps the same key order); existing
 * values — including the handwritten zh_CN/zh_TW catalogues — are never touched.
 * Re-running is a no-op.
 *
 *   node scripts/apply-locale-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEW_LOCALE_KEYS } from "../tests/fixtures/newLocaleKeys.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = path.join(ROOT, "locales");
const NEW_KEYS = ["providerPlaceholder", "providerRequiredForModel", "providerRequiredError"];

const en = JSON.parse(fs.readFileSync(path.join(LOCALES, "en", "messages.json"), "utf8"));
const order = Object.keys(en);

let changed = 0;
for (const entry of fs.readdirSync(LOCALES, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(LOCALES, entry.name, "messages.json");
  if (!fs.existsSync(file)) continue;
  const current = JSON.parse(fs.readFileSync(file, "utf8"));
  const strings = NEW_LOCALE_KEYS[entry.name];
  if (!strings) throw new Error(`no strings for locale "${entry.name}" in tests/fixtures/newLocaleKeys.js`);

  const merged = { ...current };
  for (const key of NEW_KEYS) {
    if (typeof current[key]?.message === "string" && current[key].message.trim()) continue;
    merged[key] = { message: strings[key] };
  }

  // Keep the catalogue's key order: English source order first, then any key the
  // locale still carries on its own (there are none today, but do not drop them).
  const ordered = {};
  for (const key of order) if (merged[key]) ordered[key] = merged[key];
  for (const key of Object.keys(merged)) if (!ordered[key]) ordered[key] = merged[key];

  const before = JSON.stringify(current);
  const after = JSON.stringify(ordered);
  if (before === after) continue;
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n");
  changed += 1;
  console.log(`✓ ${entry.name}`);
}
console.log(changed ? `${changed} locale(s) updated` : "all locales already carry the keys");
