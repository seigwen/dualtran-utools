import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, createStorageAdapter, sanitizeSettings } from "../../preload/settings.js";

describe("sanitizeSettings", () => {
  it("returns defaults for absent or malformed input", () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial data over the defaults", () => {
    const s = sanitizeSettings({ engine: "ai", aiApiKey: "k" });
    expect(s.engine).toBe("ai");
    expect(s.aiApiKey).toBe("k");
    expect(s.targetLanguage).toBe(DEFAULT_SETTINGS.targetLanguage);
  });

  it("rejects an unknown engine value", () => {
    expect(sanitizeSettings({ engine: "yandex" }).engine).toBe(DEFAULT_SETTINGS.engine);
  });

  it("coerces non-string string fields back to defaults", () => {
    expect(sanitizeSettings({ targetLanguage: 42 }).targetLanguage).toBe(DEFAULT_SETTINGS.targetLanguage);
  });
});

describe("createStorageAdapter (utools.dbStorage shape)", () => {
  function fakeDbStorage() {
    const map = new Map();
    return {
      getItem: (key) => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => map.set(key, value),
    };
  }

  it("round-trips settings through the storage", () => {
    const storage = createStorageAdapter(fakeDbStorage());
    expect(storage.load()).toEqual(DEFAULT_SETTINGS);
    storage.save({ ...DEFAULT_SETTINGS, engine: "ai", aiModel: "m1" });
    expect(storage.load().engine).toBe("ai");
    expect(storage.load().aiModel).toBe("m1");
  });

  it("sanitizes what it loads back", () => {
    const db = fakeDbStorage();
    db.setItem("dualtran-settings", { engine: "bogus", targetLanguage: 7 });
    const storage = createStorageAdapter(db);
    expect(storage.load()).toEqual(DEFAULT_SETTINGS);
  });

  it("sanitizes what it saves", () => {
    const db = fakeDbStorage();
    const storage = createStorageAdapter(db);
    storage.save({ engine: "nope" });
    expect(db.getItem("dualtran-settings").engine).toBe(DEFAULT_SETTINGS.engine);
  });
});
