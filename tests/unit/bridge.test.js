import { describe, expect, it, vi } from "vitest";
import { createBridge, normalizeBlocks } from "../../preload/bridge.js";

const googleSettings = {
  engine: "google",
  sourceLanguage: "auto",
  targetLanguage: "en",
  aiProvider: "openai",
  aiApiKey: "",
  aiModel: "",
  aiBaseUrl: "",
};

function makeCore(overrides = {}) {
  return {
    translateGoogle: vi.fn(async ({ sourceArray }) => sourceArray.map((t) => `T:${t}`)),
    streamChat: vi.fn(async () => ({ totalChunks: 0, streamError: null })),
    buildTranslationMessages: vi.fn(() => ({ system: "SYS", assistant: "ACK" })),
    codeToLanguageNameInEnglish: vi.fn((c) => (c === "en" ? "English" : c)),
    formatAiError: vi.fn((e) => ({ message: String((e && e.message) || e) })),
    ...overrides,
  };
}

describe("normalizeBlocks", () => {
  it("trims, drops empty entries and keeps order", () => {
    expect(normalizeBlocks(["  a  ", "", "   ", "b"])).toEqual(["a", "b"]);
  });
});

describe("createBridge — google engine", () => {
  it("delegates a normalized batch to core.translateGoogle with the injected fetch", async () => {
    const core = makeCore();
    const fetchImpl = vi.fn();
    const bridge = createBridge({ core, fetchImpl, getSettings: () => googleSettings });
    const out = await bridge.translateBlocks(["Hello", "  World  ", ""]);
    expect(out).toEqual(["T:Hello", "T:World"]);
    expect(core.translateGoogle).toHaveBeenCalledTimes(1);
    const arg = core.translateGoogle.mock.calls[0][0];
    expect(arg.sourceArray).toEqual(["Hello", "World"]);
    expect(arg.sourceLanguage).toBe("auto");
    expect(arg.targetLanguage).toBe("en");
    expect(arg.fetchImpl).toBe(fetchImpl);
    expect(arg.cache).toBeNull();
  });

  it("short-circuits empty input without calling the engine", async () => {
    const core = makeCore();
    const bridge = createBridge({ core, fetchImpl: null, getSettings: () => googleSettings });
    expect(await bridge.translateBlocks(["", "  "])).toEqual([]);
    expect(core.translateGoogle).not.toHaveBeenCalled();
  });

  it("propagates engine failures (no silent empty translation)", async () => {
    const core = makeCore({
      translateGoogle: vi.fn(async () => {
        throw new Error("Google translation failed: HTTP 429");
      }),
    });
    const bridge = createBridge({ core, fetchImpl: null, getSettings: () => googleSettings });
    await expect(bridge.translateBlocks(["Hello"])).rejects.toThrow("Google translation failed: HTTP 429");
  });
});

describe("createBridge — ai engine", () => {
  const aiSettings = {
    ...googleSettings,
    engine: "ai",
    aiProvider: "openai",
    aiApiKey: "k",
    aiModel: "gpt-test",
    aiBaseUrl: "https://proxy.example/v1",
  };

  it("streams one chat request per block and assembles the chunks", async () => {
    const core = makeCore({
      streamChat: vi.fn(async ({ onChunk }) => {
        onChunk("Hola ");
        onChunk("mundo");
        return { totalChunks: 2, streamError: null };
      }),
    });
    const bridge = createBridge({ core, fetchImpl: null, getSettings: () => aiSettings });
    expect(await bridge.translateBlocks(["Hello world"])).toEqual(["Hola mundo"]);
    const arg = core.streamChat.mock.calls[0][0];
    expect(arg.provider).toBe("openai");
    expect(arg.apiKey).toBe("k");
    expect(arg.model).toBe("gpt-test");
    expect(arg.extra).toEqual({ baseURL: "https://proxy.example/v1" });
    expect(arg.messages.map((m) => m.role)).toEqual(["system", "user", "user"]);
    expect(arg.messages[1].content).toBe("I understand. Please give me the text.");
    expect(arg.messages[2].content).toBe("Hello world");
  });

  it("throws the formatted provider error when the stream reports one", async () => {
    const core = makeCore({
      streamChat: vi.fn(async () => ({ totalChunks: 0, streamError: { statusCode: 401 } })),
      formatAiError: vi.fn(() => ({ message: "Invalid or missing API key" })),
    });
    const bridge = createBridge({ core, fetchImpl: null, getSettings: () => aiSettings });
    await expect(bridge.translateBlocks(["x"])).rejects.toThrow("Invalid or missing API key");
  });

  it("throws when the stream produced no chunks", async () => {
    const core = makeCore({ streamChat: vi.fn(async () => ({ totalChunks: 0, streamError: null })) });
    const bridge = createBridge({ core, fetchImpl: null, getSettings: () => aiSettings });
    await expect(bridge.translateBlocks(["x"])).rejects.toThrow(/No response from AI provider/);
  });

  it("omits extra when no base URL is configured", async () => {
    const core = makeCore({
      streamChat: vi.fn(async ({ onChunk }) => {
        onChunk("OK");
        return { totalChunks: 1, streamError: null };
      }),
    });
    const bridge = createBridge({ core, fetchImpl: null, getSettings: () => ({ ...aiSettings, aiBaseUrl: "" }) });
    await bridge.translateBlocks(["x"]);
    expect(core.streamChat.mock.calls[0][0].extra).toEqual({});
  });
});
