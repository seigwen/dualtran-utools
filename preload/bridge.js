"use strict";
/**
 * Host-agnostic translation bridge over @dualtran/core — the CommonJS port of
 * the Obsidian host's bridge (plan 63 B2). Everything is dependency-injected
 * ({ core, fetchImpl, getSettings }) so the unit suite runs against a stub
 * core with zero module mocking.
 */
function normalizeBlocks(blocks) {
  return blocks.map((block) => block.trim()).filter((block) => block.length > 0);
}

/**
 * Adapt Obsidian-style requestUrl() to the fetch surface the core expects.
 * (Kept for parity with the other hosts; the uTools preload uses nodeFetch
 * instead. throw:false keeps HTTP errors as data for the core to map.)
 */
function createRequestUrlFetch(requestUrl) {
  return async (url, init = {}) => {
    const res = await requestUrl({
      url,
      method: init.method || "GET",
      headers: init.headers,
      body: init.body,
      throw: false,
    });
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      statusText: "",
      text: async () => res.text,
    };
  };
}

function createBridge({ core, fetchImpl, getSettings }) {
  async function translateBlocksAi(blocks, settings) {
    const results = [];
    for (const content of blocks) {
      const targetLanguageName =
        (core.codeToLanguageNameInEnglish && core.codeToLanguageNameInEnglish(settings.targetLanguage)) ||
        settings.targetLanguage;
      const prompt = core.buildTranslationMessages({ content, targetLanguageName });
      // Message shape mirrors the extension's fetchSSE assembly so translation
      // quality matches the product.
      const messages = [
        { role: "system", content: prompt.system },
        { role: "user", content: "I understand. Please give me the text." },
        { role: "user", content },
      ];
      let text = "";
      const { totalChunks, streamError } = await core.streamChat({
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        messages,
        extra: settings.aiBaseUrl ? { baseURL: settings.aiBaseUrl } : {},
        store: null,
        onChunk: (chunk) => {
          text += chunk;
        },
      });
      if (streamError) {
        throw new Error(core.formatAiError(streamError).message);
      }
      if (totalChunks === 0) {
        throw new Error("No response from AI provider");
      }
      results.push(text);
    }
    return results;
  }

  return {
    /**
     * Translate a batch of text blocks. Google goes out as ONE batched request
     * (the core builds it); AI streams one request per block. Empty input
     * short-circuits without touching the engine.
     */
    async translateBlocks(blocks) {
      const normalized = normalizeBlocks(blocks);
      if (normalized.length === 0) {
        return [];
      }
      const settings = getSettings();
      if (settings.engine === "ai") {
        return translateBlocksAi(normalized, settings);
      }
      return core.translateGoogle({
        sourceArray: normalized,
        sourceLanguage: settings.sourceLanguage,
        targetLanguage: settings.targetLanguage,
        cache: null,
        fetchImpl,
      });
    },
  };
}

module.exports = { normalizeBlocks, createRequestUrlFetch, createBridge };
