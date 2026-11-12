import { describe, expect, it, vi } from "vitest";
import { createBridge } from "../../preload/bridge.js";

/**
 * SPEC 2.1 R2/R6: an unconfigured install has no AI provider. A translation
 * request must refuse with the localized `providerRequiredError` and must not
 * reach the network — no `|| "openai"` / custom fallback on any request path.
 */
const PROVIDER_REQUIRED_ERROR = "Choose an AI provider in settings before translating.";

function makeCore() {
  return {
    translateGoogle: vi.fn(async ({ sourceArray }) => sourceArray.map((t) => `T:${t}`)),
    streamChat: vi.fn(async ({ onChunk }) => {
      onChunk("OK");
      return { totalChunks: 1, streamError: null };
    }),
    buildTranslationMessages: vi.fn(() => ({ system: "SYS", assistant: "ACK" })),
    codeToLanguageNameInEnglish: vi.fn((c) => c),
    formatAiError: vi.fn((e) => ({ message: String((e && e.message) || e) })),
  };
}

const aiSettings = {
  engine: "ai",
  sourceLanguage: "auto",
  targetLanguage: "en",
  aiProvider: "",
  aiApiKey: "k",
  // Even a fully specified endpoint/model/key must not stand in for a provider:
  // the user has not chosen one, so nothing may be sent.
  aiModel: "gpt-test",
  aiBaseUrl: "https://proxy.example/v1",
};

describe("createBridge — no AI provider configured (SPEC 2.1)", () => {
  it("rejects with the providerRequiredError message", async () => {
    const bridge = createBridge({
      core: makeCore(),
      fetchImpl: vi.fn(),
      getSettings: () => ({ ...aiSettings }),
      providerRequiredError: PROVIDER_REQUIRED_ERROR,
    });
    await expect(bridge.translateBlocks(["Hello"])).rejects.toThrow(PROVIDER_REQUIRED_ERROR);
  });

  it("sends no network request and never calls the AI engine", async () => {
    const core = makeCore();
    const fetchImpl = vi.fn();
    const bridge = createBridge({
      core,
      fetchImpl,
      getSettings: () => ({ ...aiSettings }),
      providerRequiredError: PROVIDER_REQUIRED_ERROR,
    });
    await bridge.translateBlocks(["Hello", "World"]).catch(() => {});
    expect(core.streamChat).not.toHaveBeenCalled();
    expect(core.translateGoogle).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only provider as unconfigured", async () => {
    const core = makeCore();
    const bridge = createBridge({
      core,
      fetchImpl: vi.fn(),
      getSettings: () => ({ ...aiSettings, aiProvider: "   " }),
      providerRequiredError: PROVIDER_REQUIRED_ERROR,
    });
    await expect(bridge.translateBlocks(["Hello"])).rejects.toThrow(PROVIDER_REQUIRED_ERROR);
    expect(core.streamChat).not.toHaveBeenCalled();
  });

  it("still translates on the Google engine while no provider is configured", async () => {
    const core = makeCore();
    const bridge = createBridge({
      core,
      fetchImpl: vi.fn(),
      getSettings: () => ({ ...aiSettings, engine: "google", aiProvider: "" }),
      providerRequiredError: PROVIDER_REQUIRED_ERROR,
    });
    expect(await bridge.translateBlocks(["Hello"])).toEqual(["T:Hello"]);
  });

  it("does not fall back to openai or the custom provider for a configured request", async () => {
    const core = makeCore();
    const bridge = createBridge({
      core,
      fetchImpl: vi.fn(),
      getSettings: () => ({ ...aiSettings, aiProvider: "anthropic" }),
      providerRequiredError: PROVIDER_REQUIRED_ERROR,
    });
    await bridge.translateBlocks(["Hello"]);
    expect(core.streamChat).toHaveBeenCalledTimes(1);
    expect(core.streamChat.mock.calls[0][0].provider).toBe("anthropic");
  });
});
