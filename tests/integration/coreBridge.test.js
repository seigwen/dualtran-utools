import { describe, expect, it } from "vitest";
import { createBridge } from "../../preload/bridge.js";

describe("real @dualtran/core through the uTools bridge", () => {
  it("translates a batch with an injected fetch (no network)", async () => {
    const core = await import("../../dualtran-core/index.mjs");
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify([[["Bonjour le monde", "Hello world", null, null, 10]], null, "en"]),
      };
    };
    const bridge = createBridge({
      core,
      fetchImpl,
      getSettings: () => ({
        engine: "google",
        sourceLanguage: "auto",
        targetLanguage: "fr",
        aiProvider: "",
        aiApiKey: "",
        aiModel: "",
        aiBaseUrl: "",
      }),
    });
    const out = await bridge.translateBlocks(["Hello world"]);
    expect(out).toEqual(["Bonjour le monde"]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("translate.googleapis.com");
  });
});
