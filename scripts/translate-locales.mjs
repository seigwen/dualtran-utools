#!/usr/bin/env node
/**
 * translate-locales.mjs — fill `locales/<code>/messages.json` for every target
 * language.
 *
 * Two sources, in this order:
 *   1. the Chrome extension's own catalogue (same key name → reuse the shipped
 *      translation, so both products say the same thing);
 *   2. a local OpenAI-compatible model for the plugin-only keys
 *      (OLLAMA_BASE_URL, default http://127.0.0.1:11434/v1).
 *
 * Locales listed in HANDWRITTEN are never machine-translated.
 *
 *   node scripts/translate-locales.mjs [--only de,fr] [--force]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EN = path.join(ROOT, "locales", "en", "messages.json");
const EXT = process.env.EXT_LOCALES || path.resolve(ROOT, "..", "..", "DualTran-extension", "src", "_locales");
const MODEL = process.env.OLLAMA_MODEL || "deepseek-v4.1-flash:cloud";
const BASE = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(/\/+$/, "");

const LANGUAGES = {
  af: "Afrikaans", ar: "Arabic", ca: "Catalan", cs: "Czech", da: "Danish", de: "German",
  el: "Greek", es: "Spanish", fa: "Persian", fi: "Finnish", fr: "French", he: "Hebrew",
  hi: "Hindi", hr: "Croatian", hu: "Hungarian", is: "Icelandic", it: "Italian", ja: "Japanese",
  ko: "Korean", lv: "Latvian", nl: "Dutch", no: "Norwegian", pl: "Polish", pt_BR: "Brazilian Portuguese",
  pt_PT: "European Portuguese", ro: "Romanian", ru: "Russian", sl: "Slovenian", sr: "Serbian",
  sv: "Swedish", th: "Thai", tr: "Turkish", ug: "Uyghur", uk: "Ukrainian", vi: "Vietnamese",
  zh_CN: "Simplified Chinese", zh_TW: "Traditional Chinese",
};

const HANDWRITTEN = new Set(["zh_CN", "zh_TW"]);

const args = process.argv.slice(2);
const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;
const force = args.includes("--force");

const en = JSON.parse(fs.readFileSync(EN, "utf8"));
const enKeys = Object.keys(en);

function extensionCatalogue(code) {
  const file = path.join(EXT, code, "messages.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function translate(languageName, entries) {
  const payload = Object.fromEntries(entries.map((key) => [key, en[key].message]));
  const prompt = [
    `Translate these user-interface strings into ${languageName}.`,
    "Rules:",
    "- Output ONLY a JSON object with exactly the same keys.",
    "- Keep placeholders such as $COUNT$, $ERROR$, $STATUS$ unchanged.",
    "- Keep product names (Google, OpenAI, API, uTools, models.dev) untranslated.",
    "- Keep the literal 「翻译」 inside the strings unchanged — it is the label shown in uTools.",
    "- Match the tone of desktop software settings; no extra punctuation.",
    "",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      reasoning_effort: "none",
      messages: [
        { role: "system", content: "You are a careful software localizer. You answer with JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`model HTTP ${res.status}`);
  const data = await res.json();
  const text = ((data.choices || [])[0]?.message?.content || "").trim();
  const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(jsonText);
}

async function run() {
  const codes = Object.keys(LANGUAGES).filter((code) => (only ? only.has(code) : true));
  for (const code of codes) {
    const outFile = path.join(ROOT, "locales", code, "messages.json");
    if (fs.existsSync(outFile) && !force) {
      console.log(`- ${code}: exists, skipped (use --force)`);
      continue;
    }
    const ext = extensionCatalogue(code);
    const out = {};
    const missing = [];
    for (const key of enKeys) {
      if (ext[key] && ext[key].message) out[key] = { message: ext[key].message };
      else missing.push(key);
    }
    if (missing.length && HANDWRITTEN.has(code)) {
      outFile && fs.mkdirSync(path.dirname(outFile), { recursive: true });
      const merged = {};
      for (const key of enKeys) merged[key] = out[key] || { message: "" };
      fs.writeFileSync(outFile, JSON.stringify(merged, null, 2) + "\n");
      console.log(`! ${code}: handwritten — ${missing.length} keys left empty`);
      continue;
    }
    if (missing.length) {
      let translated = {};
      const chunks = [];
      for (let i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));
      for (const chunk of chunks) {
        let got = {};
        for (let attempt = 1; attempt <= 3 && Object.keys(got).length < chunk.length; attempt++) {
          try {
            got = { ...got, ...(await translate(LANGUAGES[code], chunk)) };
          } catch (error) {
            console.warn(`  ${code}: attempt ${attempt} failed — ${error.message}`);
          }
        }
        translated = { ...translated, ...got };
      }
      for (const key of missing) {
        const value = translated[key];
        out[key] = { message: typeof value === "string" && value.trim() ? value.trim() : en[key].message };
        if (!translated[key]) console.warn(`  ${code}: ${key} fell back to English`);
      }
    }
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const ordered = {};
    for (const key of enKeys) ordered[key] = out[key] || { message: en[key].message };
    fs.writeFileSync(outFile, JSON.stringify(ordered, null, 2) + "\n");
    console.log(`✓ ${code}: ${enKeys.length - missing.length} reused, ${missing.length} translated`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
