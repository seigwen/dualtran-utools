import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Smoke test for the shipped preload entry: load preload.js exactly as uTools
 * would (CommonJS, globals for `utools` and `window`) and drive onPluginEnter.
 *
 * This is the test that catches a broken module path or a wiring regression in
 * the packaged plugin — the pure modules are covered separately, but only this
 * one proves they are actually connected to the enter event.
 */
const requireCjs = createRequire(import.meta.url);
const PRELOAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../preload.js");

function boot() {
  const posts = [];
  const listeners = [];
  const enters = [];
  globalThis.utools = { onPluginEnter: (callback) => enters.push(callback) };
  globalThis.window = {
    postMessage: (message) => posts.push(message),
    addEventListener: (type, handler) => listeners.push({ type, handler }),
  };
  delete requireCjs.cache[PRELOAD];
  requireCjs(PRELOAD);

  const emitToPreload = (message) =>
    listeners.filter((l) => l.type === "message").forEach((l) => l.handler({ data: message }));
  return {
    posts,
    enter: (action) => enters[0](action),
    ack: () => emitToPreload({ __dualtran: true, type: "ack" }),
    ready: () => emitToPreload({ __dualtran: true, type: "ready" }),
    inputs: () => posts.filter((p) => p.type === "input"),
  };
}

describe("preload.js wiring (as uTools loads it)", () => {
  it("registers a single enter handler and forwards over-entry text", () => {
    const app = boot();
    app.enter({ type: "over", payload: "serendipity" });
    expect(app.inputs()).toEqual([{ __dualtran: true, type: "input", text: "serendipity" }]);
    app.ack();
  });

  it("never forwards the keyword itself", () => {
    const app = boot();
    app.enter({ type: "text", payload: "dt" });
    expect(app.posts).toEqual([{ __dualtran: true, type: "focus" }]);
    app.ack();
  });

  it("forwards the arguments of `dt <text>`", () => {
    const app = boot();
    app.enter({ type: "text", payload: "dt hello world" });
    expect(app.inputs().at(-1)).toEqual({ __dualtran: true, type: "input", text: "hello world" });
    app.ack();
  });

  it("re-delivers a pending entry when the page reports ready", () => {
    const app = boot();
    app.enter({ type: "over", payload: "hello" });
    const before = app.inputs().length;
    app.ready();
    expect(app.inputs().length).toBe(before + 1);
    app.ack();
  });
});
