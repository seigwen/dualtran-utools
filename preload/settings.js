"use strict";
/**
 * Settings shape, defaults, sanitization and the utools.dbStorage adapter.
 * Plain CommonJS — the preload side must stay readable and unbundled (plan
 * 63 D5-A). No utools API is touched here beyond the injected dbStorage.
 */
const STORAGE_KEY = "dualtran-settings";

const DEFAULT_SETTINGS = Object.freeze({
  engine: "google",
  sourceLanguage: "auto",
  targetLanguage: "en",
  aiProvider: "openai",
  aiApiKey: "",
  aiModel: "",
  aiBaseUrl: "",
});

const STRING_KEYS = ["sourceLanguage", "targetLanguage", "aiProvider", "aiApiKey", "aiModel", "aiBaseUrl"];

function sanitizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const settings = { ...DEFAULT_SETTINGS };
  if (source.engine === "google" || source.engine === "ai") {
    settings.engine = source.engine;
  }
  for (const key of STRING_KEYS) {
    if (typeof source[key] === "string") {
      settings[key] = source[key];
    }
  }
  return settings;
}

function createStorageAdapter(dbStorage) {
  return {
    load() {
      return sanitizeSettings(dbStorage.getItem(STORAGE_KEY));
    },
    save(settings) {
      dbStorage.setItem(STORAGE_KEY, sanitizeSettings(settings));
    },
  };
}

module.exports = { STORAGE_KEY, DEFAULT_SETTINGS, sanitizeSettings, createStorageAdapter };
