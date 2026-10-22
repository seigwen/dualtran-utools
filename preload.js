"use strict";
/**
 * DualTran for uTools — preload entry.
 *
 * Runs in the Node-enabled preload context and shares one window with the
 * renderer: the renderer calls window.__dualtran directly. ALL network work
 * lives on this side — the renderer's own fetch() would enforce CORS and the
 * translation providers send no CORS headers (see preload/nodeFetch.js).
 *
 * Settings deliberately never touch utools.dbStorage: in this uTools build a
 * dbStorage call destroys the renderer, which the store review saw as "the
 * plugin exits immediately". The renderer persists them in localStorage and
 * hands the current values to translate() on every call.
 */
const { createBridge } = require("./preload/bridge.js");
const { installNodeFetch } = require("./preload/nodeFetch.js");

// Node http/https based fetch — core and the AI SDK pick it up via globalThis.
installNodeFetch();

const DEFAULT_SETTINGS = { engine: "google", sourceLanguage: "auto", targetLanguage: "en" };
let settingsCache = { ...DEFAULT_SETTINGS };

let bridgePromise = null;
function getBridge() {
  if (!bridgePromise) {
    bridgePromise = import("./dualtran-core/index.mjs").then((core) =>
      createBridge({ core, fetchImpl: null, getSettings: () => ({ ...settingsCache }) })
    );
  }
  return bridgePromise;
}

let pendingInput = null;

window.__dualtran = {
  /** Translate one piece of text; `settings` comes from the page (localStorage). */
  async translate(text, settings) {
    if (settings && typeof settings === "object") {
      settingsCache = { ...settingsCache, ...settings };
    }
    const bridge = await getBridge();
    const [translated] = await bridge.translateBlocks([text]);
    return translated || "";
  },
  getSettings: () => ({ ...settingsCache }),
  saveSettings: (settings) => {
    settingsCache = { ...settingsCache, ...(settings || {}) };
    return { ...settingsCache };
  },
  copyText: (text) => utools.copyText(text),
  /** Hand the last selected-text payload to the renderer exactly once. */
  consumePendingInput() {
    const value = pendingInput;
    pendingInput = null;
    return value;
  },
};

// The plugin window is created at 0x0; ask uTools for a usable height on entry.
utools.onPluginEnter(({ type, payload }) => {
  if ((type === "text" || type === "over") && typeof payload === "string" && payload.trim()) {
    if (typeof window.__dualtranOnEnter === "function") {
      window.__dualtranOnEnter(payload.trim());
    } else {
      pendingInput = payload.trim();
    }
  }
});
