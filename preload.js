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

let bridgePromise = null;
function getBridge() {
  if (!bridgePromise) {
    bridgePromise = import("./dualtran-core/index.mjs").then((core) =>
      createBridge({ core, fetchImpl: null, getSettings: () => storage.load() })
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
  getSettings: () => storage.load(),
  saveSettings: (settings) => storage.save(settings),
  copyText: (text) => utools.copyText(text),
  /** Hand the last selected-text payload to the renderer exactly once. */
  consumePendingInput() {
    const value = pendingInput;
    pendingInput = null;
    return value;
  },
};

utools.onPluginEnter(({ type, payload }) => {
  if ((type === "text" || type === "over") && typeof payload === "string" && payload.trim()) {
    if (typeof window.__dualtranOnEnter === "function") {
      window.__dualtranOnEnter(payload.trim());
    } else {
      pendingInput = payload.trim();
    }
  }
});
