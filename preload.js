"use strict";
/**
 * DualTran for uTools — preload entry (plan 63 B2).
 *
 * Runs in the Node-enabled preload context and shares one window with the
 * renderer: the renderer calls window.__dualtran directly. ALL network work
 * lives on this side — the renderer's own fetch() would enforce CORS and the
 * translation providers send no CORS headers (see preload/nodeFetch.js).
 */
const { createBridge } = require("./preload/bridge.js");
const { createStorageAdapter } = require("./preload/settings.js");
const { installNodeFetch } = require("./preload/nodeFetch.js");

// Node http/https based fetch — core and the AI SDK pick it up via globalThis.
installNodeFetch();

const storage = createStorageAdapter(utools.dbStorage);

/**
 * uTools 6.x destroys the renderer when utools.dbStorage is touched from a call
 * that originates in the page (window.__dualtran.getSettings() -> dbStorage.getItem).
 * Keep a plain in-memory copy and only touch dbStorage from this context, off the
 * page's call stack (a timer), so the renderer never dies on a settings read.
 */
const DEFAULT_SETTINGS = { engine: "google", sourceLanguage: "auto", targetLanguage: "en" };
let settingsCache = { ...DEFAULT_SETTINGS };
setTimeout(() => {
  try { settingsCache = storage.load(); } catch (e) { /* keep defaults */ }
}, 0);

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
  /** Translate a single piece of text with the configured engine. */
  async translate(text) {
    const bridge = await getBridge();
    const [translated] = await bridge.translateBlocks([text]);
    return translated || "";
  },
  getSettings: () => ({ ...settingsCache }),
  saveSettings: (settings) => {
    settingsCache = { ...settingsCache, ...(settings || {}) };
    const snapshot = { ...settingsCache };
    setTimeout(() => { try { storage.save(snapshot); } catch (e) { /* ignore */ } }, 0);
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
  try { utools.setExpendHeight(620); } catch (e) { /* older uTools */ }
  if ((type === "text" || type === "over") && typeof payload === "string" && payload.trim()) {
    if (typeof window.__dualtranOnEnter === "function") {
      window.__dualtranOnEnter(payload.trim());
    } else {
      pendingInput = payload.trim();
    }
  }
});
