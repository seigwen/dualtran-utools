import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NEW_LOCALE_KEYS } from "../fixtures/newLocaleKeys.js";

/**
 * SPEC 2.1 R7: exactly these three keys are added to every locale, the source
 * strings are fixed, and no locale may ship an English copy of them by accident.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCALES = path.join(ROOT, "locales");
const KEYS = ["providerPlaceholder", "providerRequiredForModel", "providerRequiredError"];
const read = (code) => JSON.parse(fs.readFileSync(path.join(LOCALES, code, "messages.json"), "utf8"));
const codes = fs
  .readdirSync(LOCALES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(LOCALES, entry.name, "messages.json")))
  .map((entry) => entry.name);

describe("locale catalogues — empty-provider keys", () => {
  it("shields the documented locale count", () => {
    expect(codes.length).toBeGreaterThanOrEqual(38);
  });

  it("carries the English source strings verbatim", () => {
    const en = read("en");
    expect(en.providerPlaceholder.message).toBe("Select a provider");
    expect(en.providerRequiredForModel.message).toBe("Select a provider first");
    expect(en.providerRequiredError.message).toBe("Choose an AI provider in settings before translating.");
  });

  it("carries the handwritten Chinese strings", () => {
    const zh = read("zh_CN");
    expect(zh.providerPlaceholder.message).toBe("请选择 AI 提供商");
    expect(zh.providerRequiredForModel.message).toBe("请先选择提供商");
    expect(zh.providerRequiredError.message).toBe("翻译前请先在设置中选择 AI 提供商。");
  });

  it("adds exactly three keys, keeping every key order aligned", () => {
    const enKeys = Object.keys(read("en"));
    for (const code of codes) {
      const file = read(code);
      expect(Object.keys(file), `${code} key order`).toEqual(enKeys);
      for (const key of KEYS) {
        expect(typeof file[key]?.message, `${code}.${key}`).toBe("string");
        expect(file[key].message.trim(), `${code}.${key} is empty`).not.toBe("");
      }
    }
  });

  it("uses the pinned translation for every shipped locale", () => {
    expect(Object.keys(NEW_LOCALE_KEYS).sort()).toEqual(codes.slice().sort());
    for (const code of codes) {
      for (const key of KEYS) {
        // No locale may quietly fall back to the English sentence.
        if (code !== "en") {
          expect(read(code)[key].message, `${code}.${key} still English`).not.toBe(read("en")[key].message);
        }
      }
    }
  });

  it("keeps placeholders identical to the source", () => {
    const tokens = (text) => new Set([...String(text).matchAll(/\$([A-Z0-9_]+)\$/g)].map((match) => match[1]));
    for (const code of codes) {
      for (const key of KEYS) {
        expect(tokens(read(code)[key].message), `${code}.${key}`).toEqual(tokens(read("en")[key].message));
      }
    }
  });
});
