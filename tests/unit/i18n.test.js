import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const DtI18n = requireCjs("../../src/i18n.js");

const CATALOGUES = ["en", "zh_CN", "zh_TW", "de", "pt_BR", "pt_PT", "ja"];

describe("normalizeTag", () => {
  it("maps regional tags onto the catalogue codes we ship", () => {
    expect(DtI18n.normalizeTag("zh-CN")).toBe("zh_CN");
    expect(DtI18n.normalizeTag("zh-Hans-CN")).toBe("zh_CN");
    expect(DtI18n.normalizeTag("zh-TW")).toBe("zh_TW");
    expect(DtI18n.normalizeTag("zh-Hant-HK")).toBe("zh_TW");
    expect(DtI18n.normalizeTag("pt-BR")).toBe("pt_BR");
    expect(DtI18n.normalizeTag("pt")).toBe("pt_PT");
    expect(DtI18n.normalizeTag("nb-NO")).toBe("no");
    expect(DtI18n.normalizeTag("sr-Latn-RS")).toBe("sr");
    expect(DtI18n.normalizeTag("DE-at")).toBe("de");
  });

  it("survives junk input", () => {
    expect(DtI18n.normalizeTag("")).toBe("");
    expect(DtI18n.normalizeTag(null)).toBe("");
    expect(DtI18n.normalizeTag(undefined)).toBe("");
  });
});

describe("detectLocale", () => {
  it("prefers an exact catalogue match", () => {
    expect(DtI18n.detectLocale("zh-CN", CATALOGUES)).toBe("zh_CN");
    expect(DtI18n.detectLocale("pt-BR", CATALOGUES)).toBe("pt_BR");
  });

  it("falls back to the base language, then English", () => {
    expect(DtI18n.detectLocale("de-AT", CATALOGUES)).toBe("de");
    expect(DtI18n.detectLocale("fr-CA", CATALOGUES)).toBe("en"); // fr not shipped here
    expect(DtI18n.detectLocale("xx-YY", CATALOGUES)).toBe("en");
    expect(DtI18n.detectLocale("", CATALOGUES)).toBe("en");
  });

  it("uses the first catalogue when English is somehow absent", () => {
    expect(DtI18n.detectLocale("de-DE", ["de", "ja"])).toBe("de");
  });
});

describe("create()", () => {
  const locales = {
    en: { hello: { message: "Hello" }, many: { message: "$COUNT$ providers" } },
    de: { hello: { message: "Hallo" } },
  };

  it("translates and falls back per key", () => {
    const { code, t } = DtI18n.create(locales, "de-DE");
    expect(code).toBe("de");
    expect(t("hello")).toBe("Hallo");
    expect(t("many", { COUNT: 7 })).toBe("7 providers"); // missing in de → English
    expect(t("nope")).toBe("nope");
  });

  it("substitutes only known placeholders", () => {
    const { t } = DtI18n.create(locales, "en");
    expect(t("many", { COUNT: 3 })).toBe("3 providers");
    expect(t("many", { OTHER: 3 })).toBe("$COUNT$ providers");
    expect(t("many")).toBe("$COUNT$ providers");
  });
});

describe("apply()", () => {
  function node(attrs) {
    return {
      attrs: { ...attrs },
      textContent: "",
      getAttribute(name) {
        return this.attrs[name] ?? null;
      },
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
    };
  }

  it("fills text, placeholders and titles", () => {
    const text = node({ "data-i18n": "hello" });
    const input = node({ "data-i18n-placeholder": "hello" });
    const select = node({ "data-i18n-title": "hello" });
    const root = {
      querySelectorAll(selector) {
        if (selector === "[data-i18n]") return [text];
        if (selector === "[data-i18n-placeholder]") return [input];
        if (selector === "[data-i18n-title]") return [select];
        return [];
      },
    };
    const { t } = DtI18n.create({ en: { hello: { message: "Hello" } } }, "en");
    DtI18n.apply(root, t);
    expect(text.textContent).toBe("Hello");
    expect(input.attrs.placeholder).toBe("Hello");
    expect(select.attrs.title).toBe("Hello");
  });

  it("ignores a missing root", () => {
    expect(() => DtI18n.apply(null, () => "x")).not.toThrow();
  });
});
