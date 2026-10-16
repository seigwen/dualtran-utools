// src/core/providers/types.js
var VALID_RESPONSE_FORMATS = ["openai-sse", "openai-json", "anthropic-sse", "gemini-json"];
var VALID_AUTH_TYPES = ["bearer", "api-key-header", "query-param"];
var VALID_SOURCES = ["built-in", "remote", "user"];
var VALID_CATEGORIES = ["global", "china", "opensource", "enterprise"];
var REQUIRED_FIELDS = [
  "id",
  "name",
  "website",
  "apiKeyUrl",
  "apiBase",
  "auth",
  "responseFormat",
  "supportsStreaming",
  "source",
  "category"
];
function validateProviderDefinition(def) {
  const errors = [];
  if (!def || typeof def !== "object") {
    return ["Provider definition must be an object"];
  }
  for (const field of REQUIRED_FIELDS) {
    if (def[field] === void 0 || def[field] === null) {
      if ((field === "website" || field === "apiKeyUrl") && def.source === "user" && def[field] === "") {
        continue;
      }
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (typeof def.id !== "string" || !def.id.trim()) {
    errors.push("id must be a non-empty string");
  }
  if (typeof def.name !== "string" || !def.name.trim()) {
    errors.push("name must be a non-empty string");
  }
  if (typeof def.apiBase !== "string" || !def.apiBase.trim()) {
    errors.push("apiBase must be a non-empty string");
  }
  if (def.auth && typeof def.auth === "object") {
    if (!VALID_AUTH_TYPES.includes(def.auth.type)) {
      errors.push(`auth.type must be one of: ${VALID_AUTH_TYPES.join(", ")}`);
    }
    if (!def.auth.header && def.auth.type !== "query-param") {
      errors.push("auth.header is required for bearer and api-key-header types");
    }
  } else {
    errors.push("auth must be an object with at least `type` and `header`");
  }
  if (!VALID_RESPONSE_FORMATS.includes(def.responseFormat)) {
    errors.push(`responseFormat must be one of: ${VALID_RESPONSE_FORMATS.join(", ")}`);
  }
  if (typeof def.supportsStreaming !== "boolean") {
    errors.push("supportsStreaming must be a boolean");
  }
  if (!VALID_SOURCES.includes(def.source)) {
    errors.push(`source must be one of: ${VALID_SOURCES.join(", ")}`);
  }
  if (!VALID_CATEGORIES.includes(def.category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }
  if (def.modelListUrl !== null && def.modelListUrl !== void 0 && typeof def.modelListUrl !== "string") {
    errors.push("modelListUrl must be a string or null");
  }
  if (def.extraHeaders !== void 0 && (typeof def.extraHeaders !== "object" || def.extraHeaders === null)) {
    errors.push("extraHeaders must be an object if provided");
  }
  if (def.tags !== void 0 && !Array.isArray(def.tags)) {
    errors.push("tags must be an array if provided");
  }
  return errors;
}

// src/core/providers/registry.js
var BUILT_IN_PROVIDERS = Object.freeze([
  // ── Global (7) ──
  {
    id: "openai",
    name: "OpenAI",
    website: "https://openai.com",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    shortDesc: "GPT, O-series models",
    apiBase: "https://api.openai.com/v1/chat/completions",
    modelListUrl: "https://api.openai.com/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id", filter: "/^(gpt|chatgpt|o\\d|omni)/i" },
    source: "built-in",
    category: "global",
    tags: ["gpt", "chatgpt"]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    website: "https://anthropic.com",
    apiKeyUrl: "https://console.anthropic.com/keys",
    shortDesc: "Claude models",
    apiBase: "https://api.anthropic.com/v1/messages",
    modelListUrl: "https://api.anthropic.com/v1/models",
    auth: { type: "api-key-header", header: "x-api-key" },
    responseFormat: "anthropic-sse",
    supportsStreaming: true,
    extraHeaders: { "anthropic-version": "2023-06-01" },
    modelListParser: { path: "models", valueKey: "name", labelKey: "name" },
    source: "built-in",
    category: "global",
    tags: ["claude"]
  },
  {
    id: "google-gemini",
    name: "Google Gemini",
    website: "https://ai.google.dev",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    shortDesc: "Gemini models",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    modelListUrl: null,
    auth: { type: "query-param", header: "", queryParam: "key" },
    responseFormat: "gemini-json",
    supportsStreaming: false,
    modelListParser: { path: "models", valueKey: "name", labelKey: "displayName" },
    source: "built-in",
    category: "global",
    tags: ["gemini"]
  },
  {
    id: "mistral",
    name: "Mistral AI",
    website: "https://mistral.ai",
    apiKeyUrl: "https://console.mistral.ai/api-keys",
    shortDesc: "Mistral Large, Codestral, open-weight models",
    apiBase: "https://api.mistral.ai/v1/chat/completions",
    modelListUrl: "https://api.mistral.ai/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["french", "opensource"]
  },
  {
    id: "cohere",
    name: "Cohere",
    website: "https://cohere.com",
    apiKeyUrl: "https://dashboard.cohere.com/api-keys",
    shortDesc: "Command R, Aya multilingual models",
    apiBase: "https://api.cohere.com/v2/chat",
    modelListUrl: "https://api.cohere.com/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-json",
    supportsStreaming: false,
    modelListParser: { path: "models", valueKey: "name", labelKey: "name" },
    source: "built-in",
    category: "global",
    tags: ["enterprise"]
  },
  {
    id: "together",
    name: "Together AI",
    website: "https://together.ai",
    apiKeyUrl: "https://api.together.ai/settings/api-keys",
    shortDesc: "Open-source models at scale",
    apiBase: "https://api.together.xyz/v1/chat/completions",
    modelListUrl: "https://api.together.xyz/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["opensource"]
  },
  {
    id: "groq",
    name: "Groq",
    website: "https://groq.com",
    apiKeyUrl: "https://console.groq.com/keys",
    shortDesc: "Ultra-fast LPU inference",
    apiBase: "https://api.groq.com/openai/v1/chat/completions",
    modelListUrl: "https://api.groq.com/openai/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["fast"]
  },
  // ── Aggregator (1) ──
  {
    id: "openrouter",
    name: "OpenRouter",
    website: "https://openrouter.ai",
    apiKeyUrl: "https://openrouter.ai/keys",
    shortDesc: "300+ models across providers, unified API",
    apiBase: "https://openrouter.ai/api/v1/chat/completions",
    modelListUrl: "https://openrouter.ai/api/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    extraHeaders: {},
    modelListParser: { path: "data", valueKey: "id", labelKey: "name" },
    source: "built-in",
    category: "global",
    tags: ["aggregator", "multi-provider"]
  },
  // ── Enterprise (1) ──
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    website: "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
    apiKeyUrl: "https://portal.azure.com",
    shortDesc: "Enterprise-grade OpenAI models on Azure",
    apiBase: "",
    modelListUrl: null,
    auth: { type: "api-key-header", header: "api-key" },
    responseFormat: "openai-json",
    supportsStreaming: false,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "enterprise",
    tags: ["microsoft", "enterprise"]
  },
  // ── China (7) ──
  {
    id: "deepseek",
    name: "DeepSeek",
    website: "https://deepseek.com",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    shortDesc: "DeepSeek-Chat, DeepSeek-Reasoner",
    apiBase: "https://api.deepseek.com/v1/chat/completions",
    modelListUrl: "https://api.deepseek.com/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "china",
    tags: ["chinese", "reasoning"]
  },
  {
    id: "zhipu",
    name: "\u667A\u8C31AI (Zhipu/GLM)",
    website: "https://open.bigmodel.cn",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    shortDesc: "GLM-4, ChatGLM series",
    apiBase: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    modelListUrl: "https://open.bigmodel.cn/api/paas/v4/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "china",
    tags: ["chinese", "glm"]
  },
  {
    id: "moonshot",
    name: "\u6708\u4E4B\u6697\u9762 (Moonshot/Kimi)",
    website: "https://moonshot.cn",
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
    shortDesc: "Kimi long-context models",
    apiBase: "https://api.moonshot.cn/v1/chat/completions",
    modelListUrl: "https://api.moonshot.cn/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "china",
    tags: ["chinese", "long-context"]
  },
  {
    id: "qwen",
    name: "\u963F\u91CC\u901A\u4E49\u5343\u95EE (Qwen/DashScope)",
    website: "https://tongyi.aliyun.com",
    apiKeyUrl: "https://bailian.console.aliyun.com/#/api-key",
    shortDesc: "Qwen series, Tongyi Qianwen",
    apiBase: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    modelListUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "china",
    tags: ["chinese", "alibaba"]
  },
  {
    id: "baidu",
    name: "\u767E\u5EA6\u6587\u5FC3 (Baidu/ERNIE)",
    website: "https://yiyan.baidu.com",
    apiKeyUrl: "https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application",
    shortDesc: "ERNIE Bot, Qianfan platform",
    apiBase: "https://qianfan.baidubce.com/v2/chat/completions",
    modelListUrl: "https://qianfan.baidubce.com/v2/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "result", valueKey: "model", labelKey: "modelName" },
    source: "built-in",
    category: "china",
    tags: ["chinese", "baidu"]
  },
  {
    id: "bytedance",
    name: "\u5B57\u8282\u8C46\u5305 (ByteDance/Doubao)",
    website: "https://www.volcengine.com/product/doubao",
    apiKeyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    shortDesc: "Doubao models on Volcano Engine Ark",
    apiBase: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    modelListUrl: "https://ark.cn-beijing.volces.com/api/v3/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "china",
    tags: ["chinese", "bytedance"]
  },
  {
    id: "iflytek",
    name: "\u8BAF\u98DE\u661F\u706B (iFlytek Spark)",
    website: "https://xinghuo.xfyun.cn",
    apiKeyUrl: "https://console.xfyun.cn/services/bm3",
    shortDesc: "Spark series models",
    apiBase: "https://spark-api-open.xf-yun.com/v1/chat/completions",
    modelListUrl: "https://spark-api-open.xf-yun.com/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "china",
    tags: ["chinese", "iflytek"]
  },
  // ── Research/Search (2) ──
  {
    id: "perplexity",
    name: "Perplexity",
    website: "https://perplexity.ai",
    apiKeyUrl: "https://www.perplexity.ai/settings/api",
    shortDesc: "Search-augmented AI models",
    apiBase: "https://api.perplexity.ai/chat/completions",
    modelListUrl: "https://api.perplexity.ai/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["search"]
  },
  {
    id: "grok",
    name: "xAI (Grok)",
    website: "https://x.ai",
    apiKeyUrl: "https://console.x.ai",
    shortDesc: "Grok models by xAI",
    apiBase: "https://api.x.ai/v1/chat/completions",
    modelListUrl: "https://api.x.ai/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["grok", "xai"]
  },
  // ── Additional providers with known endpoints (not in models.dev) ──
  {
    id: "deepinfra",
    name: "Deep Infra",
    website: "https://deepinfra.com",
    apiKeyUrl: "https://deepinfra.com/dash/api_keys",
    shortDesc: "Serverless ML inference",
    apiBase: "https://api.deepinfra.com/v1/openai/chat/completions",
    modelListUrl: "https://api.deepinfra.com/v1/openai/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["serverless"]
  },
  {
    id: "cerebras",
    name: "Cerebras",
    website: "https://cerebras.ai",
    apiKeyUrl: "https://cloud.cerebras.ai",
    shortDesc: "Wafer-scale AI inference",
    apiBase: "https://api.cerebras.ai/v1/chat/completions",
    modelListUrl: "https://api.cerebras.ai/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["wafer-scale"]
  },
  {
    id: "vercel",
    name: "Vercel AI Gateway",
    website: "https://vercel.com",
    apiKeyUrl: "https://vercel.com/account/tokens",
    shortDesc: "Vercel AI Gateway",
    apiBase: "https://api.vercel.ai/v1/chat/completions",
    modelListUrl: "https://api.vercel.ai/v1/models",
    auth: { type: "bearer", header: "Authorization", prefix: "Bearer " },
    responseFormat: "openai-sse",
    supportsStreaming: true,
    modelListParser: { path: "data", valueKey: "id", labelKey: "id" },
    source: "built-in",
    category: "global",
    tags: ["gateway"]
  }
]);
function mergeRegistries(builtIn, remote, user, hiddenIds = /* @__PURE__ */ new Set()) {
  const map = /* @__PURE__ */ new Map();
  for (const def of builtIn) {
    map.set(def.id, { ...def });
  }
  for (const def of remote) {
    const existing = map.get(def.id);
    if (existing) {
      const mutableFields = [
        "name",
        "website",
        "apiKeyUrl",
        "shortDesc",
        "apiBase",
        "modelListUrl",
        "auth",
        "responseFormat",
        "supportsStreaming",
        "modelListParser",
        "extraHeaders",
        "category",
        "tags"
      ];
      for (const field of mutableFields) {
        if (def[field] !== void 0) {
          existing[field] = def[field];
        }
      }
    } else {
      map.set(def.id, { ...def, source: "remote" });
    }
  }
  for (const def of user) {
    map.set(def.id, { ...def, source: def.source || "user" });
  }
  return [...map.values()].filter((p) => !hiddenIds.has(p.id));
}
function createProviderRegistry(builtIn = BUILT_IN_PROVIDERS) {
  let _merged = [...builtIn];
  let _hiddenIds = /* @__PURE__ */ new Set();
  function listProviders(opts = {}) {
    let results = [..._merged];
    if (opts.search) {
      const q = opts.search.toLowerCase();
      results = results.filter((p) => {
        const haystack = [p.name, p.shortDesc || "", p.id, ...p.tags || []].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    if (opts.category) {
      results = results.filter((p) => p.category === opts.category);
    }
    return results;
  }
  function getProvider(id) {
    return _merged.find((p) => p.id === id);
  }
  return {
    listProviders,
    getProvider,
    _updateMerged(builtIn2, remote, user, hiddenIds) {
      _merged = mergeRegistries(builtIn2, remote, user, hiddenIds);
      _hiddenIds = hiddenIds || /* @__PURE__ */ new Set();
    },
    _getMerged() {
      return _merged;
    }
  };
}
var INTERNAL_TO_MODELSDEV = Object.freeze({
  openai: "openai",
  anthropic: "anthropic",
  "google-gemini": "google",
  deepseek: "deepseek",
  grok: "xai",
  zhipu: "zhipuai",
  moonshot: "moonshotai",
  mistral: "mistral",
  cohere: "cohere",
  groq: "groq",
  together: "togetherai",
  qwen: "alibaba-cn",
  perplexity: "perplexity",
  "azure-openai": "azure"
});
var _modelsDevToInternal = Object.freeze(
  Object.fromEntries(
    Object.entries(INTERNAL_TO_MODELSDEV).map(([internal, dev]) => [dev, internal])
  )
);
function resolveModelsDevId(id) {
  return INTERNAL_TO_MODELSDEV[id] || id;
}
var _staticRegistry = createProviderRegistry(BUILT_IN_PROVIDERS);
function lookupKnownApiBase(id) {
  let def = _staticRegistry.getProvider(id);
  if (def?.apiBase) return def.apiBase;
  const internalId = _modelsDevToInternal[id];
  if (internalId) {
    def = _staticRegistry.getProvider(internalId);
    if (def?.apiBase) return def.apiBase;
  }
  return "";
}

// src/core/providers/migration.js
function migrateProviderConfig(config) {
  if (config.get("registryMigrated")) {
    return null;
  }
  const activeProviderId = config.get("aiProvider") || "openai";
  const providers = {};
  const openaiKey = (config.get("apiKeyOpenAI") || "").trim();
  if (openaiKey) {
    providers.openai = {
      apiKey: openaiKey,
      model: config.get("openAiModel") || "gpt-3.5-turbo"
    };
  }
  const geminiKey = (config.get("apiKeyGoogleGemini") || "").trim();
  if (geminiKey) {
    providers["google-gemini"] = {
      apiKey: geminiKey,
      model: config.get("googleGeminiModel") || "models/gemini-1.5-flash"
    };
  }
  const anthropicKey = (config.get("apiKeyAnthropic") || "").trim();
  if (anthropicKey) {
    providers.anthropic = {
      apiKey: anthropicKey,
      model: config.get("anthropicModel") || "claude-3-haiku-20240307"
    };
  }
  const azureKey = (config.get("apiKeyAzureOpenAI") || "").trim();
  if (azureKey) {
    providers["azure-openai"] = {
      apiKey: azureKey,
      endpoint: (config.get("azureOpenAIEndpoint") || "").trim(),
      model: config.get("azureOpenAIModel") || ""
    };
  }
  const deepseekKey = (config.get("apiKeyDeepSeek") || "").trim();
  if (deepseekKey) {
    providers.deepseek = {
      apiKey: deepseekKey,
      model: config.get("deepSeekModel") || "deepseek-chat"
    };
  }
  const grokKey = (config.get("apiKeyGrok") || "").trim();
  if (grokKey) {
    providers.grok = {
      apiKey: grokKey,
      model: config.get("grokModel") || "grok-beta"
    };
  }
  const openrouterKey = (config.get("apiKeyOpenRouter") || "").trim();
  if (openrouterKey) {
    providers.openrouter = {
      apiKey: openrouterKey,
      model: (config.get("openRouterModel") || "openai/gpt-4o-mini").trim(),
      apiBase: (config.get("openRouterApiBase") || "").trim(),
      referer: (config.get("openRouterReferer") || "").trim(),
      title: (config.get("openRouterTitle") || "").trim()
    };
  }
  config.set("activeProviderId", activeProviderId);
  config.set("providerConfigs", providers);
  config.set("registryMigrated", "true");
  return { activeProviderId, providers };
}

// src/core/providers/modelPreview.js
var MODELSDEV_API_URL = "https://models.dev/api.json";
var STATIC_MODELS = Object.freeze({
  openai: [
    { value: "gpt-4o", text: "GPT-4o" },
    { value: "gpt-4o-mini", text: "GPT-4o Mini" },
    { value: "gpt-4-turbo", text: "GPT-4 Turbo" },
    { value: "gpt-4", text: "GPT-4" },
    { value: "gpt-3.5-turbo", text: "GPT-3.5 Turbo" },
    { value: "o4-mini", text: "o4 Mini" },
    { value: "o3-mini", text: "o3 Mini" },
    { value: "o1", text: "o1" },
    { value: "o1-mini", text: "o1 Mini" }
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", text: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", text: "Claude Opus 4" },
    { value: "claude-haiku-3-5-20241022", text: "Claude 3.5 Haiku" },
    { value: "claude-3-5-sonnet-20241022", text: "Claude 3.5 Sonnet" },
    { value: "claude-3-opus-20240229", text: "Claude 3 Opus" }
  ],
  "google-gemini": [
    { value: "gemini-2.5-flash", text: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", text: "Gemini 2.5 Pro" },
    { value: "gemini-2.0-flash", text: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-flash", text: "Gemini 1.5 Flash" },
    { value: "gemini-1.5-pro", text: "Gemini 1.5 Pro" }
  ],
  deepseek: [
    { value: "deepseek-chat", text: "DeepSeek Chat (V3)" },
    { value: "deepseek-reasoner", text: "DeepSeek Reasoner (R1)" }
  ],
  grok: [
    { value: "grok-3", text: "Grok 3" },
    { value: "grok-3-mini", text: "Grok 3 Mini" },
    { value: "grok-2", text: "Grok 2" }
  ],
  zhipu: [
    { value: "glm-4-plus", text: "GLM-4 Plus" },
    { value: "glm-4-flash", text: "GLM-4 Flash" },
    { value: "glm-4-air", text: "GLM-4 Air" },
    { value: "glm-4-long", text: "GLM-4 Long (1M)" }
  ],
  moonshot: [
    { value: "moonshot-v1-8k", text: "Moonshot V1 8K" },
    { value: "moonshot-v1-32k", text: "Moonshot V1 32K" },
    { value: "moonshot-v1-128k", text: "Moonshot V1 128K" }
  ],
  mistral: [
    { value: "mistral-large-latest", text: "Mistral Large" },
    { value: "mistral-small-latest", text: "Mistral Small" },
    { value: "mistral-medium-latest", text: "Mistral Medium" },
    { value: "codestral-latest", text: "Codestral" }
  ],
  cohere: [
    { value: "command-r-plus", text: "Command R Plus" },
    { value: "command-r", text: "Command R" },
    { value: "command", text: "Command" }
  ],
  together: [
    { value: "mistralai/Mixtral-8x7B-Instruct-v0.1", text: "Mixtral 8x7B" },
    { value: "meta-llama/Llama-3-70b-chat-hf", text: "Llama 3 70B" },
    { value: "meta-llama/Llama-3-8b-chat-hf", text: "Llama 3 8B" }
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", text: "Llama 3.3 70B" },
    { value: "llama-3.1-8b-instant", text: "Llama 3.1 8B" },
    { value: "mixtral-8x7b-32768", text: "Mixtral 8x7B" }
  ],
  qwen: [
    { value: "qwen-max", text: "Qwen Max" },
    { value: "qwen-plus", text: "Qwen Plus" },
    { value: "qwen-turbo", text: "Qwen Turbo" },
    { value: "qwen2.5-72b-instruct", text: "Qwen 2.5 72B" }
  ],
  baidu: [
    { value: "ernie-4.0-turbo-8k", text: "ERNIE 4.0 Turbo" },
    { value: "ernie-3.5-8k", text: "ERNIE 3.5" },
    { value: "ernie-speed-8k", text: "ERNIE Speed" }
  ],
  bytedance: [
    { value: "doubao-pro-32k", text: "\u8C46\u5305 Pro 32K" },
    { value: "doubao-lite-32k", text: "\u8C46\u5305 Lite 32K" },
    { value: "doubao-pro-128k", text: "\u8C46\u5305 Pro 128K" }
  ],
  iflytek: [
    { value: "spark-lite", text: "Spark Lite" },
    { value: "spark-pro", text: "Spark Pro" },
    { value: "spark-max", text: "Spark Max" },
    { value: "spark-4.0-ultra", text: "Spark 4.0 Ultra" }
  ],
  perplexity: [
    { value: "sonar-small-chat", text: "Sonar Small" },
    { value: "sonar-medium-chat", text: "Sonar Medium" },
    { value: "sonar-small-online", text: "Sonar Small Online" }
  ],
  "azure-openai": [
    { value: "gpt-4o", text: "GPT-4o" },
    { value: "gpt-4o-mini", text: "GPT-4o Mini" },
    { value: "gpt-4", text: "GPT-4" },
    { value: "gpt-3.5-turbo", text: "GPT-3.5 Turbo" }
  ]
});
var ALL_PROVIDERS = Object.keys(STATIC_MODELS);
var CACHE_KEY_PREFIX = "previewModels:v4:";
var PERSISTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var _modelsDevCache = null;
var _modelsDevFetchTime = 0;
var MEMORY_CACHE_TTL_MS = 5 * 60 * 1e3;
var _backgroundRefreshPromise = null;
function cacheKey(provider) {
  return CACHE_KEY_PREFIX + provider;
}
async function readCache(provider, storage) {
  if (!storage) return null;
  try {
    const key = cacheKey(provider);
    const result = await storage.get(key);
    const entry = result[key];
    if (entry && Array.isArray(entry.models) && entry.models.length) {
      return entry;
    }
  } catch (_) {
  }
  return null;
}
async function writeCache(provider, models, storage) {
  if (!storage) return;
  try {
    const key = cacheKey(provider);
    await storage.set({
      [key]: { models, ts: Date.now() }
    });
  } catch (_) {
  }
}
function isCacheFresh(entry) {
  if (!entry?.ts) return false;
  return Date.now() - entry.ts < PERSISTENT_CACHE_TTL_MS;
}
async function fetchModelsDevData(fetcher = globalThis.fetch) {
  const now = Date.now();
  if (_modelsDevCache && now - _modelsDevFetchTime < MEMORY_CACHE_TTL_MS) {
    return _modelsDevCache;
  }
  const response = await fetcher(MODELSDEV_API_URL);
  if (!response.ok) {
    throw new Error(`models.dev unavailable (HTTP ${response.status})`);
  }
  const payload = await response.json();
  _modelsDevCache = payload;
  _modelsDevFetchTime = now;
  return payload;
}
function extractModelsFromDevData(provider, data) {
  const modelsDevId = INTERNAL_TO_MODELSDEV[provider] || provider;
  const providerData = data[modelsDevId];
  if (!providerData || !providerData.models) return [];
  const seen = /* @__PURE__ */ new Set();
  const models = [];
  for (const [modelId, modelInfo] of Object.entries(providerData.models)) {
    if (!modelId || seen.has(modelId)) continue;
    seen.add(modelId);
    const name = modelInfo.name || modelId;
    const pricing = modelInfo.pricing;
    models.push({
      value: modelId,
      text: name,
      ...pricing ? { pricing: { prompt: String(pricing.input || "0"), completion: String(pricing.output || "0") } } : {}
    });
  }
  models.sort((a, b) => a.text.localeCompare(b.text));
  return models;
}
async function fetchAndCacheAll(fetcher, storage) {
  const data = await fetchModelsDevData(fetcher);
  const grouped = {};
  for (const provider of ALL_PROVIDERS) {
    const models = extractModelsFromDevData(provider, data);
    if (models.length) {
      grouped[provider] = models;
      await writeCache(provider, models, storage);
    }
  }
  return grouped;
}
function backgroundRefresh(fetcher, storage) {
  if (_backgroundRefreshPromise) return;
  _backgroundRefreshPromise = fetchAndCacheAll(fetcher, storage).catch(() => {
  }).finally(() => {
    _backgroundRefreshPromise = null;
  });
}
var PROVIDER_PRIORITY = Object.freeze({
  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "o4-mini",
    "o3-mini",
    "o1-mini",
    "o1"
  ],
  anthropic: [
    "claude-haiku-3-5-20241022",
    "claude-sonnet-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-opus-4-20250514",
    "claude-3-opus-20240229"
  ],
  "google-gemini": [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro"
  ],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  grok: ["grok-3-mini", "grok-3", "grok-2"],
  "azure-openai": ["gpt-4o-mini", "gpt-4o", "gpt-4", "gpt-3.5-turbo"]
});
function scoreModelByName(text) {
  const lower = String(text || "").toLowerCase();
  let score = 0;
  for (const kw of ["mini", "flash", "haiku", "lite", "nano", "small", "turbo", "air"]) {
    if (lower.includes(kw)) score += 5;
  }
  for (const kw of ["pro", "opus", "ultra", "max", "preview", "legacy", "experimental"]) {
    if (lower.includes(kw)) score -= 3;
  }
  const verMatch = lower.match(/(\d+(?:\.\d+)*)/g);
  if (verMatch) {
    const nums = verMatch.map((v) => parseFloat(v) || 0);
    score += Math.max(...nums) * 2;
  }
  return score;
}
function getSmartDefaultModel({ provider, models }) {
  if (!Array.isArray(models) || !models.length) return null;
  const withPricing = models.filter((m) => m?.pricing?.prompt && m?.pricing?.completion);
  if (withPricing.length) {
    const cheapest = withPricing.reduce((best, cur) => {
      const curTotal = parseFloat(cur.pricing.prompt) + parseFloat(cur.pricing.completion);
      const bestTotal = parseFloat(best.pricing.prompt) + parseFloat(best.pricing.completion);
      return curTotal < bestTotal ? cur : best;
    });
    if (cheapest) return cheapest.value;
  }
  const scored = models.map((m) => ({ ...m, _score: scoreModelByName(m.text || m.value) })).filter((m) => m._score > 0).sort((a, b) => b._score - a._score);
  if (scored.length) return scored[0].value;
  const priority = PROVIDER_PRIORITY[provider] || [];
  for (const preferred of priority) {
    if (models.some((m) => m.value === preferred)) return preferred;
  }
  return null;
}
async function loadPreviewModels({ provider, fetcher = globalThis.fetch, storage = null }) {
  const cached = await readCache(provider, storage);
  if (cached?.models?.length) {
    if (!isCacheFresh(cached)) {
      backgroundRefresh(fetcher, storage);
    }
    return cached.models;
  }
  try {
    const data = await fetchModelsDevData(fetcher);
    const models = extractModelsFromDevData(provider, data);
    if (models.length) {
      writeCache(provider, models, storage);
      return models;
    }
  } catch (_) {
  }
  return [...STATIC_MODELS[provider] || []];
}
function getPreviewProviders() {
  return ALL_PROVIDERS;
}

// src/core/providers/reasoningDepth.js
var REASONING_DEFAULT = "";
var EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "default"];
var EFFORT_LABELS = {
  none: "None",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
  max: "Max",
  // `default` is a real Groq value (provider default) — it must not be
  // confused with the "do not send" option, so it carries a distinct label.
  default: "Default (provider)"
};
var EFFORT_LABEL_KEYS = {
  none: "msgReasoningDepthNone",
  minimal: "msgReasoningDepthMinimal",
  low: "msgReasoningDepthLow",
  medium: "msgReasoningDepthMedium",
  high: "msgReasoningDepthHigh",
  xhigh: "msgReasoningDepthXHigh",
  max: "msgReasoningDepthMax",
  default: "msgReasoningDepthProviderDefault"
};
var DIALECTS = Object.freeze({
  openai: { key: "openai", accepts: null, style: "reasoningEffort" },
  azure: { key: "azure", accepts: null, style: "reasoningEffort" },
  anthropic: { key: "anthropic", accepts: ["low", "medium", "high", "xhigh", "max"], style: "effort" },
  google: { key: "google", accepts: ["minimal", "low", "medium", "high"], style: "thinkingLevel" },
  xai: { key: "xai", accepts: ["none", "low", "medium", "high"], style: "reasoningEffort" },
  groq: { key: "groq", accepts: ["none", "low", "medium", "high", "default"], style: "reasoningEffort" },
  mistral: { key: "mistral", accepts: ["none", "high"], style: "reasoningEffort" },
  deepseek: { key: "deepseek", accepts: ["low", "medium", "high", "xhigh", "max"], style: "reasoningEffort" },
  cohere: { key: "cohere", accepts: ["none", "high"], style: "cohereThinking" },
  perplexity: { key: "perplexity", accepts: null, style: "reasoningEffort" },
  togetherai: { key: "togetherai", accepts: null, style: "reasoningEffort" },
  deepinfra: { key: "deepinfra", accepts: null, style: "reasoningEffort" },
  "openai-compatible": { key: "openaiCompatible", accepts: null, style: "reasoningEffort" }
});
var NPM_TO_DIALECT = Object.freeze({
  "@ai-sdk/openai": "openai",
  "@ai-sdk/azure": "azure",
  "@ai-sdk/anthropic": "anthropic",
  "@ai-sdk/google": "google",
  "@ai-sdk/xai": "xai",
  "@ai-sdk/groq": "groq",
  "@ai-sdk/mistral": "mistral",
  "@ai-sdk/deepseek": "deepseek",
  "@ai-sdk/cohere": "cohere",
  "@ai-sdk/perplexity": "perplexity",
  "@ai-sdk/togetherai": "togetherai",
  "@ai-sdk/deepinfra": "deepinfra"
});
var DIALECT_SDK_NPM_PACKAGES = Object.freeze(Object.keys(NPM_TO_DIALECT).sort());
function resolveDialect({ provider, npm } = {}) {
  if (provider === "azure" || provider === "azure-openai") return "azure";
  return NPM_TO_DIALECT[npm] || "openai-compatible";
}
function _accepts(dialectName, value) {
  const dialect = DIALECTS[dialectName] || DIALECTS["openai-compatible"];
  if (!dialect.accepts) return true;
  return dialect.accepts.includes(value);
}
function buildReasoningDepthOptions({ provider, npm, reasoningOptions, translate = (_key, fallback) => fallback } = {}) {
  const dialectName = resolveDialect({ provider, npm });
  const options = [{ value: REASONING_DEFAULT, label: translate("msgDefault", "Default") }];
  const declared = Array.isArray(reasoningOptions) ? reasoningOptions.filter(Boolean) : [];
  const effort = declared.find((o) => o.type === "effort");
  const declaredValues = Array.isArray(effort?.values) ? effort.values : [];
  let candidates;
  if (declaredValues.length) {
    const seen = /* @__PURE__ */ new Set();
    candidates = declaredValues.filter((v) => {
      if (typeof v !== "string" || !v || seen.has(v)) return false;
      if (!_accepts(dialectName, v)) return false;
      seen.add(v);
      return true;
    });
    candidates.sort((a, b) => {
      const ai = EFFORT_ORDER.indexOf(a);
      const bi = EFFORT_ORDER.indexOf(b);
      return (ai === -1 ? EFFORT_ORDER.length : ai) - (bi === -1 ? EFFORT_ORDER.length : bi);
    });
  } else if (declared.some((o) => o.type === "toggle")) {
    candidates = _accepts(dialectName, "high") ? ["high"] : [];
  } else {
    candidates = [];
  }
  for (const value of candidates) {
    const labelKey = EFFORT_LABEL_KEYS[value];
    options.push({
      value,
      label: labelKey ? translate(labelKey, EFFORT_LABELS[value] || value) : value
    });
  }
  return options;
}
function buildProviderOptions({ provider, npm, depth } = {}) {
  if (!depth) return null;
  const dialectName = resolveDialect({ provider, npm });
  if (!_accepts(dialectName, depth)) {
    return null;
  }
  const dialect = DIALECTS[dialectName];
  switch (dialect.style) {
    case "effort":
      return { [dialect.key]: { effort: depth } };
    case "thinkingLevel":
      return { [dialect.key]: { thinkingConfig: { thinkingLevel: depth } } };
    case "cohereThinking":
      return { [dialect.key]: { thinking: { type: depth === "none" ? "disabled" : "enabled" } } };
    default:
      return { [dialect.key]: { reasoningEffort: depth } };
  }
}

// src/core/providers/settings.js
function resolveConfigValues({ providerId, providerConfigs = {}, legacyModel = void 0 }) {
  const config = providerConfigs?.[providerId] || {};
  const apiKeyFromConfig = config.apiKey || "";
  let model = config.model || "";
  if (!model && legacyModel !== void 0) {
    model = (legacyModel || "").trim();
  }
  const userApiBase = (config.apiBase || "").trim();
  const isUserCustom = !!userApiBase;
  const reasoningDepth = config.reasoningDepth || "";
  return { apiKeyFromConfig, model, userApiBase, isUserCustom, reasoningDepth };
}
function computeEffectiveBaseURL({ providerId, providerDef, userApiBase = "" }) {
  const isUserCustom = !!userApiBase;
  let effectiveBaseURL = "";
  if (isUserCustom) {
    effectiveBaseURL = userApiBase.replace(/\/(chat\/completions|messages)\/?$/, "").replace(/\/+$/, "");
    const url = new URL(effectiveBaseURL);
    const hasPath = url.pathname !== "/" && url.pathname !== "";
    if (!hasPath) {
      const isGoogle = providerId === "google-gemini" || providerId === "google" || providerDef?.responseFormat === "gemini-json";
      effectiveBaseURL += isGoogle ? "/v1beta" : "/v1";
    }
  } else if (providerDef?.apiBase) {
    if (providerId === "google-gemini" || providerDef?.responseFormat === "gemini-json") {
      effectiveBaseURL = providerDef.apiBase;
    } else {
      effectiveBaseURL = new URL(providerDef.apiBase).origin + "/v1";
    }
  }
  return effectiveBaseURL;
}
function computeExtraBaseURL({ providerId, providerDef, isUserCustom, effectiveBaseURL }) {
  if (!effectiveBaseURL) return null;
  if (isUserCustom) return effectiveBaseURL;
  if (providerDef?.responseFormat === "openai-sse" || providerDef?.responseFormat === "openai-json") {
    return effectiveBaseURL;
  }
  if (["anthropic", "deepseek", "grok"].includes(providerId)) {
    return effectiveBaseURL;
  }
  return null;
}
function resolveOpenRouterOverrides({ model, openRouterApiBase = "", extraBaseURL, providerDefApiBase }) {
  let nextModel = model;
  let baseURL = null;
  if (openRouterApiBase) {
    baseURL = openRouterApiBase;
  } else if (!extraBaseURL && providerDefApiBase) {
    baseURL = providerDefApiBase;
  }
  if (nextModel) {
    nextModel = nextModel.replace(/^openrouter\//i, "");
  }
  if (!nextModel) nextModel = "openai/gpt-4o-mini";
  return { model: nextModel, baseURL };
}

// src/core/chat/sdkMap.js
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createXai } from "@ai-sdk/xai";
import { createAzure } from "@ai-sdk/azure";
import { createMistral } from "@ai-sdk/mistral";
import { createCohere } from "@ai-sdk/cohere";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createGroq } from "@ai-sdk/groq";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createDeepInfra } from "@ai-sdk/deepinfra";
var SDK_MAP = Object.freeze({
  "@ai-sdk/openai": createOpenAI,
  "@ai-sdk/anthropic": createAnthropic,
  "@ai-sdk/google": createGoogleGenerativeAI,
  "@ai-sdk/deepseek": createDeepSeek,
  "@ai-sdk/xai": createXai,
  "@ai-sdk/azure": createAzure,
  "@ai-sdk/mistral": createMistral,
  "@ai-sdk/cohere": createCohere,
  "@ai-sdk/togetherai": createTogetherAI,
  "@ai-sdk/groq": createGroq,
  "@ai-sdk/perplexity": createPerplexity,
  "@ai-sdk/deepinfra": createDeepInfra
});

// src/core/chat/modelsDev.js
var MODELSDEV_URL = "https://models.dev/api.json";
var MODELSDEV_CACHE_KEY = "modelsdev:providers";
var MODELSDEV_CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
function createModelsDevStore({
  storage = null,
  fetch: fetchImpl = globalThis.fetch,
  now = Date.now,
  ttlMs = MODELSDEV_CACHE_TTL_MS,
  url = MODELSDEV_URL,
  cacheKey: cacheKey2 = MODELSDEV_CACHE_KEY
} = {}) {
  let _providersData = null;
  async function getProvidersData() {
    if (_providersData) return _providersData;
    try {
      if (storage) {
        const result = await storage.get(cacheKey2);
        const cached = result[cacheKey2];
        if (cached?.data && Object.keys(cached.data).length > 10) {
          _providersData = cached.data;
          const age = now() - (cached.ts || 0);
          if (age > ttlMs) {
            refreshProvidersData();
          }
          return _providersData;
        }
      }
    } catch (_) {
    }
    try {
      const resp = await fetchImpl(url);
      if (resp.ok) {
        _providersData = await resp.json();
        if (storage) {
          storage.set({ [cacheKey2]: { data: _providersData, ts: now() } });
        }
        return _providersData;
      }
    } catch (_) {
    }
    return null;
  }
  async function refreshProvidersData() {
    try {
      if (storage) {
        const result = await storage.get(cacheKey2);
        const cached = result[cacheKey2];
        if (cached?.ts && now() - cached.ts < ttlMs) return;
      }
    } catch (_) {
    }
    try {
      const resp = await fetchImpl(url);
      if (resp.ok) {
        _providersData = await resp.json();
        if (storage) {
          storage.set({ [cacheKey2]: { data: _providersData, ts: now() } });
        }
      }
    } catch (_) {
    }
  }
  return {
    getProvidersData,
    refreshProvidersData,
    /** Startup prefetch — the extension calls this on Service Worker boot. */
    prefetch: getProvidersData
  };
}

// src/core/chat/createModelClient.js
import { createAzure as createAzure2 } from "@ai-sdk/azure";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
async function createModelClient({ provider, apiKey, model, extra = {}, getProvidersData = null }) {
  const data = getProvidersData ? await getProvidersData() : null;
  const providerData = data?.[resolveModelsDevId(provider)];
  const npm = providerData?.npm;
  const rawApi = providerData?.api || "";
  const apiBase = extra.baseURL || (rawApi && !rawApi.includes("${") ? rawApi : "") || lookupKnownApiBase(provider) || void 0;
  if (provider === "azure" || provider === "azure-openai") {
    const resourceName = extra.resourceName || "";
    return createAzure2({ apiKey, resourceName, baseURL: apiBase })(model);
  }
  if (npm && SDK_MAP[npm]) {
    try {
      return SDK_MAP[npm]({ apiKey, baseURL: apiBase })(model);
    } catch (_) {
    }
  }
  if (!apiBase) {
    throw new Error(`Unknown AI provider "${provider}" and no base URL in models.dev data`);
  }
  return createOpenAICompatible({
    name: providerData?.name || provider,
    apiKey,
    baseURL: apiBase
  })(model);
}

// src/core/chat/streamChat.js
import { streamText } from "ai";
function formatAiError(err) {
  const apiMsg = err?.data?.error?.message || err?.responseBody?.error?.message || "";
  const statusCode = err?.statusCode || err?.status || "";
  const sdkMsg = err?.message || "";
  let message = "";
  if (apiMsg) {
    message = apiMsg;
  } else if (statusCode) {
    const hints = { 401: "Invalid or missing API key", 403: "Access denied", 429: "Rate limit exceeded", 500: "Server error", 503: "Service unavailable" };
    const hint = hints[statusCode] || `HTTP ${statusCode}`;
    message = sdkMsg ? `${hint}: ${sdkMsg}` : hint;
  } else if (sdkMsg) {
    message = sdkMsg;
  } else {
    message = String(err || "Unknown error");
  }
  return { message };
}
function _extractAiTextDelta(part) {
  if (typeof part?.text === "string") {
    return part.text;
  }
  if (typeof part?.textDelta === "string") {
    return part.textDelta;
  }
  return "";
}
async function streamChat({
  provider,
  apiKey,
  model,
  messages,
  temperature = 0.1,
  topP = 0.1,
  reasoningDepth = "",
  extra = {},
  store = null,
  signal = void 0,
  onChunk = () => {
  }
}) {
  const getProvidersData = store ? () => store.getProvidersData() : null;
  const languageModel = await createModelClient({ provider, apiKey, model, extra, getProvidersData });
  const providerData = getProvidersData ? (await getProvidersData())?.[resolveModelsDevId(provider)] : null;
  const providerOptions = buildProviderOptions({
    provider,
    npm: providerData?.npm,
    depth: reasoningDepth
  });
  const result = streamText({ model: languageModel, messages, temperature, topP, ...providerOptions ? { providerOptions } : {}, maxRetries: 0, abortSignal: signal });
  let totalChunks = 0;
  let streamError = null;
  for await (const part of result.fullStream) {
    if (part.type === "error") {
      streamError = part.error;
    } else if (part.type === "text-delta") {
      const chunkText = _extractAiTextDelta(part);
      if (!chunkText) {
        continue;
      }
      totalChunks++;
      onChunk(chunkText);
    }
  }
  return { totalChunks, streamError };
}

// src/core/translator/prompts.js
import { oneLine } from "common-tags";
function buildWordPromptRole({ sourceLanguageTrusted, sourceLanguageName, targetLanguageName }) {
  return sourceLanguageTrusted ? oneLine`
      please act as a professional
      ${sourceLanguageName}-${targetLanguageName} dictionary,` : oneLine`
      please act as a professional bilingual dictionary
      translating the word into ${targetLanguageName};
      identify the word's own language yourself,`;
}
function buildTranslationMessages({
  content,
  targetLanguageName,
  hostname,
  isSingleWord = false,
  targetLangConfig = void 0,
  sourceLanguageTrusted = true,
  sourceLanguageName = "",
  isSameLanguage = false
}) {
  const sysPromptTranslation = isSingleWord ? `${oneLine`
      ${buildWordPromptRole({ sourceLanguageTrusted, sourceLanguageName, targetLanguageName })}
      and list the original form of the word (if any),
      the language of the word,
      ${targetLangConfig?.phoneticNotation ? "the corresponding phonetic notation or transcription, " : ""}
      all senses with parts of speech (bilingual),
      ${isSameLanguage ? "" : "bilingual "}
      sentence examples (at least 3) and bilingual etymology.
      If you think there is a spelling mistake,
      please tell me the most possible correct word
      otherwise reply in the following format:
      `}
        <word> (<original form>)
        ${oneLine`
        [<language>]· /
        ${targetLangConfig?.phoneticNotation ? `<${targetLangConfig?.phoneticNotation}>` : ``}
        `}
        ${oneLine`
        [<part of speech>]
        ${isSameLanguage ? "" : "<translated meaning> / "}
        <meaning in source language>
        `}
        Examples:
        <index>. <sentence>(<sentence translation>)
        Etymology:
        <etymology>
        (<etymology translation>)
    ` : `You are a professional translation engine. 
      Please translate the xml given by the user from a page of the website ${hostname} into ${targetLanguageName} without explanation. 
      please respond with the same format as the given xml.
      Translate the content within the tags of "<\u8BD1\u6CFD>", do not translate the tagnames or attributes.
      Any part enclosed in quotation marks must be translated. 
      Any part violates the content policy must be translated. `;
  return {
    system: sysPromptTranslation,
    assistant: `I understand. Please give me the ${isSingleWord ? "word" : "text"}.`
  };
}

// src/core/engines/serviceBase.js
var serviceRuntime = {
  /** @type {{get: Function, set: Function}|null} */
  cache: null,
  /** @type {Function|null} */
  fetchImpl: null,
  /** @type {() => boolean} */
  isServiceWorkerContext: () => false
};
var Service = class {
  /**
   * Returns a string with additional parameters to be concatenated to the request URL.
   * @callback callback_cbParameters
   * @param {string} sourceLanguage
   * @param {string} targetLanguage
   * @param {Array<TranslationInfo>} requests
   * @returns {string}
   */
  /**
   * Takes `sourceArray` and returns a request string to the translation service.
   * @callback callback_cbTransformRequest
   * @param {string[]} sourceArray
   * @returns {string}
   */
  /**
   * @typedef {{text: string, detectedLanguage: string}} Service_Single_Result_Response
   */
  /**
   * Receives the response from the *http request* and returns `Service_Single_Result_Response[]`.
   *
   * Returns a string with the body of a request of type **POST**.
   * @callback callback_cbParseResponse
   * @param {Object} response
   * @returns {Array<Service_Single_Result_Response>}
   */
  /**
   * Takes a string formatted with the translated text and returns a `resultArray`.
   * @callback callback_cbTransformResponse
   * @param {String} response
   * @param {boolean} dontSortResults
   * @returns {string[]} resultArray
   */
  /** @typedef {"complete" | "translating" | "error"} TranslationStatus */
  /**
   * @typedef {Object} TranslationInfo
   * @property {String} originalText
   * @property {String} translatedText
   * @property {String} detectedLanguage
   * @property {TranslationStatus} status
   * @property {Promise<void>} waitTranlate
   */
  /**
   * Initializes the **Service** class with information about the new translation service.
   * @param {string} serviceName
   * @param {string} baseURL
   * @param {"GET" | "POST"} xhrMethod
   * @param {callback_cbTransformRequest} cbTransformRequest Takes `sourceArray` and returns a request string to the translation service.
   * @param {callback_cbParseResponse} cbParseResponse Receives the response from the *http request* and returns `Service_Single_Result_Response[]`.
   * @param {callback_cbTransformResponse} cbTransformResponse Takes a string formatted with the translated text and returns a `resultArray`.
   * @param {callback_cbParameters} cbGetExtraParameters Returns a string with additional parameters to be concatenated to the request URL.
   * @param {callback_cbParameters} cbGetRequestBody Returns a string with the body of a request of type **POST**.
   */
  constructor(serviceName, baseURL, xhrMethod = "GET", cbTransformRequest, cbParseResponse, cbTransformResponse, cbGetExtraParameters = null, cbGetRequestBody = null) {
    this.serviceName = serviceName;
    this.baseURL = baseURL;
    this.xhrMethod = xhrMethod;
    this.cbTransformRequest = cbTransformRequest;
    this.cbParseResponse = cbParseResponse;
    this.cbTransformResponse = cbTransformResponse;
    this.cbGetExtraParameters = cbGetExtraParameters;
    this.cbGetRequestBody = cbGetRequestBody;
    this.translationsInProgress = /* @__PURE__ */ new Map();
  }
  /**
   * Removes all translations with `status` **error** and are in `translationsInProgress`.
   *
   * Sometimes there is a device translation error due to internet connection problems.
   * Clearing translationsInProgress ensures that the translation will be retried.
   */
  removeTranslationsWithError() {
    this.translationsInProgress.forEach((transInfo, key) => {
      if (transInfo.status === "error") {
        this.translationsInProgress.delete(key);
      }
    });
  }
  /**
   * Receives the `sourceArray2d` parameter and prepares the requests.
   * Calls `cbTransformRequest` for each `sourceArray` of `sourceArray2d`.
   * The `currentTranslationsInProgress` array will be the **final result** with requests already completed or in progress. 
   * And the `requests` array will only contain the new requests that need to be made.
   *
   * Checks if there is already an identical request in progress or if it is already in the translation cache.
   * If it doesn't exist, add it to `requests` to make a new *http request*.
   *
   * Requests longer than **800 characters** will be split into new requests.
   * @param {string} sourceLanguage
   * @param {string} targetLanguage
   * @param {Array<string[]>} sourceArray2d
   * @returns {Promise<[Array<TranslationInfo[]>, TranslationInfo[]]>} `requests`, `currentTranslationsInProgress`
   */
  async getRequests(sourceLanguage, targetLanguage, sourceArray2d) {
    const requests = [];
    const currentTranslationsInProgress = [];
    let currentRequest = [];
    let currentSize = 0;
    for (const sourceArray of sourceArray2d) {
      const requestString = this.fixString(
        // Takes `sourceArray` and returns a request string to the translation service.
        this.cbTransformRequest(sourceArray)
      );
      const requestHash = [
        sourceLanguage,
        targetLanguage,
        requestString
      ].join(", ");
      const progressInfo = this.translationsInProgress.get(requestHash);
      if (progressInfo) {
        currentTranslationsInProgress.push(progressInfo);
      } else {
        let status = "translating";
        let promise_resolve = null;
        const progressInfo2 = {
          originalText: requestString,
          translatedText: null,
          detectedLanguage: null,
          get status() {
            return status;
          },
          set status(_status) {
            status = _status;
            promise_resolve();
          },
          waitTranlate: new Promise((resolve) => promise_resolve = resolve)
        };
        currentTranslationsInProgress.push(progressInfo2);
        this.translationsInProgress.set(requestHash, progressInfo2);
        const cacheEntry = serviceRuntime.cache ? await serviceRuntime.cache.get(
          this.serviceName,
          sourceLanguage,
          targetLanguage,
          requestString
        ) : void 0;
        if (cacheEntry) {
          progressInfo2.translatedText = cacheEntry.translatedText;
          progressInfo2.detectedLanguage = cacheEntry.detectedLanguage;
          progressInfo2.status = "complete";
        } else {
          currentRequest.push(progressInfo2);
          currentSize += progressInfo2.originalText.length;
          if (currentSize > 800) {
            requests.push(currentRequest);
            currentSize = 0;
            currentRequest = [];
          }
        }
      }
    }
    if (currentRequest.length > 0) {
      requests.push(currentRequest);
      currentRequest = [];
      currentSize = 0;
    }
    return [requests, currentTranslationsInProgress];
  }
  /**
   * Makes a request using the *XMLHttpRequest* API. Returns a promise that will be resolved with the result of the request. If the request fails, the promise will be rejected.
   * @param {string} sourceLanguage
   * @param {string} targetLanguage
   * @param {Array<TranslationInfo>} requests
   * @returns {Promise<*>}
   */
  async makeRequest(sourceLanguage, targetLanguage, requests) {
    const url = this.baseURL + (this.cbGetExtraParameters ? this.cbGetExtraParameters(sourceLanguage, targetLanguage, requests) : "");
    const headers = new Headers();
    const hasBody = !!this.cbGetRequestBody;
    if (hasBody && this.xhrMethod === "POST") {
      headers.append("Content-Type", "application/x-www-form-urlencoded");
    }
    const body = hasBody ? this.cbGetRequestBody(sourceLanguage, targetLanguage, requests) : void 0;
    const controller = new AbortController();
    const timeoutMs = 15e3;
    const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);
    try {
      const response = await (serviceRuntime.fetchImpl || fetch)(url, {
        method: this.xhrMethod,
        headers,
        body,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text().catch(() => "<failed to read body>");
        const err = new Error(`HTTP ${response.status} ${response.statusText}`);
        throw err;
      }
      const rawText = await response.text();
      try {
        return JSON.parse(rawText);
      } catch (jsonErr) {
        return rawText;
      }
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
  /**
   * Translates the `sourceArray2d`.
   *
   * If `dontSaveInPersistentCache` is **true** then the translation result will not be saved in the on-disk translation cache, only in the in-memory cache.
   *
   * The `dontSortResults` parameter is only valid when using the ***google*** translation service, if its value is **true** then the translation result will not be sorted.
   * 
   * @param {string} sourceLanguage
   * @param {string} targetLanguage
   * @param {Array<string[]>} sourceArray2d
   * @param {boolean} dontSaveInPersistentCache
   * @param {boolean} dontSortResults 
   * @returns {Promise<string[][]>}
   */
  async translate(sourceLanguage, targetLanguage, sourceArray2d, dontSaveInPersistentCache = false, dontSortResults = false) {
    const [requests, currentTranslationsInProgress] = await this.getRequests(
      sourceLanguage,
      targetLanguage,
      sourceArray2d
    );
    const promises = [];
    for (const request of requests) {
      promises.push(
        this.makeRequest(sourceLanguage, targetLanguage, request).then((response) => {
          const results = this.cbParseResponse(response);
          for (const idx in request) {
            const result = results[idx];
            if (!result || typeof result.text !== "string") {
              throw new Error(
                `[${this.serviceName}] Missing translation result for request index ${idx}. Parsed results: ${Array.isArray(results) ? results.length : "non-array"}`
              );
            }
            this.cbTransformResponse(result.text, dontSortResults);
            const transInfo = request[idx];
            transInfo.detectedLanguage = result.detectedLanguage || "und";
            transInfo.translatedText = result.text;
            transInfo.status = "complete";
            if (dontSaveInPersistentCache === false && transInfo.translatedText && serviceRuntime.cache) {
              serviceRuntime.cache.set(
                this.serviceName,
                sourceLanguage,
                targetLanguage,
                transInfo.originalText,
                transInfo.translatedText,
                transInfo.detectedLanguage
              );
            }
          }
        }).catch((e) => {
          for (const transInfo of request) {
            transInfo.status = "error";
            transInfo.error = e;
          }
        })
      );
    }
    await Promise.all(
      currentTranslationsInProgress.map((transInfo) => transInfo.waitTranlate)
    );
    return currentTranslationsInProgress.map(
      (transInfo) => this.cbTransformResponse(transInfo.translatedText, dontSortResults)
    );
  }
  /**
   * @param {string} str
   * @returns {string} fixedStr
   */
  fixString(str) {
    return str.replace(/\u200b/g, " ");
  }
};

// src/core/engines/utils.js
var Utils = class {
  /**
   * Replace the characters `& < > " '` with `&amp; &lt; &gt; &quot; &#39;`.
   * @param {string} unsafe
   * @returns {string} escapedString
   */
  static escapeHTML(unsafe) {
    return unsafe.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;").replace(/\"/g, "&quot;").replace(/\'/g, "&#39;");
  }
  /**
   * Replace the characters `&amp; &lt; &gt; &quot; &#39;` with `& < > " '`.
   * @param {string} unsafe
   * @returns {string} unescapedString
   */
  static unescapeHTML(unsafe) {
    return unsafe.replace(/\&amp;/g, "&").replace(/\&lt;/g, "<").replace(/\&gt;/g, ">").replace(/\&quot;/g, '"').replace(/\&\#39;/g, "'");
  }
};

// src/core/engines/google.js
function parseGoogleResponse(response) {
  let fullTranslatedText = "";
  let detectedLanguage = null;
  if (Array.isArray(response) && Array.isArray(response[0])) {
    for (const segment of response[0]) {
      if (Array.isArray(segment) && segment[0]) {
        fullTranslatedText += segment[0];
      }
    }
  }
  if (Array.isArray(response) && response[2]) {
    detectedLanguage = response[2];
  }
  return { fullTranslatedText, detectedLanguage };
}
var googleService = new class extends Service {
  constructor() {
    super(
      "google",
      "https://translate.googleapis.com/translate_a/single",
      "GET",
      /**
       * Takes `sourceArray` and joins them with a separator for a single request.
       * Each element is escaped for safe transport.
       */
      function cbTransformRequest(sourceArray) {
        return sourceArray.map((text) => Utils.escapeHTML(text)).join("\n\n\n");
      },
      /**
       * Parses the client=gtx response format.
       * Response is a nested array: [[["translated sentence", "original sentence", ...], ...], null, "detectedLang", ...]
       * We concatenate all response[0][i][0] to get the full translated text.
       *
       * IMPORTANT: The base class translate() iterates `for (const idx in request)`
       * and accesses `results[idx]`, so we MUST return one result per request item.
       * Since cbGetExtraParameters joins all request items with "\n\n\n\n\n",
       * we split the concatenated translation by the same separator.
       * @param {*} response
       * @returns {Service_Single_Result_Response[]}
       */
      function cbParseResponse(response) {
        const { fullTranslatedText, detectedLanguage } = parseGoogleResponse(response);
        const parts = fullTranslatedText.split("\n\n\n\n\n");
        return parts.map((text) => ({ text, detectedLanguage }));
      },
      /**
       * Splits the translated text back into the original sourceArray structure.
       * The separator "\n\n\n" corresponds to the join in cbTransformRequest.
       * @param {string} result
       * @param {boolean} dontSortResults - not used for this endpoint
       * @returns {string[]}
       */
      function cbTransformResponse(result, dontSortResults) {
        if (!result) return [""];
        const parts = result.split("\n\n\n");
        return parts.map((value) => Utils.unescapeHTML(value));
      },
      /**
       * Builds the query string parameters for the GET request.
       * Joins multiple request items with "\n\n\n\n\n" (5 newlines) so that
       * cbParseResponse can split them back into individual results.
       */
      function cbGetExtraParameters(sourceLanguage, targetLanguage, requests) {
        const text = requests.map((info) => info.originalText).join("\n\n\n\n\n");
        return `?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
      },
      // No request body needed for GET requests
      void 0
    );
  }
  /**
   * Google free endpoint occasionally collapses or rewrites separator runs when
   * multiple logical requests are concatenated into a single network payload.
   * That makes `cbParseResponse` return fewer result items than the original
   * request list, which later causes `result.text` access to throw and the
   * runtime message to resolve as `null` in Chrome.
   *
   * To keep page translation deterministic, each request item is sent as its
   * own network request while still preserving the inner `sourceArray`
   * aggregation handled by `cbTransformRequest`.
   *
   * @param {string} sourceLanguage
   * @param {string} targetLanguage
   * @param {Array<string[]>} sourceArray2d
   * @returns {Promise<[Array<TranslationInfo[]>, TranslationInfo[]]>}
   */
  async getRequests(sourceLanguage, targetLanguage, sourceArray2d) {
    const requests = [];
    const currentTranslationsInProgress = [];
    for (const sourceArray of sourceArray2d) {
      const requestString = this.fixString(this.cbTransformRequest(sourceArray));
      const requestHash = [
        sourceLanguage,
        targetLanguage,
        requestString
      ].join(", ");
      const progressInfo = this.translationsInProgress.get(requestHash);
      if (progressInfo) {
        currentTranslationsInProgress.push(progressInfo);
        continue;
      }
      let status = "translating";
      let promiseResolve = null;
      const nextProgressInfo = {
        originalText: requestString,
        translatedText: null,
        detectedLanguage: null,
        get status() {
          return status;
        },
        set status(nextStatus) {
          status = nextStatus;
          promiseResolve();
        },
        waitTranlate: new Promise((resolve) => promiseResolve = resolve)
      };
      currentTranslationsInProgress.push(nextProgressInfo);
      this.translationsInProgress.set(requestHash, nextProgressInfo);
      const cacheEntry = serviceRuntime.cache ? await serviceRuntime.cache.get(
        this.serviceName,
        sourceLanguage,
        targetLanguage,
        requestString
      ) : void 0;
      if (cacheEntry) {
        nextProgressInfo.translatedText = cacheEntry.translatedText;
        nextProgressInfo.detectedLanguage = cacheEntry.detectedLanguage;
        nextProgressInfo.status = "complete";
        continue;
      }
      requests.push([nextProgressInfo]);
    }
    return [requests, currentTranslationsInProgress];
  }
}();
async function translateGoogle({ sourceArray, sourceLanguage, targetLanguage, cache = null, fetchImpl = null }) {
  const prevCache = serviceRuntime.cache;
  const prevFetch = serviceRuntime.fetchImpl;
  serviceRuntime.cache = cache;
  serviceRuntime.fetchImpl = fetchImpl;
  try {
    const pieces = Array.from(sourceArray);
    const requestString = googleService.fixString(googleService.cbTransformRequest(pieces));
    const requestHash = [sourceLanguage, targetLanguage, requestString].join(", ");
    const [row] = await googleService.translate(sourceLanguage, targetLanguage, [pieces]);
    const info = googleService.translationsInProgress.get(requestHash);
    if (!info || info.status === "error") {
      googleService.translationsInProgress.delete(requestHash);
      const reason = info?.error?.message || "request failed (network or HTTP error)";
      throw new Error(`Google translation failed: ${reason}`);
    }
    return row;
  } finally {
    serviceRuntime.cache = prevCache;
    serviceRuntime.fetchImpl = prevFetch;
  }
}

// src/core/cache/keys.js
var AI_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
function buildCacheKey(providerId, modelId, reasoningDepth, urlWithoutParams, originalText) {
  return `${providerId}\0${modelId}\0${reasoningDepth ?? ""}\0${urlWithoutParams}\0${originalText}`;
}

// src/core/cache/memory.js
function createMemoryCache() {
  const entries = /* @__PURE__ */ new Map();
  const keyOf = (service, sourceLanguage, targetLanguage, text) => [service, sourceLanguage, targetLanguage, text].join("\0");
  return {
    async get(service, sourceLanguage, targetLanguage, requestString) {
      return entries.get(keyOf(service, sourceLanguage, targetLanguage, requestString));
    },
    async set(service, sourceLanguage, targetLanguage, originalText, translatedText, detectedLanguage) {
      entries.set(keyOf(service, sourceLanguage, targetLanguage, originalText), {
        translatedText,
        detectedLanguage
      });
    },
    size() {
      return entries.size;
    }
  };
}
function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      const out = {};
      for (const key of list) {
        if (store.has(key)) out[key] = store.get(key);
      }
      return out;
    },
    async set(obj) {
      for (const [key, value] of Object.entries(obj)) {
        store.set(key, value);
      }
    },
    async remove(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) {
        store.delete(key);
      }
    }
  };
}

// src/core/cache/file.js
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
function createFileCache(filePath) {
  let loaded = false;
  let entries = {};
  function load() {
    if (loaded) return;
    loaded = true;
    try {
      entries = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (_) {
      entries = {};
    }
  }
  function persist() {
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(entries, null, 2));
    } catch (_) {
    }
  }
  const keyOf = (service, sourceLanguage, targetLanguage, text) => JSON.stringify([service, sourceLanguage, targetLanguage, text]);
  return {
    async get(service, sourceLanguage, targetLanguage, requestString) {
      load();
      return entries[keyOf(service, sourceLanguage, targetLanguage, requestString)];
    },
    async set(service, sourceLanguage, targetLanguage, originalText, translatedText, detectedLanguage) {
      load();
      entries[keyOf(service, sourceLanguage, targetLanguage, originalText)] = {
        translatedText,
        detectedLanguage
      };
      persist();
    },
    size() {
      load();
      return Object.keys(entries).length;
    }
  };
}

// src/core/languages/names.js
var allLanguagesNames = {
  en: {
    af: "Afrikaans",
    sq: "Albanian",
    am: "Amharic",
    ar: "Arabic",
    hy: "Armenian",
    as: "Assamese",
    ay: "Aymara",
    az: "Azerbaijani",
    bm: "Bambara",
    eu: "Basque",
    be: "Belarusian",
    bn: "Bengali",
    bho: "Bhojpuri",
    bs: "Bosnian",
    bg: "Bulgarian",
    ca: "Catalan",
    ceb: "Cebuano",
    ny: "Chichewa",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    co: "Corsican",
    hr: "Croatian",
    cs: "Czech",
    da: "Danish",
    dv: "Dhivehi",
    doi: "Dogri",
    nl: "Dutch",
    en: "English",
    eo: "Esperanto",
    et: "Estonian",
    ee: "Ewe",
    tl: "Filipino",
    fi: "Finnish",
    fr: "French",
    fy: "Frisian",
    gl: "Galician",
    ka: "Georgian",
    de: "German",
    el: "Greek",
    gn: "Guarani",
    gu: "Gujarati",
    ht: "Haitian Creole",
    ha: "Hausa",
    haw: "Hawaiian",
    he: "Hebrew",
    hi: "Hindi",
    hmn: "Hmong",
    hu: "Hungarian",
    is: "Icelandic",
    ig: "Igbo",
    ilo: "Ilocano",
    id: "Indonesian",
    ga: "Irish",
    it: "Italian",
    ja: "Japanese",
    jv: "Javanese",
    kn: "Kannada",
    kk: "Kazakh",
    km: "Khmer",
    rw: "Kinyarwanda",
    gom: "Konkani",
    ko: "Korean",
    kri: "Krio",
    ku: "Kurdish (Kurmanji)",
    ckb: "Kurdish (Sorani)",
    ky: "Kyrgyz",
    lo: "Lao",
    la: "Latin",
    lv: "Latvian",
    ln: "Lingala",
    lt: "Lithuanian",
    lg: "Luganda",
    lb: "Luxembourgish",
    mk: "Macedonian",
    mai: "Maithili",
    mg: "Malagasy",
    ms: "Malay",
    ml: "Malayalam",
    mt: "Maltese",
    mi: "Maori",
    mr: "Marathi",
    "mni-Mtei": "Meiteilon (Manipuri)",
    lus: "Mizo",
    mn: "Mongolian",
    my: "Myanmar (Burmese)",
    ne: "Nepali",
    no: "Norwegian",
    or: "Odia (Oriya)",
    om: "Oromo",
    ps: "Pashto",
    fa: "Persian",
    pl: "Polish",
    pt: "Portuguese",
    pa: "Punjabi",
    qu: "Quechua",
    ro: "Romanian",
    ru: "Russian",
    sm: "Samoan",
    sa: "Sanskrit",
    gd: "Scots Gaelic",
    nso: "Sepedi",
    sr: "Serbian",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Sinhala",
    sk: "Slovak",
    sl: "Slovenian",
    so: "Somali",
    es: "Spanish",
    su: "Sundanese",
    sw: "Swahili",
    sv: "Swedish",
    tg: "Tajik",
    ta: "Tamil",
    tt: "Tatar",
    te: "Telugu",
    th: "Thai",
    ti: "Tigrinya",
    ts: "Tsonga",
    tr: "Turkish",
    tk: "Turkmen",
    ak: "Twi",
    uk: "Ukrainian",
    ur: "Urdu",
    ug: "Uyghur",
    uz: "Uzbek",
    vi: "Vietnamese",
    cy: "Welsh",
    xh: "Xhosa",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  ar: {
    is: "\u0627\u0644\u0622\u064A\u0633\u0644\u0646\u062F\u064A\u0629",
    az: "\u0627\u0644\u0623\u0630\u0631\u064A\u0629",
    ur: "\u0627\u0644\u0623\u0631\u062F\u064A\u0629",
    hy: "\u0627\u0644\u0623\u0631\u0645\u0646\u064A\u0629",
    as: "\u0627\u0644\u0623\u0633\u0627\u0645\u064A\u0629",
    es: "\u0627\u0644\u0625\u0633\u0628\u0627\u0646\u064A\u0629",
    eo: "\u0627\u0644\u0625\u0633\u0628\u0631\u0627\u0646\u062A\u0648",
    et: "\u0627\u0644\u0625\u0633\u062A\u0648\u0646\u064A\u0629",
    af: "\u0627\u0644\u0623\u0641\u0631\u064A\u0642\u0627\u0646\u064A\u0629",
    sq: "\u0627\u0644\u0623\u0644\u0628\u0627\u0646\u064A\u0629",
    de: "\u0627\u0644\u0623\u0644\u0645\u0627\u0646\u064A\u0629",
    am: "\u0627\u0644\u0623\u0645\u0647\u0631\u064A\u0629",
    en: "\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629",
    id: "\u0627\u0644\u0625\u0646\u062F\u0648\u0646\u064A\u0633\u064A\u0629",
    or: "\u0627\u0644\u0623\u0648\u062F\u064A\u0627 (\u0627\u0644\u0623\u0648\u0631\u064A\u0627)",
    om: "\u0627\u0644\u0623\u0648\u0631\u0648\u0645\u064A\u0629",
    uz: "\u0627\u0644\u0623\u0648\u0632\u0628\u0643\u064A\u0629",
    uk: "\u0627\u0644\u0623\u0648\u0643\u0631\u0627\u0646\u064A\u0629",
    ug: "\u0627\u0644\u0623\u0648\u064A\u063A\u0648\u0631\u064A\u0629",
    ga: "\u0627\u0644\u0623\u064A\u0631\u0644\u0646\u062F\u064A\u0629",
    it: "\u0627\u0644\u0625\u064A\u0637\u0627\u0644\u064A\u0629",
    ig: "\u0627\u0644\u0625\u064A\u063A\u0628\u0648",
    ilo: "\u0627\u0644\u0625\u064A\u0644\u0648\u0643\u0627\u0646\u0648",
    ay: "\u0627\u0644\u0623\u064A\u0645\u0627\u0631\u0627",
    ee: "\u0627\u0644\u0625\u064A\u0648\u064A",
    eu: "\u0627\u0644\u0628\u0627\u0633\u0643\u064A\u0629",
    ps: "\u0627\u0644\u0628\u0627\u0634\u062A\u0648\u064A\u0629",
    bm: "\u0627\u0644\u0628\u0627\u0645\u0628\u0627\u0631\u0627",
    pt: "\u0627\u0644\u0628\u0631\u062A\u063A\u0627\u0644\u064A\u0629",
    bg: "\u0627\u0644\u0628\u0644\u063A\u0627\u0631\u064A\u0629",
    pa: "\u0627\u0644\u0628\u0646\u062C\u0627\u0628\u064A\u0629",
    bn: "\u0627\u0644\u0628\u0646\u063A\u0627\u0644\u064A\u0629",
    bho: "\u0627\u0644\u0628\u0648\u062C\u0628\u0648\u0631\u064A\u0629",
    my: "\u0627\u0644\u0628\u0648\u0631\u0645\u064A\u0629",
    bs: "\u0627\u0644\u0628\u0648\u0633\u0646\u064A\u0629",
    pl: "\u0627\u0644\u0628\u0648\u0644\u0646\u062F\u064A\u0629",
    be: "\u0627\u0644\u0628\u064A\u0644\u0627\u0631\u0648\u0633\u064A\u0629",
    ta: "\u0627\u0644\u062A\u0627\u0645\u064A\u0644\u064A\u0629",
    th: "\u0627\u0644\u062A\u0627\u064A\u0644\u0627\u0646\u062F\u064A\u0629",
    tt: "\u0627\u0644\u062A\u062A\u0627\u0631\u064A\u0629",
    tk: "\u0627\u0644\u062A\u0631\u0643\u0645\u0627\u0646\u064A\u0629",
    tr: "\u0627\u0644\u062A\u0631\u0643\u064A\u0629",
    ts: "\u0627\u0644\u062A\u0633\u0648\u0646\u063A\u0627",
    cs: "\u0627\u0644\u062A\u0634\u064A\u0643\u064A\u0629",
    ti: "\u0627\u0644\u062A\u064A\u063A\u0631\u064A\u0646\u064A\u0629",
    te: "\u0627\u0644\u062A\u064A\u0644\u0648\u063A\u0648\u064A\u0629",
    gl: "\u0627\u0644\u062C\u0627\u0644\u064A\u0643\u064A\u0629",
    jv: "\u0627\u0644\u062C\u0627\u0648\u064A\u0629",
    gn: "\u0627\u0644\u062C\u0648\u0631\u0627\u0646\u064A\u0629",
    ka: "\u0627\u0644\u062C\u0648\u0631\u062C\u064A\u0629",
    km: "\u0627\u0644\u062E\u0645\u064A\u0631\u064A\u0629",
    xh: "\u0627\u0644\u062E\u0648\u0633\u0627",
    da: "\u0627\u0644\u062F\u0627\u0646\u0645\u0631\u0643\u064A\u0629",
    doi: "\u0627\u0644\u062F\u0648\u063A\u0631\u064A\u0629",
    dv: "\u0627\u0644\u062F\u064A\u0641\u0647\u064A\u0629",
    ru: "\u0627\u0644\u0631\u0648\u0633\u064A\u0629",
    ro: "\u0627\u0644\u0631\u0648\u0645\u0627\u0646\u064A\u0629",
    zu: "\u0627\u0644\u0632\u0648\u0644\u0648",
    sm: "\u0627\u0644\u0633\u0627\u0645\u0648\u0627\u0646\u064A\u0629",
    su: "\u0627\u0644\u0633\u0627\u0646\u062F\u064A\u0646\u064A\u0632\u064A\u0629",
    nso: "\u0627\u0644\u0633\u0628\u064A\u062F\u064A\u0629",
    sk: "\u0627\u0644\u0633\u0644\u0648\u0641\u0627\u0643\u064A\u0629",
    sl: "\u0627\u0644\u0633\u0644\u0648\u0641\u064A\u0646\u064A\u0629",
    sd: "\u0627\u0644\u0633\u0646\u062F\u064A\u0629",
    sa: "\u0627\u0644\u0633\u0646\u0633\u0643\u0631\u064A\u062A\u064A\u0629",
    si: "\u0627\u0644\u0633\u0646\u0647\u0627\u0644\u064A\u0629",
    sw: "\u0627\u0644\u0633\u0648\u0627\u062D\u064A\u0644\u064A\u0629",
    sv: "\u0627\u0644\u0633\u0648\u064A\u062F\u064A\u0629",
    ceb: "\u0627\u0644\u0633\u064A\u0628\u064A\u0648\u0627\u0646\u064A\u0629",
    st: "\u0627\u0644\u0633\u064A\u0633\u0648\u062A\u0648",
    sn: "\u0627\u0644\u0634\u0648\u0646\u0627",
    sr: "\u0627\u0644\u0635\u0631\u0628\u064A\u0629",
    so: "\u0627\u0644\u0635\u0648\u0645\u0627\u0644\u064A\u0629",
    "zh-TW": "\u0627\u0644\u0635\u064A\u0646\u064A\u0629 (\u0627\u0644\u062A\u0642\u0644\u064A\u062F\u064A\u0629)",
    "zh-CN": "\u0627\u0644\u0635\u064A\u0646\u064A\u0629 (\u0627\u0644\u0645\u0628\u0633\u0637\u0629)",
    tg: "\u0627\u0644\u0637\u0627\u062C\u064A\u0643\u064A\u0629",
    he: "\u0627\u0644\u0639\u0628\u0631\u064A\u0629",
    ar: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    gu: "\u0627\u0644\u063A\u0648\u062C\u0627\u0631\u0627\u062A\u064A\u0629",
    gd: "\u0627\u0644\u063A\u064A\u0644\u064A\u0629 \u0627\u0644\u0623\u0633\u0643\u062A\u0644\u0646\u062F\u064A\u0629",
    fa: "\u0627\u0644\u0641\u0627\u0631\u0633\u064A\u0629",
    fr: "\u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629",
    fy: "\u0627\u0644\u0641\u0631\u064A\u0632\u064A\u0629",
    tl: "\u0627\u0644\u0641\u0644\u0628\u064A\u0646\u064A\u0629",
    fi: "\u0627\u0644\u0641\u0646\u0644\u0646\u062F\u064A\u0629",
    vi: "\u0627\u0644\u0641\u064A\u062A\u0646\u0627\u0645\u064A\u0629",
    ca: "\u0627\u0644\u0642\u0637\u0644\u0648\u0646\u064A\u0629",
    ky: "\u0627\u0644\u0642\u064A\u0631\u063A\u064A\u0632\u064A\u0629",
    kk: "\u0627\u0644\u0643\u0627\u0632\u0627\u062E\u064A\u0629",
    ckb: "\u0627\u0644\u0643\u0631\u062F\u064A\u0629 (\u0627\u0644\u0633\u0648\u0631\u0627\u0646\u064A\u0629)",
    ku: "\u0627\u0644\u0643\u0631\u062F\u064A\u0629 (\u0627\u0644\u0643\u0631\u0645\u0627\u0646\u062C\u064A\u0629)",
    hr: "\u0627\u0644\u0643\u0631\u0648\u0627\u062A\u064A\u0629",
    kn: "\u0627\u0644\u0643\u0646\u0627\u062F\u064A\u0629",
    co: "\u0627\u0644\u0643\u0648\u0631\u0633\u064A\u0643\u064A\u0629",
    ko: "\u0627\u0644\u0643\u0648\u0631\u064A\u0629",
    gom: "\u0627\u0644\u0643\u0648\u0646\u0643\u0627\u0646\u064A\u0629",
    qu: "\u0627\u0644\u0643\u064A\u062A\u0634\u0648\u0627",
    rw: "\u0627\u0644\u0643\u064A\u0646\u064A\u0627\u0631\u0648\u0627\u0646\u062F\u064A\u0629",
    lv: "\u0627\u0644\u0644\u0627\u062A\u0641\u064A\u0629",
    la: "\u0627\u0644\u0644\u0627\u062A\u064A\u0646\u064A\u0629",
    lo: "\u0627\u0644\u0644\u0627\u0648\u0648",
    ht: "\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0643\u0631\u064A\u0648\u0644\u064A\u0629 \u0627\u0644\u0647\u0627\u064A\u062A\u064A\u0629",
    lg: "\u0627\u0644\u0644\u0648\u063A\u0646\u062F\u064A\u0629",
    lb: "\u0627\u0644\u0644\u0648\u0643\u0633\u0645\u0628\u0648\u0631\u063A\u064A\u0629",
    lt: "\u0627\u0644\u0644\u064A\u062A\u0648\u0627\u0646\u064A\u0629",
    ln: "\u0627\u0644\u0644\u064A\u0646\u063A\u0627\u0644\u0627",
    mr: "\u0627\u0644\u0645\u0627\u0631\u0627\u062B\u064A\u0629",
    ml: "\u0627\u0644\u0645\u0627\u0644\u0627\u064A\u0627\u0644\u0627\u0645\u064A\u0629",
    mt: "\u0627\u0644\u0645\u0627\u0644\u0637\u064A\u0651\u0629",
    mi: "\u0627\u0644\u0645\u0627\u0648\u0631\u064A\u0629",
    mai: "\u0627\u0644\u0645\u0627\u064A\u062B\u064A\u0644\u064A\u0629",
    mg: "\u0627\u0644\u0645\u062F\u063A\u0634\u0642\u0631\u064A\u0629",
    mk: "\u0627\u0644\u0645\u0642\u062F\u0648\u0646\u064A\u0629",
    ms: "\u0627\u0644\u0645\u0644\u0627\u064A\u0648",
    mn: "\u0627\u0644\u0645\u0646\u063A\u0648\u0644\u064A\u0629",
    "mni-Mtei": "\u0627\u0644\u0645\u064A\u062A\u064A\u0629 (\u0627\u0644\u0645\u0627\u0646\u064A\u0628\u0648\u0631\u064A\u0629)",
    lus: "\u0627\u0644\u0645\u064A\u0632\u0648",
    no: "\u0627\u0644\u0646\u0631\u0648\u064A\u062C\u064A\u0629",
    ne: "\u0627\u0644\u0646\u064A\u0628\u0627\u0644\u064A\u0629",
    hmn: "\u0627\u0644\u0647\u0645\u0648\u0646\u062C\u064A\u0629",
    hi: "\u0627\u0644\u0647\u0646\u062F\u064A\u0629",
    hu: "\u0627\u0644\u0647\u0646\u063A\u0627\u0631\u064A\u0629",
    ha: "\u0627\u0644\u0647\u0648\u0633\u0627",
    nl: "\u0627\u0644\u0647\u0648\u0644\u0646\u062F\u064A\u0629",
    cy: "\u0627\u0644\u0648\u064A\u0644\u0632\u064A\u0629",
    ja: "\u0627\u0644\u064A\u0627\u0628\u0627\u0646\u064A\u0629",
    yo: "\u0627\u0644\u064A\u0648\u0631\u0628\u0627\u064A\u0629",
    el: "\u0627\u0644\u064A\u0648\u0646\u0627\u0646\u064A\u0629",
    yi: "\u0627\u0644\u064A\u064A\u062F\u064A\u0629",
    ny: "\u062A\u0634\u064A\u062A\u0634\u0648\u0627",
    ak: "\u062A\u0648\u064A",
    kri: "\u0643\u0631\u064A\u0648",
    haw: "\u0644\u063A\u0629 \u0647\u0627\u0648\u0627\u064A",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  ca: {
    af: "afrikaans",
    ay: "aimara",
    sq: "alban\xE8s",
    de: "alemany",
    am: "amh\xE0ric",
    en: "angl\xE8s",
    ar: "\xE0rab",
    hy: "armeni",
    as: "assam\xE8s",
    az: "\xE0zeri",
    bm: "bambara",
    eu: "basc",
    bn: "bengal\xED",
    bho: "bhojpuri",
    be: "bielor\xFAs",
    my: "birm\xE0",
    bs: "bosni\xE0",
    bg: "b\xFAlgar",
    es: "castell\xE0",
    ca: "catal\xE0",
    ceb: "cebu\xE0",
    gom: "concani",
    ko: "core\xE0",
    co: "cors",
    ht: "crioll d'Hait\xED",
    hr: "croat",
    da: "dan\xE8s",
    dv: "divehi",
    doi: "dogri",
    sk: "eslovac",
    sl: "eslov\xE8",
    eo: "esperanto",
    et: "estoni\xE0",
    ee: "ewe",
    fi: "fin\xE8s",
    fr: "franc\xE8s",
    fy: "fris\xF3",
    gd: "ga\xE8lic escoc\xE8s",
    gl: "gallec",
    cy: "gal\xB7l\xE8s",
    lg: "ganda",
    ka: "georgi\xE0",
    el: "grec",
    gn: "guaran\xED",
    gu: "gujarati",
    ha: "haussa",
    haw: "hawai\xE0",
    he: "hebreu",
    hi: "hindi",
    hmn: "hmong",
    hu: "hongar\xE8s",
    yi: "\xEDdix",
    ig: "igbo",
    ilo: "ilocano",
    id: "indonesi",
    yo: "ioruba",
    ga: "irland\xE8s",
    is: "island\xE8s",
    it: "itali\xE0",
    ja: "japon\xE8s",
    jv: "javan\xE8s",
    kn: "kannada",
    kk: "kazakh",
    km: "khmer",
    ky: "kirgu\xEDs",
    kri: "krio",
    ku: "kurd (Kurmanji)",
    ckb: "kurd (sorani)",
    lo: "laosi\xE0",
    lv: "let\xF3",
    ln: "lingala",
    lt: "litu\xE0",
    la: "llat\xED",
    lb: "luxemburgu\xE8s",
    mk: "maced\xF2nic",
    mai: "maithili",
    ms: "malai",
    ml: "malai\xE0lam",
    mg: "malgaix",
    mt: "malt\xE8s",
    mi: "maori",
    mr: "marathi",
    "mni-Mtei": "meitei (manipur\xED)",
    lus: "mizo",
    mn: "mongol",
    nl: "neerland\xE8s",
    ne: "nepal\xE8s",
    no: "noruec",
    or: "oriya",
    om: "oromo",
    ps: "paixtu",
    fa: "persa",
    pl: "polon\xE8s",
    pt: "portugu\xE8s",
    pa: "punjabi",
    qu: "qu\xEDtxua",
    ro: "roman\xE8s",
    rw: "ruand\xE8s",
    ru: "rus",
    sm: "samo\xE0",
    sa: "s\xE0nscrit",
    nso: "sepedi",
    sr: "serbi",
    sn: "shona",
    sd: "sindi",
    si: "singal\xE8s",
    so: "somali",
    st: "sotho",
    sw: "suahili",
    sv: "suec",
    su: "sundan\xE8s",
    tg: "tadjik",
    tl: "tagal",
    th: "tai",
    ta: "t\xE0mil",
    tt: "t\xE0tar",
    te: "telugu",
    ti: "tigrinya",
    ts: "tsonga",
    tr: "turc",
    tk: "turcman",
    ak: "twi",
    cs: "txec",
    uk: "ucra\xEFn\xE8s",
    ug: "uigur",
    ur: "urd\xFA",
    uz: "uzbek",
    vi: "vietnamita",
    xh: "xhosa",
    "zh-CN": "xin\xE8s (simplificat)",
    "zh-TW": "xin\xE8s (tradicional)",
    ny: "xixewa",
    zu: "zul\xFA",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  "zh-CN": {
    sq: "\u963F\u5C14\u5DF4\u5C3C\u4E9A\u8BED",
    ar: "\u963F\u62C9\u4F2F\u8BED",
    am: "\u963F\u59C6\u54C8\u62C9\u8BED",
    as: "\u963F\u8428\u59C6\u8BED",
    az: "\u963F\u585E\u62DC\u7586\u8BED",
    ee: "\u57C3\u7EF4\u8BED",
    ay: "\u827E\u9A6C\u62C9\u8BED",
    ga: "\u7231\u5C14\u5170\u8BED",
    et: "\u7231\u6C99\u5C3C\u4E9A\u8BED",
    or: "\u5965\u5229\u4E9A\u8BED",
    om: "\u5965\u7F57\u83AB\u8BED",
    eu: "\u5DF4\u65AF\u514B\u8BED",
    be: "\u767D\u4FC4\u7F57\u65AF\u8BED",
    bm: "\u73ED\u5DF4\u62C9\u8BED",
    bg: "\u4FDD\u52A0\u5229\u4E9A\u8BED",
    is: "\u51B0\u5C9B\u8BED",
    pl: "\u6CE2\u5170\u8BED",
    bs: "\u6CE2\u65AF\u5C3C\u4E9A\u8BED",
    fa: "\u6CE2\u65AF\u8BED",
    bho: "\u535A\u6770\u666E\u5C14\u8BED",
    af: "\u5E03\u5C14\u8BED(\u5357\u975E\u8377\u5170\u8BED)",
    tt: "\u9791\u977C\u8BED",
    da: "\u4E39\u9EA6\u8BED",
    de: "\u5FB7\u8BED",
    dv: "\u8FEA\u7EF4\u5E0C\u8BED",
    ti: "\u8482\u683C\u5C3C\u4E9A\u8BED",
    doi: "\u591A\u683C\u6765\u8BED",
    ru: "\u4FC4\u8BED",
    fr: "\u6CD5\u8BED",
    sa: "\u68B5\u8BED",
    tl: "\u83F2\u5F8B\u5BBE\u8BED",
    fi: "\u82AC\u5170\u8BED",
    fy: "\u5F17\u91CC\u897F\u8BED",
    km: "\u9AD8\u68C9\u8BED",
    ka: "\u683C\u9C81\u5409\u4E9A\u8BED",
    gom: "\u8D21\u6839\u8BED",
    gu: "\u53E4\u5409\u62C9\u7279\u8BED",
    gn: "\u74DC\u62C9\u5C3C\u8BED",
    kk: "\u54C8\u8428\u514B\u8BED",
    ht: "\u6D77\u5730\u514B\u91CC\u5965\u5C14\u8BED",
    ko: "\u97E9\u8BED",
    ha: "\u8C6A\u8428\u8BED",
    nl: "\u8377\u5170\u8BED",
    ky: "\u5409\u5C14\u5409\u65AF\u8BED",
    gl: "\u52A0\u5229\u897F\u4E9A\u8BED",
    ca: "\u52A0\u6CF0\u7F57\u5C3C\u4E9A\u8BED",
    cs: "\u6377\u514B\u8BED",
    kn: "\u5361\u7EB3\u8FBE\u8BED",
    co: "\u79D1\u897F\u5609\u8BED",
    kri: "\u514B\u91CC\u5965\u5C14\u8BED",
    hr: "\u514B\u7F57\u5730\u4E9A\u8BED",
    qu: "\u514B\u4E18\u4E9A\u8BED",
    ku: "\u5E93\u5C14\u5FB7\u8BED\uFF08\u5E93\u5C14\u66FC\u5409\u8BED\uFF09",
    ckb: "\u5E93\u5C14\u5FB7\u8BED\uFF08\u7D22\u62C9\u5C3C\uFF09",
    la: "\u62C9\u4E01\u8BED",
    lv: "\u62C9\u8131\u7EF4\u4E9A\u8BED",
    lo: "\u8001\u631D\u8BED",
    lt: "\u7ACB\u9676\u5B9B\u8BED",
    ln: "\u6797\u683C\u62C9\u8BED",
    lg: "\u5362\u5E72\u8FBE\u8BED",
    lb: "\u5362\u68EE\u5821\u8BED",
    rw: "\u5362\u65FA\u8FBE\u8BED",
    ro: "\u7F57\u9A6C\u5C3C\u4E9A\u8BED",
    mg: "\u9A6C\u5C14\u52A0\u4EC0\u8BED",
    mt: "\u9A6C\u8033\u4ED6\u8BED",
    mr: "\u9A6C\u62C9\u5730\u8BED",
    ml: "\u9A6C\u62C9\u96C5\u62C9\u59C6\u8BED",
    ms: "\u9A6C\u6765\u8BED",
    mk: "\u9A6C\u5176\u987F\u8BED",
    mai: "\u8FC8\u8482\u5229\u8BED",
    mi: "\u6BDB\u5229\u8BED",
    "mni-Mtei": "\u6885\u6CF0\u8BED\uFF08\u66FC\u5C3C\u666E\u5C14\u8BED\uFF09",
    mn: "\u8499\u53E4\u8BED",
    bn: "\u5B5F\u52A0\u62C9\u8BED",
    lus: "\u7C73\u4F50\u8BED",
    my: "\u7F05\u7538\u8BED",
    hmn: "\u82D7\u8BED",
    xh: "\u5357\u975E\u79D1\u8428\u8BED",
    zu: "\u5357\u975E\u7956\u9C81\u8BED",
    ne: "\u5C3C\u6CCA\u5C14\u8BED",
    no: "\u632A\u5A01\u8BED",
    pa: "\u65C1\u906E\u666E\u8BED",
    pt: "\u8461\u8404\u7259\u8BED",
    ps: "\u666E\u4EC0\u56FE\u8BED",
    ny: "\u9F50\u5207\u74E6\u8BED",
    ak: "\u5951\u7EF4\u8BED",
    ja: "\u65E5\u8BED",
    sv: "\u745E\u5178\u8BED",
    sm: "\u8428\u6469\u4E9A\u8BED",
    sr: "\u585E\u5C14\u7EF4\u4E9A\u8BED",
    nso: "\u585E\u4F69\u8482\u8BED",
    st: "\u585E\u7D22\u6258\u8BED",
    si: "\u50E7\u4F3D\u7F57\u8BED",
    eo: "\u4E16\u754C\u8BED",
    sk: "\u65AF\u6D1B\u4F10\u514B\u8BED",
    sl: "\u65AF\u6D1B\u6587\u5C3C\u4E9A\u8BED",
    sw: "\u65AF\u74E6\u5E0C\u91CC\u8BED",
    gd: "\u82CF\u683C\u5170\u76D6\u5C14\u8BED",
    ceb: "\u5BBF\u52A1\u8BED",
    so: "\u7D22\u9A6C\u91CC\u8BED",
    tg: "\u5854\u5409\u514B\u8BED",
    te: "\u6CF0\u5362\u56FA\u8BED",
    ta: "\u6CF0\u7C73\u5C14\u8BED",
    th: "\u6CF0\u8BED",
    tr: "\u571F\u8033\u5176\u8BED",
    tk: "\u571F\u5E93\u66FC\u8BED",
    cy: "\u5A01\u5C14\u58EB\u8BED",
    ug: "\u7EF4\u543E\u5C14\u8BED",
    ur: "\u4E4C\u5C14\u90FD\u8BED",
    uk: "\u4E4C\u514B\u5170\u8BED",
    uz: "\u4E4C\u5179\u522B\u514B\u8BED",
    es: "\u897F\u73ED\u7259\u8BED",
    he: "\u5E0C\u4F2F\u6765\u8BED",
    el: "\u5E0C\u814A\u8BED",
    haw: "\u590F\u5A01\u5937\u8BED",
    sd: "\u4FE1\u5FB7\u8BED",
    hu: "\u5308\u7259\u5229\u8BED",
    sn: "\u4FEE\u7EB3\u8BED",
    hy: "\u4E9A\u7F8E\u5C3C\u4E9A\u8BED",
    ig: "\u4F0A\u535A\u8BED",
    ilo: "\u4F0A\u6D1B\u5361\u8BFA\u8BED",
    it: "\u610F\u5927\u5229\u8BED",
    yi: "\u610F\u7B2C\u7EEA\u8BED",
    hi: "\u5370\u5730\u8BED",
    su: "\u5370\u5C3C\u5DFD\u4ED6\u8BED",
    id: "\u5370\u5C3C\u8BED",
    jv: "\u5370\u5C3C\u722A\u54C7\u8BED",
    en: "\u82F1\u8BED",
    yo: "\u7EA6\u9C81\u5DF4\u8BED",
    vi: "\u8D8A\u5357\u8BED",
    "zh-TW": "\u4E2D\u6587\uFF08\u7E41\u4F53\uFF09",
    "zh-CN": "\u4E2D\u6587\uFF08\u7B80\u4F53\uFF09",
    ts: "\u5B97\u52A0\u8BED",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  "zh-TW": {
    tr: "\u571F\u8033\u5176\u6587",
    tk: "\u571F\u5EAB\u66FC\u6587",
    "zh-TW": "\u4E2D\u6587 (\u7E41\u9AD4)",
    "zh-CN": "\u4E2D\u6587 (\u7C21\u9AD4)",
    da: "\u4E39\u9EA5\u6587",
    eu: "\u5DF4\u65AF\u514B\u6587",
    ja: "\u65E5\u6587",
    mi: "\u6BDB\u5229\u6587",
    jv: "\u722A\u54C7\u6587",
    eo: "\u4E16\u754C\u8A9E",
    gl: "\u52A0\u91CC\u897F\u4E9E\u6587",
    ca: "\u52A0\u6CF0\u7F85\u5C3C\u4E9E\u6587",
    kn: "\u5361\u7D0D\u9054\u6587",
    ne: "\u5C3C\u6CCA\u723E\u6587",
    af: "\u5E03\u723E\u6587",
    fy: "\u5F17\u5229\u7136\u6587",
    gn: "\u74DC\u62C9\u5C3C\u6587",
    be: "\u767D\u4FC4\u7F85\u65AF\u6587",
    lt: "\u7ACB\u9676\u5B9B\u6587",
    ilo: "\u4F0A\u6D1B\u5361\u8AFE\u6587",
    ig: "\u4F0A\u535A\u6587",
    is: "\u51B0\u5CF6\u6587",
    hu: "\u5308\u7259\u5229\u6587",
    id: "\u5370\u5C3C\u6587",
    su: "\u5370\u5C3C\u5DFD\u4ED6\u6587",
    hi: "\u5370\u5EA6\u6587",
    gu: "\u5370\u5EA6\u53E4\u54C8\u62C9\u5730\u6587",
    ky: "\u5409\u723E\u5409\u65AF\u6587",
    lus: "\u7C73\u4F50\u6587",
    ay: "\u827E\u99AC\u62C9\u6587",
    es: "\u897F\u73ED\u7259\u6587",
    qu: "\u514B\u4E18\u4E9E\u6587",
    kri: "\u514B\u91CC\u5967\u6587",
    hr: "\u514B\u7F85\u57C3\u897F\u4E9E\u6587",
    he: "\u5E0C\u4F2F\u4F86\u6587",
    el: "\u5E0C\u81D8\u6587",
    hy: "\u4E9E\u7F8E\u5C3C\u4E9E\u6587",
    az: "\u4E9E\u585E\u62DC\u7136\u6587",
    nso: "\u4F69\u8482\u6587",
    ny: "\u5947\u5207\u74E6\u6587",
    bn: "\u5B5F\u52A0\u62C9\u6587",
    ts: "\u5B97\u5361\u6587",
    ps: "\u5E15\u65BD\u5716\u6587",
    la: "\u62C9\u4E01\u6587",
    lv: "\u62C9\u812B\u7DAD\u4E9E\u6587",
    ln: "\u6797\u683C\u62C9\u6587",
    fr: "\u6CD5\u6587",
    bs: "\u6CE2\u58EB\u5C3C\u4E9E\u6587",
    fa: "\u6CE2\u65AF\u6587",
    pl: "\u6CE2\u862D\u6587",
    fi: "\u82AC\u862D\u6587",
    am: "\u963F\u59C6\u54C8\u62C9\u6587",
    ar: "\u963F\u62C9\u4F2F\u6587",
    sq: "\u963F\u723E\u5DF4\u5C3C\u4E9E\u6587",
    as: "\u963F\u85A9\u59C6\u6587",
    ru: "\u4FC4\u6587",
    bg: "\u4FDD\u52A0\u5229\u4E9E\u6587",
    sd: "\u4FE1\u5FB7\u6587",
    xh: "\u5357\u975E\u67EF\u85A9\u6587",
    zu: "\u5357\u975E\u7956\u9B6F\u6587",
    kk: "\u54C8\u85A9\u514B\u6587",
    ak: "\u5951\u7DAD\u6587",
    cy: "\u5A01\u723E\u65AF\u6587",
    co: "\u79D1\u897F\u5609\u6587",
    hmn: "\u82D7\u6587",
    en: "\u82F1\u6587",
    dv: "\u8FEA\u7DAD\u5E0C\u6587",
    ee: "\u57C3\u7DAD\u6587",
    haw: "\u590F\u5A01\u5937\u6587",
    ku: "\u5EAB\u5FB7\u6587 (\u5EAB\u723E\u66FC\u5409\u6587)",
    ckb: "\u5EAB\u5FB7\u6587 (\u7D22\u62C9\u5C3C\u6587)",
    no: "\u632A\u5A01\u6587",
    pa: "\u65C1\u906E\u666E\u6587",
    th: "\u6CF0\u6587",
    ta: "\u6CF0\u7C73\u723E\u6587",
    te: "\u6CF0\u76E7\u56FA\u6587",
    ht: "\u6D77\u5730\u514B\u91CC\u5967\u6587",
    lg: "\u70CF\u5E72\u9054\u6587",
    uk: "\u70CF\u514B\u862D\u6587",
    uz: "\u70CF\u8332\u5225\u514B\u6587",
    ur: "\u70CF\u723E\u90FD\u6587",
    bm: "\u73ED\u5DF4\u62C9\u6587",
    so: "\u7D22\u99AC\u91CC\u6587",
    gom: "\u8CA2\u6839\u6587",
    mt: "\u99AC\u8033\u4ED6\u6587",
    ms: "\u99AC\u4F86\u6587",
    mk: "\u99AC\u5176\u9813\u6587",
    mg: "\u99AC\u62C9\u52A0\u65AF\u6587",
    mr: "\u99AC\u62C9\u5730\u6587",
    ml: "\u99AC\u62C9\u96C5\u62C9\u59C6\u6587",
    km: "\u9AD8\u68C9\u6587",
    ceb: "\u5BBF\u9727\u6587",
    cs: "\u6377\u514B\u6587",
    "mni-Mtei": "\u6885\u6CF0\u6587 (\u66FC\u5C3C\u666E\u723E\u6587)",
    sa: "\u68B5\u6587",
    sn: "\u7D39\u7D0D\u6587",
    nl: "\u8377\u862D\u6587",
    bho: "\u535A\u6770\u666E\u723E\u6587",
    ka: "\u55AC\u6CBB\u4E9E\u6587",
    sw: "\u65AF\u74E6\u5E0C\u91CC\u6587",
    sk: "\u65AF\u6D1B\u4F10\u514B\u6587",
    sl: "\u65AF\u6D1B\u7DAD\u5C3C\u4E9E\u6587",
    tl: "\u83F2\u5F8B\u8CD3\u6587",
    vi: "\u8D8A\u5357\u6587",
    tg: "\u5854\u5409\u514B\u6587",
    sr: "\u585E\u723E\u7DAD\u4E9E\u6587",
    om: "\u5967\u7F85\u83AB\u6587",
    yi: "\u610F\u7B2C\u7DD2\u6587",
    et: "\u611B\u6C99\u5C3C\u4E9E\u6587",
    ga: "\u611B\u723E\u862D\u6587",
    sv: "\u745E\u5178\u6587",
    st: "\u745F\u7D22\u6258\u6587",
    it: "\u7FA9\u5927\u5229\u6587",
    pt: "\u8461\u8404\u7259\u6587",
    ti: "\u8482\u683C\u91CC\u4E9E\u6587",
    doi: "\u9053\u683C\u91CC\u6587",
    ug: "\u7DAD\u543E\u723E\u6587",
    mn: "\u8499\u53E4\u6587",
    ha: "\u8C6A\u6C99\u6587",
    lo: "\u5BEE\u6587",
    de: "\u5FB7\u6587",
    or: "\u6B50\u5229\u4E9E\u6587 (\u5967\u91CC\u96C5\u6587)",
    my: "\u7DEC\u7538\u6587",
    rw: "\u76E7\u5B89\u9054\u6587",
    lb: "\u76E7\u68EE\u5821\u6587",
    si: "\u932B\u862D\u6587",
    yo: "\u512A\u9B6F\u5DF4\u6587",
    mai: "\u9081\u8482\u5229\u6587",
    ko: "\u97D3\u6587",
    sm: "\u85A9\u6469\u4E9E\u6587",
    ro: "\u7F85\u99AC\u5C3C\u4E9E\u6587",
    gd: "\u8607\u683C\u862D\u7684\u84CB\u723E\u6587",
    tt: "\u97C3\u977C\u6587",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  hr: {
    af: "afrikaans",
    ay: "ajmarski",
    sq: "albanski",
    am: "amharik",
    ar: "arapski",
    hy: "armenski",
    as: "asamski",
    az: "azerbajd\u017Eanski",
    bm: "bambarski",
    eu: "baskijski",
    bn: "bengalski",
    bho: "bhojpurski",
    be: "bjeloruski",
    bs: "bosanski",
    bg: "bugarski",
    my: "burmanski",
    ceb: "cebuano",
    ny: "chichewa",
    cs: "\u010De\u0161ki",
    da: "danski",
    dv: "divehi",
    doi: "dogrijski",
    en: "engleski",
    eo: "esperanto",
    et: "estonski",
    ee: "eve",
    fi: "finski",
    fr: "francuski",
    fy: "frizijski",
    gl: "galski",
    el: "gr\u010Dki",
    ka: "gruzijski",
    gn: "guarani",
    gu: "gujarati",
    ht: "hai\u0107ansko-kreolski",
    ha: "hausa",
    haw: "havajski",
    he: "hebrejski",
    hi: "hindu",
    hmn: "hmong",
    hr: "hrvatski",
    ig: "igbo",
    ilo: "ilokanski",
    id: "indonezijski",
    ga: "irski",
    is: "islandski",
    ja: "japanski",
    jv: "javanski",
    yi: "jidi\u0161",
    yo: "joruba",
    kn: "kannada",
    ca: "katalonski",
    kk: "kaza\u0161ki",
    qu: "ke\u010Duanski",
    "zh-CN": "kineski (pojednostavljeni)",
    "zh-TW": "kineski (tradicionalni)",
    rw: "kinyarwanda",
    ky: "kirgistanski",
    km: "kmerski",
    gom: "konkanski",
    ko: "korejski",
    co: "korzi\u010Dki",
    kri: "krio",
    ku: "kurdski (kurmanji)",
    ckb: "kurdski (soranski)",
    lo: "laoski",
    la: "latinski",
    lv: "latvijski/letonski",
    ln: "lingala",
    lt: "litvanski",
    lg: "luganda",
    lb: "luksembur\u0161ki",
    hu: "ma\u0111arski",
    mai: "maithili",
    mk: "makedonski",
    ml: "malajalam",
    ms: "malezijski",
    mg: "malga\u0161ki",
    mt: "malte\u0161ki",
    mi: "maori",
    mr: "marati",
    "mni-Mtei": "meiteilon (manipurski)",
    lus: "mizo",
    mn: "mongolski",
    ne: "nepalski",
    nl: "nizozemski",
    no: "norve\u0161ki",
    de: "njema\u010Dki",
    or: "odijski (orijski)",
    om: "oromo",
    ps: "pa\u0161tu",
    fa: "perzijski",
    pl: "poljski",
    pt: "portugalski",
    pa: "punjabi",
    ro: "rumunjski",
    ru: "ruski",
    sn: "sahona",
    sm: "samoanski",
    sa: "sanskrt",
    nso: "sepedi",
    st: "sesotski",
    sd: "sindi",
    si: "singalski",
    sk: "slova\u010Dki",
    sl: "slovenski",
    so: "somalijski",
    sr: "srpski",
    su: "sundanski",
    sw: "svahili",
    gd: "\u0161kotski keltski",
    es: "\u0161panjolski",
    sv: "\u0161vedski",
    tg: "tad\u017Eik",
    tl: "tagalog",
    th: "tajlandski",
    it: "talijanski",
    ta: "tamilski",
    tt: "tatarski",
    te: "telugu",
    ti: "tigrinja",
    ts: "tsonga",
    tk: "turkmenski",
    tr: "turski",
    ak: "tvi",
    ug: "ujgurski",
    uk: "ukrajinski",
    ur: "urdu",
    uz: "uzbekistanski",
    cy: "vel\u0161ki",
    vi: "vijetnamski",
    xh: "xhosa",
    zu: "zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  cs: {
    af: "afrik\xE1n\u0161tina",
    sq: "alb\xE1n\u0161tina",
    am: "amhar\u0161tina",
    en: "angli\u010Dtina",
    ar: "arab\u0161tina",
    hy: "arm\xE9n\u0161tina",
    as: "\xE1s\xE1m\u0161tina",
    ay: "aymar\u0161tina",
    az: "\xE1zerb\xE1jd\u017E\xE1n\u0161tina",
    bm: "bambar\u0161tina",
    my: "barm\u0161tina",
    eu: "baski\u010Dtina",
    be: "b\u011Bloru\u0161tina",
    bn: "beng\xE1l\u0161tina",
    bho: "bh\xF3d\u017Epur\u0161tina",
    bs: "bosen\u0161tina",
    bg: "bulhar\u0161tina",
    ceb: "cebu\xE1n\u0161tina",
    cs: "\u010De\u0161tina",
    ny: "\u010Di\u010Dev\u0161tina",
    "zh-TW": "\u010D\xEDn\u0161tina (tradi\u010Dn\xED)",
    "zh-CN": "\u010D\xEDn\u0161tina (zjednodu\u0161en\xE1)",
    da: "d\xE1n\u0161tina",
    doi: "d\xF3gr\xED",
    eo: "esperanto",
    et: "eston\u0161tina",
    ee: "ewe\u0161tina",
    tl: "filip\xEDn\u0161tina",
    fi: "fin\u0161tina",
    fr: "francouz\u0161tina",
    fy: "fr\xED\u0161tina",
    gl: "galicij\u0161tina",
    ka: "gruz\xEDn\u0161tina",
    gn: "guaran\xED",
    gu: "gud\u017Ear\xE1t\u0161tina",
    ht: "haitsk\xE1 kreol\u0161tina",
    ha: "hau\u0161tina",
    haw: "havaj\u0161tina",
    he: "hebrej\u0161tina",
    hi: "hind\u0161tina",
    hmn: "hmong\u0161tina",
    nl: "holand\u0161tina",
    hr: "chorvat\u0161tina",
    ig: "igbo\u0161tina",
    ilo: "ilok\xE1n\u0161tina",
    id: "indon\xE9\u0161tina",
    ga: "ir\u0161tina",
    is: "island\u0161tina",
    it: "ital\u0161tina",
    ja: "japon\u0161tina",
    jv: "jav\xE1n\u0161tina",
    yi: "jidi\u0161",
    yo: "jorub\u0161tina",
    kn: "kannad\u0161tina",
    ca: "katal\xE1n\u0161tina",
    kk: "kaza\u0161tina",
    qu: "ke\u010Du\xE1n\u0161tina",
    km: "khmer\u0161tina",
    gom: "konk\xE1n\u0161tina",
    ko: "korej\u0161tina",
    co: "korsi\u010Dtina",
    kri: "kr\xEDj\u0161tina",
    ku: "kurd\u0161tina",
    ckb: "kurd\u0161tina (sor\xE1n\xED)",
    ky: "kyrgyz\u0161tina",
    lo: "lao\u0161tina",
    la: "latina",
    ln: "lingal\u0161tina",
    lt: "litev\u0161tina",
    lv: "loty\u0161tina",
    lb: "lucembur\u0161tina",
    lg: "lugand\u0161tina",
    hu: "ma\u010Far\u0161tina",
    mai: "maithil\u0161tina",
    mk: "makedon\u0161tina",
    ml: "malaj\xE1lam\u0161tina",
    ms: "malaj\u0161tina",
    dv: "malediv\u0161tina",
    mg: "malga\u0161tina",
    mt: "malt\u0161tina",
    "mni-Mtei": "manipur\u0161tina",
    mi: "maor\u0161tina",
    mr: "mar\xE1t\u0161tina",
    lus: "mizo\u0161tina",
    mn: "mongol\u0161tina",
    de: "n\u011Bm\u010Dina",
    ne: "nep\xE1l\u0161tina",
    no: "nor\u0161tina",
    om: "orom\u0161tina",
    pa: "pand\u017E\xE1b\u0161tina",
    ps: "pa\u0161t\u0161tina",
    fa: "per\u0161tina",
    pl: "pol\u0161tina",
    pt: "portugal\u0161tina",
    ro: "rumun\u0161tina",
    ru: "ru\u0161tina",
    rw: "rwand\u0161tina",
    el: "\u0159e\u010Dtina",
    sm: "samojsk\xE1 polyn\xE9\u0161tina",
    sa: "sanskrt",
    nso: "sepedi",
    st: "sesoth\u0161tina",
    sd: "sindhij\u0161tina",
    si: "sinh\xE1l\u0161tina",
    gd: "skotsk\xE1 gael\u0161tina",
    sk: "sloven\u0161tina",
    sl: "slovin\u0161tina",
    so: "som\xE1l\u0161tina",
    sr: "srb\u0161tina",
    su: "sund\xE1n\u0161tina",
    sw: "svahil\u0161tina",
    sn: "\u0161on\u0161tina",
    es: "\u0161pan\u011Bl\u0161tina",
    sv: "\u0161v\xE9d\u0161tina",
    tg: "t\xE1d\u017Ei\u010Dtina",
    ta: "tamil\u0161tina",
    tt: "tatar\u0161tina",
    te: "telu\u017E\u0161tina",
    th: "thaj\u0161tina",
    ti: "tigrin\u0161tina",
    ts: "tsong\u0161tina",
    tr: "ture\u010Dtina",
    tk: "turkmen\u0161tina",
    ak: "twi\u0161tina",
    ug: "ujgur\u0161tina",
    uk: "ukrajin\u0161tina",
    ur: "urd\u0161tina",
    or: "urij\u0161tina",
    uz: "uzbe\u010Dtina",
    cy: "vel\u0161tina",
    vi: "vietnam\u0161tina",
    xh: "xho\u0161tina",
    zu: "zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  da: {
    af: "Afrikaans",
    sq: "Albansk",
    am: "Amharisk",
    ar: "Arabisk",
    hy: "Armensk",
    az: "Aserbajdsjansk",
    as: "Assamesisk",
    ay: "Aymara",
    bm: "Bambara",
    eu: "Baskisk",
    bn: "Bengali",
    bho: "Bhojpuri",
    bs: "Bosnisk",
    bg: "Bulgarsk",
    my: "Burmesisk",
    ceb: "Cebuano",
    ny: "Chichewa",
    da: "Dansk",
    dv: "Dhivehi",
    doi: "Dogri",
    en: "Engelsk",
    eo: "Esperanto",
    et: "Estisk",
    ee: "Ewe",
    fi: "Finsk",
    fr: "Fransk",
    fy: "Frisisk",
    gl: "Galicisk",
    ka: "Georgisk",
    el: "Gr\xE6sk",
    gn: "Guarani",
    gu: "Gujarati",
    ht: "Haitisk kreolsk",
    ha: "Hausa",
    haw: "Hawaiiansk",
    he: "Hebraisk",
    hi: "Hindi",
    hmn: "Hmong",
    be: "Hviderussisk",
    ig: "Igbo",
    ilo: "Ilokano",
    id: "Indonesisk",
    ga: "Irsk",
    is: "Islandsk",
    it: "Italiensk",
    ja: "Japansk",
    jv: "Javanesisk",
    yi: "Jiddisch",
    kn: "Kannada",
    kk: "Kasakhisk",
    ca: "Katalansk",
    km: "Khmer",
    "zh-CN": "Kinesisk (forenklet)",
    "zh-TW": "Kinesisk (traditionelt)",
    rw: "Kinyarwanda",
    ky: "Kirgisk",
    gom: "Konkani",
    ko: "Koreansk",
    co: "Korsikansk",
    kri: "Krio",
    hr: "Kroatisk",
    ku: "Kurdisk (kurmanji)",
    ckb: "Kurdisk (sorani)",
    lo: "Laotisk",
    la: "Latin",
    lv: "Lettisk",
    ln: "Lingala",
    lt: "Litauisk",
    lg: "Luganda",
    lb: "Luxembourgsk",
    mai: "Maithili",
    mk: "Makedonsk",
    mg: "Malagassisk",
    ms: "Malajisk",
    ml: "Malayalam",
    mt: "Maltesisk",
    mi: "Maori",
    mr: "Marathi",
    "mni-Mtei": "Meiteilon (manipuri)",
    lus: "Mizo",
    mn: "Mongolsk",
    nl: "Nederlandsk",
    ne: "Nepalesisk",
    no: "Norsk",
    or: "Odia (oriya)",
    om: "Oromo",
    ps: "Pashto",
    fa: "Persisk",
    pl: "Polsk",
    pt: "Portugisisk",
    pa: "Punjabi",
    qu: "Quechua",
    ro: "Rum\xE6nsk",
    ru: "Russisk",
    sm: "Samoansk",
    sa: "Sanskrit",
    nso: "Sepedi",
    sr: "Serbisk",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Sinhala",
    gd: "Skotsk g\xE6lisk",
    sk: "Slovakisk",
    sl: "Slovensk",
    so: "Somalisk",
    es: "Spansk",
    su: "Sundanesisk",
    sv: "Svensk",
    sw: "Swahili",
    tg: "Tadsjikisk",
    tl: "Tagalog",
    ta: "Tamil",
    tt: "Tatarisk",
    te: "Telugu",
    th: "Thailandsk",
    ti: "Tigrinyansk",
    cs: "Tjekkisk",
    ts: "Tsonga",
    tk: "Turkmensk",
    ak: "Twi",
    tr: "Tyrkisk",
    de: "Tysk",
    ug: "Uighursk",
    uk: "Ukrainsk",
    hu: "Ungarsk",
    ur: "Urdu",
    uz: "Usbekisk",
    vi: "Vietnamesisk",
    cy: "Walisisk",
    xh: "Xhosa",
    yo: "Yoruba",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  nl: {
    af: "Afrikaans",
    sq: "Albanees",
    am: "Amharisch",
    ar: "Arabisch",
    hy: "Armeens",
    as: "Assamees",
    ay: "Aymara",
    az: "Azerbeidzjaans",
    bm: "Bambara",
    eu: "Baskisch",
    be: "Belarussisch",
    bn: "Bengaals",
    bho: "Bhojpuri",
    my: "Birmaans",
    bs: "Bosnisch",
    bg: "Bulgaars",
    ca: "Catalaans",
    ceb: "Cebuano",
    ny: "Chichewa",
    "zh-TW": "Chinees (traditioneel)",
    "zh-CN": "Chinees (vereenvoudigd)",
    co: "Corsicaans",
    da: "Deens",
    dv: "Dhivehi",
    doi: "Dogri",
    de: "Duits",
    en: "Engels",
    eo: "Esperanto",
    et: "Ests",
    ee: "Ewe",
    fi: "Fins",
    fr: "Frans",
    fy: "Fries",
    gl: "Galicisch",
    ka: "Georgisch",
    el: "Grieks",
    gn: "Guarani",
    gu: "Gujarati",
    ht: "Ha\xEFtiaans Creools",
    ha: "Hausa",
    haw: "Hawa\xEFaans",
    he: "Hebreeuws",
    hi: "Hindi",
    hmn: "Hmong",
    hu: "Hongaars",
    ga: "Iers",
    ig: "Igbo",
    is: "IJslands",
    ilo: "Ilocano",
    id: "Indonesisch",
    it: "Italiaans",
    ja: "Japans",
    jv: "Javaans",
    yi: "Jiddisch",
    kn: "Kannada",
    kk: "Kazachs",
    km: "Khmer",
    rw: "Kinyarwanda",
    ky: "Kirgizisch",
    ku: "Koerdisch (Kurmanji)",
    ckb: "Koerdisch (Sorani)",
    gom: "Konkani",
    ko: "Koreaans",
    kri: "Krio",
    hr: "Kroatisch",
    lo: "Lao",
    la: "Latijn",
    lv: "Lets",
    ln: "Lingala",
    lt: "Litouws",
    lg: "Luganda",
    lb: "Luxemburgs",
    mk: "Macedonisch",
    mai: "Maithili",
    mg: "Malagasi",
    ml: "Malayalam",
    ms: "Maleis",
    mt: "Maltees",
    mi: "Maori",
    mr: "Marathi",
    "mni-Mtei": "Meiteilon (Manipuri)",
    lus: "Mizo",
    mn: "Mongools",
    nl: "Nederlands",
    ne: "Nepalees",
    no: "Noors",
    or: "Odia (Oriya)",
    ug: "Oeigoers",
    uk: "Oekra\xEFens",
    uz: "Oezbeeks",
    om: "Oromo",
    ps: "Pashto",
    fa: "Perzisch",
    pl: "Pools",
    pt: "Portugees",
    pa: "Punjabi",
    qu: "Quechua",
    ro: "Roemeens",
    ru: "Russisch",
    sm: "Samoaans",
    sa: "Sanskriet",
    gd: "Schots Keltisch",
    nso: "Sepedi",
    sr: "Servisch",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Sinhala",
    sk: "Slovaaks",
    sl: "Sloveens",
    su: "Soendanees",
    so: "Somalisch",
    es: "Spaans",
    sw: "Swahili",
    tg: "Tadzjieks",
    tl: "Tagalog",
    ta: "Tamil",
    tt: "Tataars",
    te: "Telugu",
    th: "Thai",
    ti: "Tigrinya",
    cs: "Tsjechisch",
    ts: "Tsonga",
    tk: "Turkmeens",
    tr: "Turks",
    ak: "Twi",
    ur: "Urdu",
    vi: "Vietnamees",
    cy: "Wels",
    xh: "Xhosa",
    yo: "Yoruba",
    zu: "Zoeloe",
    sv: "Zweeds",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  fi: {
    af: "afrikaans",
    ay: "aimara",
    sq: "albania",
    am: "amhara",
    ar: "arabia",
    hy: "armenia",
    as: "assami",
    az: "azeri",
    bm: "bambara",
    eu: "baski",
    bn: "bengali",
    bho: "bhod\u017Epuri",
    bs: "bosnia",
    bg: "bulgaria",
    my: "burma",
    ceb: "cebu",
    dv: "divehi",
    doi: "dogri",
    en: "englanti",
    es: "espanja",
    eo: "esperanto",
    ee: "ewe",
    fy: "friisi",
    gl: "galicia",
    ka: "gruusia",
    gn: "guarani",
    gu: "gujarati",
    ht: "haitinkreoli",
    ha: "hausa",
    haw: "havaiji",
    he: "heprea",
    hi: "hindi",
    hmn: "hmong",
    nl: "hollanti",
    ig: "igbo",
    ga: "iiri",
    ilo: "ilokano",
    id: "indonesia",
    is: "islanti",
    it: "italia",
    jv: "jaava",
    ja: "japani",
    yi: "jiddi\u0161",
    yo: "joruba",
    kn: "kannada",
    ca: "katalaani",
    kk: "kazakki",
    qu: "ket\u0161ua",
    km: "khmer",
    "zh-TW": "kiina (perinteinen)",
    "zh-CN": "kiina (yksinkertaistettu)",
    rw: "kinyarwanda",
    gom: "konkani",
    ko: "korea",
    co: "korsika",
    el: "kreikka",
    kri: "krio",
    hr: "kroatia",
    ku: "kurdi (kurmand\u017Ei)",
    ckb: "kurdi (soran\xEE)",
    cy: "kymri",
    ky: "kyrgyz",
    lo: "lao",
    la: "latina",
    lv: "latvia",
    lt: "liettua",
    ln: "lingala",
    lg: "luganda",
    lb: "luxemburg",
    mai: "maithili",
    mk: "makedonia",
    mg: "malagasy",
    ms: "malaiji",
    ml: "malayalam",
    mt: "malta",
    mi: "maori",
    mr: "marathi",
    "mni-Mtei": "meiteilon (manipuri)",
    lus: "mizo",
    mn: "mongolia",
    ne: "nepali",
    ny: "njand\u017Ea",
    no: "norja",
    or: "odia (orija)",
    om: "oromo",
    ps: "pashto",
    fa: "persia",
    pt: "portugali",
    pa: "punjabi",
    pl: "puola",
    fr: "ranska",
    ro: "romania",
    sv: "ruotsi",
    de: "saksa",
    sm: "samoa",
    sa: "sanskriitti",
    nso: "sepedi",
    sr: "serbia",
    st: "sesotho",
    sn: "shona",
    sd: "sindhi",
    si: "sinhali",
    gd: "skottigaeli",
    sk: "slovakia",
    sl: "slovenia",
    so: "somali",
    su: "sundaneesi",
    fi: "suomi",
    sw: "swahili",
    tg: "tad\u017Eikki",
    tl: "tagalog",
    ta: "tamili",
    da: "tanska",
    tt: "tataari",
    te: "telugu",
    th: "thai",
    ti: "tigrinja",
    cs: "tsekki",
    ts: "tsonga",
    tr: "turkki",
    tk: "turkmeeni",
    ak: "twi",
    ug: "uiguuri",
    uk: "ukraina",
    hu: "unkari",
    ur: "urdu",
    uz: "uzbekki",
    be: "valkoven\xE4j\xE4",
    ru: "ven\xE4j\xE4",
    vi: "vietnam",
    et: "viro",
    xh: "xhosa",
    zu: "zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  fr: {
    af: "afrikaans",
    sq: "albanais",
    de: "allemand",
    am: "amharique",
    en: "anglais",
    ar: "arabe",
    hy: "arm\xE9nien",
    as: "assamais",
    ay: "aymara",
    az: "az\xE9ri",
    bm: "bambara",
    eu: "basque",
    bn: "bengali",
    bho: "bhodjpouri",
    be: "bi\xE9lorusse",
    my: "birman",
    bs: "bosniaque",
    bg: "bulgare",
    ca: "catalan",
    ceb: "cebuano",
    ny: "chichewa",
    "zh-CN": "chinois (simplifi\xE9)",
    "zh-TW": "chinois (traditionnel)",
    si: "cingalais",
    ko: "cor\xE9en",
    co: "corse",
    ht: "cr\xE9ole ha\xEFtien",
    hr: "croate",
    da: "danois",
    dv: "div\xE9hi",
    doi: "dogri",
    es: "espagnol",
    eo: "esp\xE9ranto",
    et: "estonien",
    ee: "ewe",
    fi: "finnois",
    fr: "fran\xE7ais",
    fy: "frison",
    gd: "ga\xE9lique (\xE9cosse)",
    gl: "galicien",
    cy: "gallois",
    ka: "g\xE9orgien",
    el: "grec",
    gn: "guarani",
    gu: "gujarati",
    ha: "haoussa",
    haw: "hawa\xEFen",
    he: "h\xE9breu",
    hi: "hindi",
    hmn: "hmong",
    hu: "hongrois",
    ig: "igbo",
    ilo: "ilocano",
    id: "indon\xE9sien",
    ga: "irlandais",
    is: "islandais",
    it: "italien",
    ja: "japonais",
    jv: "javanais",
    kn: "kannada",
    kk: "kazakh",
    km: "khmer",
    rw: "kinyarwanda",
    ky: "kirghiz",
    gom: "konkani",
    kri: "krio",
    ku: "kurde (kurmandji)",
    ckb: "kurde (sorani)",
    lo: "laotien",
    la: "latin",
    lv: "letton",
    ln: "lingala",
    lt: "lituanien",
    lg: "luganda",
    lb: "luxembourgeois",
    mk: "mac\xE9donien",
    mai: "ma\xEFthili",
    ms: "malaisien",
    ml: "malayalam",
    mg: "malgache",
    mt: "maltais",
    mi: "maori",
    mr: "marathi",
    "mni-Mtei": "meitei (manipuri)",
    lus: "mizo",
    mn: "mongol",
    nl: "n\xE9erlandais",
    ne: "n\xE9palais",
    no: "norv\xE9gien",
    or: "odia (oriya)",
    om: "oromo",
    ug: "ou\xEFgour",
    uz: "ouzbek",
    ps: "pacht\xF4",
    pa: "panjabi",
    fa: "persan",
    tl: "philippin",
    pl: "polonais",
    pt: "portugais",
    qu: "quechua",
    ro: "roumain",
    ru: "russe",
    sm: "samoan",
    sa: "sanscrit",
    nso: "sepedi",
    sr: "serbe",
    st: "sesotho",
    sn: "shona",
    sd: "sindh\xEE",
    sk: "slovaque",
    sl: "slov\xE8ne",
    so: "somali",
    su: "soundanais",
    sv: "su\xE9dois",
    sw: "swahili",
    tg: "tadjik",
    ta: "tamoul",
    tt: "tatar",
    cs: "tch\xE8que",
    te: "telugu",
    th: "tha\xEF",
    ti: "tigrigna",
    ts: "tsonga",
    tr: "turc",
    tk: "turkm\xE8ne",
    ak: "twi",
    uk: "ukrainien",
    ur: "urdu",
    vi: "vietnamien",
    xh: "xhosa",
    yi: "yiddish",
    yo: "yorouba",
    zu: "zoulou",
    ba: "bashkir",
    cv: "chuvash",
    mrj: "hill mari",
    kazlat: "kazakh (latin)",
    mhr: "mari",
    pap: "papiamento",
    udm: "udmurt",
    uzbcyr: "uzbek (cyrillic)",
    sah: "yakut"
  },
  de: {
    af: "Afrikaans",
    sq: "Albanisch",
    am: "Amharisch",
    ar: "Arabisch",
    hy: "Armenisch",
    az: "Aserbaidschanisch",
    as: "Assamesisch",
    ay: "Aymara",
    bm: "Bambara",
    eu: "Baskisch",
    be: "Belarussisch",
    bn: "Bengalisch",
    bho: "Bhojpuri",
    my: "Birmanisch",
    bs: "Bosnisch",
    bg: "Bulgarisch",
    ceb: "Cebuano",
    ny: "Chichewa",
    "zh-TW": "Chinesisch (traditionell)",
    "zh-CN": "Chinesisch (vereinfacht)",
    da: "D\xE4nisch",
    de: "Deutsch",
    dv: "Dhivehi",
    doi: "Dogri",
    en: "Englisch",
    eo: "Esperanto",
    et: "Estnisch",
    ee: "Ewe",
    tl: "Filipino",
    fi: "Finnisch",
    fr: "Franz\xF6sisch",
    fy: "Friesisch",
    gl: "Galizisch",
    ka: "Georgisch",
    el: "Griechisch",
    gn: "Guarani",
    gu: "Gujarati",
    ht: "Haitianisch",
    ha: "Hausa",
    haw: "Hawaiisch",
    he: "Hebr\xE4isch",
    hi: "Hindi",
    hmn: "Hmong",
    ig: "Igbo",
    ilo: "Ilokano",
    id: "Indonesisch",
    ga: "Irisch",
    is: "Isl\xE4ndisch",
    it: "Italienisch",
    ja: "Japanisch",
    jv: "Javanisch",
    yi: "Jiddisch",
    kn: "Kannada",
    kk: "Kasachisch",
    ca: "Katalanisch",
    km: "Khmer",
    rw: "Kinyarwanda",
    ky: "Kirgisisch",
    gom: "Konkani",
    ko: "Koreanisch",
    co: "Korsisch",
    kri: "Krio",
    hr: "Kroatisch",
    ku: "Kurdisch (Kurmandschi)",
    ckb: "Kurdisch (Sorani)",
    lo: "Lao",
    la: "Lateinisch",
    lv: "Lettisch",
    ln: "Lingala",
    lt: "Litauisch",
    lg: "Luganda",
    lb: "Luxemburgisch",
    mai: "Maithili",
    mg: "Malagasy",
    ml: "Malayalam",
    ms: "Malaysisch",
    mt: "Maltesisch",
    mi: "Maori",
    mr: "Marathi",
    mk: "Mazedonisch",
    "mni-Mtei": "Meitei (Manipuri)",
    lus: "Mizo",
    mn: "Mongolisch",
    ne: "Nepalesisch",
    nl: "Niederl\xE4ndisch",
    no: "Norwegisch",
    or: "Odia (Oriya)",
    om: "Oromo",
    ps: "Paschtu",
    fa: "Persisch",
    pl: "Polnisch",
    pt: "Portugiesisch",
    pa: "Punjabi",
    qu: "Quechua",
    ro: "Rum\xE4nisch",
    ru: "Russisch",
    sm: "Samoanisch",
    sa: "Sanskrit",
    gd: "Schottisch-G\xE4lisch",
    sv: "Schwedisch",
    nso: "Sepedi",
    sr: "Serbisch",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Singhalesisch",
    sk: "Slowakisch",
    sl: "Slowenisch",
    so: "Somali",
    es: "Spanisch",
    su: "Sundanesisch",
    sw: "Swahili",
    tg: "Tadschikisch",
    ta: "Tamil",
    tt: "Tatarisch",
    te: "Telugu",
    th: "Thail\xE4ndisch",
    ti: "Tigrinya",
    cs: "Tschechisch",
    ts: "Tsonga",
    tr: "T\xFCrkisch",
    tk: "Turkmenisch",
    ak: "Twi",
    ug: "Uigurisch",
    uk: "Ukrainisch",
    hu: "Ungarisch",
    ur: "Urdu",
    uz: "Usbekisch",
    vi: "Vietnamesisch",
    cy: "Walisisch",
    xh: "Xhosa",
    yo: "Yoruba",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  el: {
    en: "\u0391\u03B3\u03B3\u03BB\u03B9\u03BA\u03AC",
    az: "\u0391\u03B6\u03B5\u03C1\u03BC\u03C0\u03B1\u03CA\u03C4\u03B6\u03B1\u03BD\u03B9\u03BA\u03AC",
    ay: "\u0391\u03CA\u03BC\u03AC\u03C1\u03B1",
    sq: "\u0391\u03BB\u03B2\u03B1\u03BD\u03B9\u03BA\u03AC",
    am: "\u0391\u03BC\u03C7\u03B1\u03C1\u03B9\u03BA\u03AC",
    ar: "\u0391\u03C1\u03B1\u03B2\u03B9\u03BA\u03AC",
    hy: "\u0391\u03C1\u03BC\u03B5\u03BD\u03B9\u03BA\u03AC",
    as: "\u0391\u03C3\u03B1\u03BC\u03B9\u03BA\u03AC",
    af: "\u0391\u03C6\u03C1\u03B9\u03BA\u03AC\u03B1\u03BD\u03C2",
    eu: "\u0392\u03B1\u03C3\u03BA\u03B9\u03BA\u03AC",
    bn: "\u0392\u03B5\u03B3\u03B3\u03B1\u03BB\u03B9\u03BA\u03AE",
    vi: "\u0392\u03B9\u03B5\u03C4\u03BD\u03B1\u03BC\u03B5\u03B6\u03B9\u03BA\u03AC",
    my: "\u0392\u03B9\u03C1\u03BC\u03B1\u03BD\u03B9\u03BA\u03AC",
    bs: "\u0392\u03BF\u03C3\u03BD\u03B9\u03B1\u03BA\u03AC",
    bg: "\u0392\u03BF\u03C5\u03BB\u03B3\u03B1\u03C1\u03B9\u03BA\u03AC",
    gd: "\u0393\u03B1\u03B5\u03BB\u03B9\u03BA\u03AC \u03A3\u03BA\u03BF\u03C4\u03AF\u03B1\u03C2",
    gl: "\u0393\u03B1\u03BB\u03B9\u03BA\u03B9\u03B1\u03BA\u03AC",
    fr: "\u0393\u03B1\u03BB\u03BB\u03B9\u03BA\u03AC",
    de: "\u0393\u03B5\u03C1\u03BC\u03B1\u03BD\u03B9\u03BA\u03AC",
    ka: "\u0393\u03B5\u03C9\u03C1\u03B3\u03B9\u03B1\u03BD\u03AC",
    yi: "\u0393\u03AF\u03BD\u03C4\u03B9\u03C2",
    yo: "\u0393\u03B9\u03BF\u03C1\u03BF\u03CD\u03BC\u03C0\u03B1",
    gn: "\u0393\u03BA\u03BF\u03C5\u03B1\u03C1\u03B1\u03BD\u03AF",
    gu: "\u0393\u03BA\u03BF\u03C5\u03C4\u03B6\u03B1\u03C1\u03B1\u03C4\u03B9\u03BA\u03AC",
    da: "\u0394\u03B1\u03BD\u03B9\u03BA\u03AC",
    he: "\u0395\u03B2\u03C1\u03B1\u03CA\u03BA\u03AC",
    el: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC",
    ee: "\u0388\u03BF\u03C5\u03B5",
    et: "\u0395\u03C3\u03B8\u03BF\u03BD\u03B9\u03BA\u03AC",
    eo: "\u0395\u03C3\u03C0\u03B5\u03C1\u03AC\u03BD\u03C4\u03BF",
    xh: "\u0396\u03CC\u03C3\u03B1",
    zu: "\u0396\u03BF\u03C5\u03BB\u03BF\u03CD",
    ja: "\u0399\u03B1\u03C0\u03C9\u03BD\u03B9\u03BA\u03AC",
    ig: "\u038A\u03B3\u03BA\u03BC\u03C0\u03BF",
    ilo: "\u0399\u03BB\u03BF\u03BA\u03AC\u03BD\u03BF",
    id: "\u0399\u03BD\u03B4\u03BF\u03BD\u03B7\u03C3\u03B9\u03B1\u03BA\u03AC",
    ga: "\u0399\u03C1\u03BB\u03B1\u03BD\u03B4\u03B9\u03BA\u03AC",
    is: "\u0399\u03C3\u03BB\u03B1\u03BD\u03B4\u03B9\u03BA\u03AC",
    es: "\u0399\u03C3\u03C0\u03B1\u03BD\u03B9\u03BA\u03AC",
    it: "\u0399\u03C4\u03B1\u03BB\u03B9\u03BA\u03AC",
    kk: "\u039A\u03B1\u03B6\u03B1\u03BA\u03C3\u03C4\u03B1\u03BD\u03B9\u03BA\u03AC",
    kn: "\u039A\u03B1\u03BD\u03AC\u03BD\u03C4\u03B1",
    ca: "\u039A\u03B1\u03C4\u03B1\u03BB\u03B1\u03BD\u03B9\u03BA\u03AC",
    qu: "\u039A\u03AD\u03C4\u03C3\u03BF\u03C5\u03B1",
    "zh-CN": "\u039A\u03B9\u03BD\u03B5\u03B6\u03B9\u03BA\u03AC (\u0391\u03C0\u03BB\u03BF\u03C0\u03BF\u03B9\u03B7\u03BC\u03AD\u03BD\u03B1)",
    "zh-TW": "\u039A\u03B9\u03BD\u03B5\u03B6\u03B9\u03BA\u03AC (\u03A0\u03B1\u03C1\u03B1\u03B4\u03BF\u03C3\u03B9\u03B1\u03BA\u03AC)",
    rw: "\u039A\u03B9\u03BD\u03B9\u03B1\u03C1\u03BF\u03C5\u03AC\u03BD\u03C4\u03B1",
    ky: "\u039A\u03B9\u03C1\u03B3\u03B9\u03B6\u03B9\u03B1\u03BD\u03AC",
    gom: "\u039A\u03BF\u03BD\u03BA\u03B1\u03BD\u03B9\u03BA\u03AC",
    ko: "\u039A\u03BF\u03C1\u03B5\u03B1\u03C4\u03B9\u03BA\u03AC",
    co: "\u039A\u03BF\u03C1\u03C3\u03B9\u03BA\u03B1\u03BD\u03B9\u03BA\u03AC",
    ku: "\u039A\u03BF\u03C5\u03C1\u03B4\u03B9\u03BA\u03AC (\u039A\u03BF\u03C5\u03C1\u03BC\u03B1\u03BD\u03C4\u03B6\u03AF)",
    ckb: "\u039A\u03BF\u03C5\u03C1\u03B4\u03B9\u03BA\u03AC (\u03A3\u03BF\u03C1\u03B1\u03BD\u03AF)",
    ht: "\u039A\u03C1\u03B5\u03CC\u03BB \u0391\u03CA\u03C4\u03AE\u03C2",
    kri: "\u039A\u03C1\u03AF\u03BF",
    hr: "\u039A\u03C1\u03BF\u03B1\u03C4\u03B9\u03BA\u03AC",
    lo: "\u039B\u03AC\u03BF",
    la: "\u039B\u03B1\u03C4\u03B9\u03BD\u03B9\u03BA\u03AC",
    lv: "\u039B\u03B5\u03C4\u03BF\u03BD\u03B9\u03BA\u03AC",
    be: "\u039B\u03B5\u03C5\u03BA\u03BF\u03C1\u03C9\u03C3\u03B9\u03BA\u03AC",
    lt: "\u039B\u03B9\u03B8\u03BF\u03C5\u03B1\u03BD\u03B9\u03BA\u03AC",
    ln: "\u039B\u03B9\u03BD\u03B3\u03BA\u03AC\u03BB\u03B1",
    lg: "\u039B\u03BF\u03C5\u03B3\u03BA\u03AC\u03BD\u03C4\u03B1",
    lb: "\u039B\u03BF\u03C5\u03BE\u03B5\u03BC\u03B2\u03BF\u03C5\u03C1\u03B3\u03B9\u03B1\u03BD\u03AC",
    mai: "\u039C\u03B1\u03CA\u03C4\u03AF\u03BB\u03B9",
    mg: "\u039C\u03B1\u03BB\u03B1\u03B3\u03AC\u03C3\u03B9",
    ml: "\u039C\u03B1\u03BB\u03B1\u03B3\u03B9\u03AC\u03BB\u03B1\u03BC",
    ms: "\u039C\u03B1\u03BB\u03AD\u03B9",
    mt: "\u039C\u03B1\u03BB\u03C4\u03B5\u03B6\u03B9\u03BA\u03AC",
    mi: "\u039C\u03B1\u03BF\u03C1\u03AF",
    mr: "\u039C\u03B1\u03C1\u03B1\u03B8\u03B9\u03BA\u03AC",
    "mni-Mtei": "\u039C\u03B5\u03CA\u03C4\u03AD\u03B9\u03BB\u03BF\u03BD (\u039C\u03B1\u03BD\u03B9\u03C0\u03BF\u03CD\u03C1\u03B9)",
    lus: "\u039C\u03AF\u03B6\u03BF",
    mn: "\u039C\u03BF\u03B3\u03B3\u03BF\u03BB\u03B9\u03BA\u03AC",
    bm: "\u039C\u03C0\u03B1\u03BC\u03C0\u03AC\u03C1\u03B1",
    bho: "\u039C\u03C0\u03BF\u03C4\u03B6\u03C0\u03BF\u03CD\u03C1\u03B9",
    ne: "\u039D\u03B5\u03C0\u03B1\u03BB\u03B9\u03BA\u03AC",
    no: "\u039D\u03BF\u03C1\u03B2\u03B7\u03B3\u03B9\u03BA\u03AC",
    dv: "\u039D\u03C4\u03B9\u03B2\u03AD\u03C7\u03B9",
    doi: "\u039D\u03C4\u03BF\u03B3\u03BA\u03C1\u03AF",
    nl: "\u039F\u03BB\u03BB\u03B1\u03BD\u03B4\u03B9\u03BA\u03AC",
    or: "\u038C\u03BD\u03C4\u03B9\u03B1 (\u039F\u03C1\u03AF\u03B3\u03B9\u03B1)",
    om: "\u039F\u03C1\u03BF\u03BC\u03CC",
    cy: "\u039F\u03C5\u03B1\u03BB\u03B9\u03BA\u03AC",
    hu: "\u039F\u03C5\u03B3\u03B3\u03C1\u03B9\u03BA\u03AC",
    uz: "\u039F\u03C5\u03B6\u03BC\u03C0\u03B5\u03BA\u03B9\u03BA\u03AC",
    ug: "\u039F\u03C5\u03B9\u03B3\u03BF\u03CD\u03C1",
    uk: "\u039F\u03C5\u03BA\u03C1\u03B1\u03BD\u03B9\u03BA\u03AC",
    ur: "\u039F\u03C5\u03C1\u03BD\u03C4\u03BF\u03CD",
    pa: "\u03A0\u03B1\u03BD\u03C4\u03B6\u03AC\u03BC\u03C0\u03B9",
    ps: "\u03A0\u03AC\u03C3\u03C4\u03BF",
    fa: "\u03A0\u03B5\u03C1\u03C3\u03B9\u03BA\u03AC",
    pl: "\u03A0\u03BF\u03BB\u03C9\u03BD\u03B9\u03BA\u03AC",
    pt: "\u03A0\u03BF\u03C1\u03C4\u03BF\u03B3\u03B1\u03BB\u03B9\u03BA\u03AC",
    ro: "\u03A1\u03BF\u03C5\u03BC\u03B1\u03BD\u03B9\u03BA\u03AC",
    ru: "\u03A1\u03C9\u03C3\u03B9\u03BA\u03AC",
    sm: "\u03A3\u03B1\u03BC\u03BF\u03B1\u03BD\u03B9\u03BA\u03AC",
    sa: "\u03A3\u03B1\u03BD\u03C3\u03BA\u03C1\u03B9\u03C4\u03B9\u03BA\u03AC",
    ceb: "\u03A3\u03B5\u03BC\u03C0\u03BF\u03C5\u03AC\u03BD\u03BF",
    nso: "\u03A3\u03B5\u03C0\u03AD\u03BD\u03C4\u03B9",
    sr: "\u03A3\u03B5\u03C1\u03B2\u03B9\u03BA\u03AC",
    st: "\u03A3\u03B5\u03C3\u03CC\u03C4\u03BF",
    sd: "\u03A3\u03AF\u03BD\u03C4\u03B9",
    si: "\u03A3\u03B9\u03BD\u03C7\u03AC\u03BB\u03B1",
    mk: "\u03A3\u03BB\u03B1\u03B2\u03BF\u03BC\u03B1\u03BA\u03B5\u03B4\u03BF\u03BD\u03B9\u03BA\u03AC",
    sk: "\u03A3\u03BB\u03BF\u03B2\u03B1\u03BA\u03B9\u03BA\u03AC",
    sl: "\u03A3\u03BB\u03BF\u03B2\u03B5\u03BD\u03B9\u03BA\u03AC",
    so: "\u03A3\u03BF\u03BC\u03B1\u03BB\u03B9\u03BA\u03AC",
    sn: "\u03A3\u03CC\u03BD\u03B1",
    sw: "\u03A3\u03BF\u03C5\u03B1\u03C7\u03AF\u03BB\u03B9",
    sv: "\u03A3\u03BF\u03C5\u03B7\u03B4\u03B9\u03BA\u03AC",
    su: "\u03A3\u03BF\u03CD\u03BD\u03C4\u03B1",
    tg: "\u03A4\u03B1\u03B6\u03B9\u03BA\u03B9\u03C3\u03C4\u03B1\u03BD\u03B9\u03BA\u03AC",
    th: "\u03A4\u03B1\u03CA\u03BB\u03B1\u03BD\u03B4\u03B5\u03B6\u03B9\u03BA\u03AC",
    ta: "\u03A4\u03B1\u03BC\u03AF\u03BB",
    tt: "\u03A4\u03B1\u03C4\u03B1\u03C1\u03B9\u03BA\u03AC",
    te: "\u03A4\u03B5\u03BB\u03BF\u03CD\u03B3\u03BA\u03BF\u03C5",
    jv: "\u03A4\u03B6\u03B1\u03B2\u03B1\u03BD\u03B5\u03B6\u03B9\u03BA\u03AC",
    ti: "\u03A4\u03B9\u03B3\u03C1\u03B9\u03BD\u03B9\u03B1\u03BA\u03AC",
    ak: "\u03A4\u03BF\u03C5\u03AF",
    tr: "\u03A4\u03BF\u03C5\u03C1\u03BA\u03B9\u03BA\u03AC",
    tk: "\u03A4\u03BF\u03C5\u03C1\u03BA\u03BC\u03B5\u03BD\u03B9\u03BA\u03AC",
    cs: "\u03A4\u03C3\u03B5\u03C7\u03B9\u03BA\u03AC",
    ny: "\u03A4\u03C3\u03B9\u03C4\u03C3\u03AD\u03BF\u03C5\u03B1",
    ts: "\u03A4\u03C3\u03CC\u03BD\u03B3\u03BA\u03B1",
    tl: "\u03A6\u03B9\u03BB\u03B9\u03C0\u03C0\u03B9\u03BD\u03AD\u03B6\u03B9\u03BA\u03B1",
    fi: "\u03A6\u03B9\u03BD\u03BB\u03B1\u03BD\u03B4\u03B9\u03BA\u03AC",
    fy: "\u03A6\u03C1\u03B9\u03B6\u03B9\u03B1\u03BD\u03AC",
    haw: "\u03A7\u03B1\u03B2\u03B1\u03CA\u03BA\u03AC",
    ha: "\u03A7\u03AC\u03BF\u03C5\u03C3\u03B1",
    hi: "\u03A7\u03AF\u03BD\u03C4\u03B9",
    km: "\u03A7\u03BC\u03B5\u03C1",
    hmn: "\u03A7\u03BC\u03BF\u03BD\u03B3\u03BA",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  he: {
    or: "\u05D0\u05D5\u05D3\u05D9\u05D4 (\u05D0\u05D5\u05E8\u05D9\u05D4)",
    ee: "\u05D0\u05D5\u05D5\u05D4",
    uz: "\u05D0\u05D5\u05D6\u05D1\u05E7\u05D9\u05EA",
    ug: "\u05D0\u05D5\u05D9\u05D2\u05D5\u05E8",
    uk: "\u05D0\u05D5\u05E7\u05E8\u05D0\u05D9\u05E0\u05D9\u05EA",
    ur: "\u05D0\u05D5\u05E8\u05D3\u05D5",
    om: "\u05D0\u05D5\u05E8\u05D5\u05DE\u05D5",
    az: "\u05D0\u05D6\u05E8\u05D9\u05EA",
    ig: "\u05D0\u05D9\u05D2\u05D1\u05D5",
    it: "\u05D0\u05D9\u05D8\u05DC\u05E7\u05D9\u05EA",
    ay: "\u05D0\u05D9\u05D9\u05DE\u05E8\u05D4",
    ilo: "\u05D0\u05D9\u05DC\u05D5\u05E7\u05D0\u05E0\u05D5",
    id: "\u05D0\u05D9\u05E0\u05D3\u05D5\u05E0\u05D6\u05D9\u05EA",
    is: "\u05D0\u05D9\u05E1\u05DC\u05E0\u05D3\u05D9\u05EA",
    ga: "\u05D0\u05D9\u05E8\u05D9\u05EA",
    sq: "\u05D0\u05DC\u05D1\u05E0\u05D9\u05EA",
    am: "\u05D0\u05DE\u05D4\u05E8\u05D9\u05EA",
    en: "\u05D0\u05E0\u05D2\u05DC\u05D9\u05EA",
    as: "\u05D0\u05E1\u05D0\u05DE\u05D9\u05EA",
    et: "\u05D0\u05E1\u05D8\u05D5\u05E0\u05D9\u05EA",
    eo: "\u05D0\u05E1\u05E4\u05E8\u05E0\u05D8\u05D5",
    af: "\u05D0\u05E4\u05E8\u05D9\u05E7\u05D0\u05E0\u05E1",
    hy: "\u05D0\u05E8\u05DE\u05E0\u05D9\u05EA",
    bm: "\u05D1\u05D0\u05DE\u05D1\u05D0\u05E8\u05D4",
    eu: "\u05D1\u05D0\u05E1\u05E7\u05D9\u05EA",
    bho: "\u05D1\u05D5\u05D2'\u05E4\u05D5\u05E8\u05D9\u05EA",
    bg: "\u05D1\u05D5\u05DC\u05D2\u05E8\u05D9\u05EA",
    bs: "\u05D1\u05D5\u05E1\u05E0\u05D9\u05EA",
    my: "\u05D1\u05D5\u05E8\u05DE\u05D6\u05D9\u05EA",
    be: "\u05D1\u05DC\u05D0\u05E8\u05D5\u05E1\u05D9\u05EA",
    bn: "\u05D1\u05E0\u05D2\u05DC\u05D9\u05EA",
    jv: "\u05D2'\u05D0\u05D5\u05D5\u05D4",
    ka: "\u05D2\u05D0\u05D5\u05E8\u05D2\u05D9\u05EA",
    gn: "\u05D2\u05D5\u05D0\u05E8\u05E0\u05D9",
    gu: "\u05D2\u05D5\u05D2'\u05E8\u05D0\u05D8\u05D9\u05EA",
    gl: "\u05D2\u05DC\u05D9\u05E6\u05D9\u05D0\u05E0\u05D9\u05EA",
    de: "\u05D2\u05E8\u05DE\u05E0\u05D9\u05EA",
    doi: "\u05D3\u05D5\u05D2\u05E8\u05D9",
    dv: "\u05D3\u05D9\u05D5\u05D5\u05D4\u05D9",
    da: "\u05D3\u05E0\u05D9\u05EA",
    ha: "\u05D4\u05D0\u05D5\u05E1\u05D4",
    haw: "\u05D4\u05D5\u05D5\u05D0\u05D9\u05EA",
    nl: "\u05D4\u05D5\u05DC\u05E0\u05D3\u05D9\u05EA",
    hu: "\u05D4\u05D5\u05E0\u05D2\u05E8\u05D9\u05EA",
    hi: "\u05D4\u05D9\u05E0\u05D3\u05D9",
    hmn: "\u05D4\u05DE\u05D5\u05E0\u05D2",
    cy: "\u05D5\u05D5\u05DC\u05E9\u05D9\u05EA",
    vi: "\u05D5\u05D9\u05D9\u05D8\u05E0\u05D0\u05DE\u05D9\u05EA",
    zu: "\u05D6\u05D5\u05DC\u05D5",
    km: "\u05D7\u05DE\u05E8",
    tg: "\u05D8\u05D2'\u05D9\u05E7\u05D9\u05EA",
    ak: "\u05D8\u05D5\u05D5\u05D9",
    tr: "\u05D8\u05D5\u05E8\u05E7\u05D9\u05EA",
    tk: "\u05D8\u05D5\u05E8\u05E7\u05DE\u05E0\u05D9\u05EA",
    tt: "\u05D8\u05D8\u05D0\u05E8\u05D9\u05EA",
    te: "\u05D8\u05DC\u05D5\u05D2\u05D5",
    ta: "\u05D8\u05DE\u05D9\u05DC\u05D9\u05EA",
    ts: "\u05D8\u05E1\u05D5\u05E0\u05D2\u05D4",
    el: "\u05D9\u05D5\u05D5\u05E0\u05D9\u05EA",
    yo: "\u05D9\u05D5\u05E8\u05D5\u05D1\u05D4",
    yi: "\u05D9\u05D9\u05D3\u05D9\u05E9",
    ja: "\u05D9\u05E4\u05E0\u05D9\u05EA",
    ku: "\u05DB\u05D5\u05E8\u05D3\u05D9\u05EA (\u05DB\u05D5\u05E8\u05DE\u05E0\u05D2'\u05D9\u05EA)",
    ckb: "\u05DB\u05D5\u05E8\u05D3\u05D9\u05EA (\u05E1\u05D5\u05E8\u05E0\u05D9\u05EA)",
    lo: "\u05DC\u05D0\u05D5",
    lg: "\u05DC\u05D5\u05D2\u05D0\u05E0\u05D3\u05D4",
    lb: "\u05DC\u05D5\u05E7\u05E1\u05DE\u05D1\u05D5\u05E8\u05D2\u05D9\u05EA",
    lv: "\u05DC\u05D8\u05D1\u05D9\u05EA",
    la: "\u05DC\u05D8\u05D9\u05E0\u05D9\u05EA",
    lt: "\u05DC\u05D9\u05D8\u05D0\u05D9\u05EA",
    ln: "\u05DC\u05D9\u05E0\u05D2\u05D0\u05DC\u05D4",
    mi: "\u05DE\u05D0\u05D5\u05E8\u05D9\u05EA",
    mai: "\u05DE\u05D0\u05D9\u05D8\u05D9\u05DC\u05D9",
    mn: "\u05DE\u05D5\u05E0\u05D2\u05D5\u05DC\u05D9\u05EA",
    lus: "\u05DE\u05D9\u05D6\u05D5",
    "mni-Mtei": "\u05DE\u05D9\u05D9\u05D8\u05D9\u05DC\u05D5\u05DF (\u05DE\u05E0\u05D9\u05E4\u05D5\u05E8\u05D9\u05EA)",
    ml: "\u05DE\u05DC\u05D0\u05D9\u05D0\u05DC\u05D0\u05DD",
    ms: "\u05DE\u05DC\u05D0\u05D9\u05EA",
    mg: "\u05DE\u05DC\u05D2\u05E9\u05D9\u05EA",
    mt: "\u05DE\u05DC\u05D8\u05D9\u05EA",
    mk: "\u05DE\u05E7\u05D3\u05D5\u05E0\u05D9\u05EA",
    mr: "\u05DE\u05E8\u05D0\u05D8\u05D4\u05D9\u05EA",
    no: "\u05E0\u05D5\u05E8\u05D5\u05D5\u05D2\u05D9\u05EA",
    ne: "\u05E0\u05E4\u05D0\u05DC\u05D9\u05EA",
    ceb: "\u05E1\u05D1\u05D5\u05D0\u05E0\u05D5",
    sw: "\u05E1\u05D5\u05D5\u05D0\u05D4\u05D9\u05DC\u05D9\u05EA",
    so: "\u05E1\u05D5\u05DE\u05DC\u05D9\u05EA",
    su: "\u05E1\u05D5\u05E0\u05D3\u05D9\u05EA",
    sd: "\u05E1\u05D9\u05E0\u05D3\u05D4\u05D9",
    si: "\u05E1\u05D9\u05E0\u05D4\u05DC\u05D9\u05EA",
    "zh-TW": "\u05E1\u05D9\u05E0\u05D9\u05EA (\u05DE\u05E1\u05D5\u05E8\u05EA\u05D9\u05EA)",
    "zh-CN": "\u200F\u05E1\u05D9\u05E0\u05D9\u05EA (\u05E4\u05E9\u05D5\u05D8\u05D4)",
    sl: "\u05E1\u05DC\u05D5\u05D1\u05E0\u05D9\u05EA",
    sk: "\u05E1\u05DC\u05D5\u05D1\u05E7\u05D9\u05EA",
    sm: "\u05E1\u05DE\u05D5\u05D0\u05D9\u05EA",
    sa: "\u05E1\u05E0\u05E1\u05E7\u05E8\u05D9\u05D8",
    st: "\u05E1\u05E1\u05D5\u05D8\u05D5",
    nso: "\u05E1\u05E4\u05D3\u05D9",
    es: "\u05E1\u05E4\u05E8\u05D3\u05D9\u05EA",
    gd: "\u05E1\u05E7\u05D5\u05D8\u05D9\u05EA \u05D2\u05D0\u05DC\u05D9\u05EA",
    sr: "\u05E1\u05E8\u05D1\u05D9\u05EA",
    he: "\u05E2\u05D1\u05E8\u05D9\u05EA",
    ar: "\u05E2\u05E8\u05D1\u05D9\u05EA",
    pl: "\u05E4\u05D5\u05DC\u05E0\u05D9\u05EA",
    pa: "\u05E4\u05D5\u05E0\u05D2'\u05D0\u05D1\u05D9\u05EA",
    pt: "\u05E4\u05D5\u05E8\u05D8\u05D5\u05D2\u05D6\u05D9\u05EA",
    tl: "\u05E4\u05D9\u05DC\u05D9\u05E4\u05D9\u05E0\u05D9\u05EA",
    fi: "\u05E4\u05D9\u05E0\u05D9\u05EA",
    fy: "\u05E4\u05E8\u05D9\u05D6\u05D9\u05EA",
    fa: "\u05E4\u05E8\u05E1\u05D9\u05EA",
    ps: "\u05E4\u05E9\u05D8\u05D5",
    ny: "\u05E6'\u05D9\u05E6'\u05D5\u05D5\u05D4",
    cs: "\u05E6'\u05DB\u05D9\u05EA",
    fr: "\u05E6\u05E8\u05E4\u05EA\u05D9\u05EA",
    kn: "\u05E7\u05D0\u05E0\u05D0\u05D3\u05D4",
    gom: "\u05E7\u05D5\u05E0\u05E7\u05D0\u05E0\u05D9",
    xh: "\u05E7\u05D5\u05E1\u05D4",
    ko: "\u05E7\u05D5\u05E8\u05D9\u05D0\u05E0\u05D9\u05EA",
    co: "\u05E7\u05D5\u05E8\u05E1\u05D9\u05E7\u05D0\u05D9\u05EA",
    kk: "\u05E7\u05D6\u05D0\u05D7\u05D9\u05EA",
    ca: "\u05E7\u05D8\u05DC\u05D0\u05E0\u05D9\u05EA",
    rw: "\u05E7\u05D9\u05E0\u05D9\u05E8\u05D5\u05D0\u05E0\u05D3\u05D4",
    ky: "\u05E7\u05D9\u05E8\u05D2\u05D9\u05D6\u05D9\u05EA",
    qu: "\u05E7\u05E6'\u05D5\u05D0\u05D4",
    hr: "\u05E7\u05E8\u05D5\u05D0\u05D8\u05D9\u05EA",
    ht: "\u05E7\u05E8\u05D9\u05D0\u05D5\u05DC\u05D9\u05EA \u05D4\u05D0\u05D9\u05D8\u05D9\u05EA",
    kri: "\u05E7\u05E8\u05D9\u05D5",
    ro: "\u05E8\u05D5\u05DE\u05E0\u05D9\u05EA",
    ru: "\u05E8\u05D5\u05E1\u05D9\u05EA",
    sv: "\u05E9\u05D5\u05D5\u05D3\u05D9\u05EA",
    sn: "\u05E9\u05D5\u05E0\u05D4",
    th: "\u05EA\u05D0\u05D9\u05EA",
    ti: "\u05EA\u05D9\u05D2\u05E8\u05D9\u05E0\u05D9\u05EA",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  hi: {
    en: "\u0905\u0902\u0917\u094D\u0930\u0947\u095B\u0940",
    az: "\u0905\u095B\u0930\u092C\u0948\u091C\u093E\u0928\u0940",
    af: "\u0905\u092B\u093C\u094D\u0930\u0940\u0915\u093E\u0902\u0938",
    ar: "\u0905\u0930\u092C\u0940",
    sq: "\u0905\u0932\u094D\u092C\u0947\u0928\u093F\u092F\u0928",
    as: "\u0905\u0938\u092E\u093F\u092F\u093E",
    is: "\u0906\u0907\u0938\u0932\u0948\u0902\u0921\u093F\u0915",
    ay: "\u0906\u092F\u092E\u093E\u0930\u093E",
    ga: "\u0906\u092F\u0930\u093F\u0936",
    hy: "\u0906\u0930\u094D\u092E\u0947\u0928\u093F\u092F\u0928",
    id: "\u0907\u0902\u0921\u094B\u0928\u0947\u0936\u093F\u092F\u0928",
    ig: "\u0907\u0917\u094D\u092C\u094B",
    it: "\u0907\u091F\u0948\u0932\u093F\u092F\u0928",
    ilo: "\u0907\u0932\u094B\u0915\u093E\u0928\u094B",
    uz: "\u0909\u091C\u093C\u094D\u092C\u0947\u0915",
    ur: "\u0909\u0930\u094D\u0926\u0942",
    ee: "\u090F\u0935\u0947",
    et: "\u090F\u0938\u094D\u0924\u094B\u0928\u093F\u092F\u0928",
    eo: "\u090F\u0938\u094D\u092A\u0947\u0930\u093E\u0902\u091F\u094B",
    am: "\u0910\u092E\u094D\u0939\u0947\u0930\u093F\u0915",
    or: "\u0913\u0921\u093F\u092F\u093E (\u0909\u0921\u093C\u093F\u092F\u093E)",
    om: "\u0913\u0930\u094B\u092E\u094B",
    kk: "\u0915\u095B\u093E\u0959",
    kn: "\u0915\u0928\u094D\u0928\u095C",
    rw: "\u0915\u093F\u0928\u092F\u093E\u0930\u0935\u093E\u0902\u0921\u093E",
    ky: "\u0915\u093F\u0930\u0917\u093F\u091C\u093C",
    ku: "\u0915\u0941\u0930\u094D\u0926\u093F\u0936 (\u0915\u0941\u0930\u094D\u092E\u093E\u0902\u091C\u0940)",
    ckb: "\u0915\u0941\u0930\u094D\u0926\u093F\u0936 (\u0938\u094B\u0930\u093E\u0928\u0940)",
    qu: "\u0915\u0947\u091A\u0941\u0935\u093E",
    ca: "\u0915\u0948\u091F\u0947\u0932\u0928",
    gom: "\u0915\u094B\u0902\u0915\u0923\u0940",
    ko: "\u0915\u094B\u0930\u093F\u092F\u0928",
    co: "\u0915\u094B\u0930\u094D\u0938\u093F\u0915\u0928",
    xh: "\u0915\u094B\u0938\u093E",
    kri: "\u0915\u094D\u0930\u0940\u0913",
    hr: "\u0915\u094D\u0930\u094B\u090F\u0936\u093F\u092F\u0928",
    km: "\u0916\u092E\u0947\u0930",
    gn: "\u0917\u0941\u0906\u0930\u0928\u0940",
    gu: "\u0917\u0941\u091C\u0930\u093E\u0924\u0940",
    gl: "\u0917\u0948\u0932\u093F\u0936\u093F\u092F\u0928",
    el: "\u0917\u094D\u0930\u0940\u0915",
    ny: "\u091A\u093F\u091A\u0947\u0935\u093E",
    "zh-TW": "\u091A\u0940\u0928\u0940 (\u092A\u093E\u0930\u0902\u092A\u0930\u093F\u0915)",
    "zh-CN": "\u091A\u0940\u0928\u0940 (\u0938\u0930\u0932)",
    cs: "\u091A\u0947\u0915",
    de: "\u091C\u0930\u094D\u092E\u0928",
    ja: "\u091C\u093E\u092A\u093E\u0928\u0940",
    zu: "\u091C\u093C\u0941\u0932\u0941",
    jv: "\u091C\u0948\u0935\u0947\u0928\u0940\u091C\u093C",
    ka: "\u091C\u0949\u0930\u094D\u091C\u093F\u092F\u0928",
    nl: "\u0921\u091A",
    da: "\u0921\u0948\u0928\u093F\u0936",
    doi: "\u0921\u094B\u0917\u0930\u0940",
    ta: "\u0924\u092E\u093F\u0932",
    tg: "\u0924\u093E\u091C\u093F\u0915",
    tt: "\u0924\u093E\u0924\u093E\u0930",
    ti: "\u0924\u093F\u0917\u094D\u0930\u093F\u0928\u094D\u092F\u093E",
    tr: "\u0924\u0941\u0930\u094D\u0915",
    tk: "\u0924\u0941\u0930\u094D\u0915\u092E\u0947\u0928",
    te: "\u0924\u0947\u0932\u0941\u0917\u0941",
    ak: "\u0924\u094D\u0935\u0940",
    th: "\u0925\u093E\u0908",
    dv: "\u0926\u093F\u0935\u0947\u0939\u0940",
    ne: "\u0928\u0947\u092A\u093E\u0932\u0940",
    no: "\u0928\u0949\u0930\u094D\u0935\u0947\u091C\u093F\u092F\u0928",
    pa: "\u092A\u0902\u091C\u093E\u092C\u0940",
    ps: "\u092A\u0936\u094D\u0924\u094B",
    pt: "\u092A\u0941\u0930\u094D\u0924\u0917\u093E\u0932\u0940",
    pl: "\u092A\u094B\u0932\u093F\u0936",
    fa: "\u092B\u093E\u0930\u0938\u0940",
    fi: "\u092B\u093C\u093F\u0928\u093F\u0936",
    tl: "\u095E\u093F\u0932\u093F\u092A\u0940\u0928\u094B",
    fy: "\u092B\u093C\u094D\u0930\u093F\u0938\u093F\u092F\u0928",
    fr: "\u092B\u093C\u094D\u0930\u0947\u0902\u091A",
    my: "\u092C\u0930\u094D\u092E\u0940",
    bn: "\u092C\u093E\u0902\u0917\u094D\u0932\u093E",
    bm: "\u092C\u093E\u0902\u092C\u093E\u0930\u093E",
    bg: "\u092C\u0941\u0932\u094D\u0917\u093E\u0930\u093F\u092F\u0928",
    be: "\u092C\u0947\u0932\u093E\u0930\u0942\u0938\u0940\u092F\u0928",
    eu: "\u092C\u0948\u0938\u094D\u0915",
    bs: "\u092C\u094B\u0938\u094D\u0928\u093F\u092F\u0928",
    bho: "\u092D\u094B\u091C\u092A\u0941\u0930\u0940",
    mn: "\u092E\u0902\u0917\u094B\u0932\u093F\u092F\u0928",
    mr: "\u092E\u0930\u093E\u0920\u0940",
    ms: "\u092E\u0932\u092F",
    ml: "\u092E\u0932\u092F\u093E\u0932\u092E",
    mi: "\u092E\u093E\u0914\u0930\u0940",
    mt: "\u092E\u093E\u0932\u094D\u091F\u0940",
    lus: "\u092E\u093F\u091C\u093C\u094B",
    mg: "\u092E\u0947\u0932\u093E\u0917\u093E\u0938\u0940",
    mk: "\u092E\u0947\u0938\u0940\u0921\u094B\u0928\u093F\u092F\u0928",
    "mni-Mtei": "\u092E\u0948\u0924\u0948\u0932\u094B\u0928 (\u092E\u0923\u093F\u092A\u0941\u0930\u0940)",
    mai: "\u092E\u0948\u0925\u093F\u0932\u0940",
    yi: "\u092F\u093F\u0921\u093F\u0936",
    uk: "\u092F\u0942\u0915\u094D\u0930\u0947\u0928\u093F\u092F\u0928",
    yo: "\u092F\u094B\u0930\u0941\u092C\u093E",
    ru: "\u0930\u0942\u0938\u0940",
    ro: "\u0930\u094B\u092E\u0947\u0928\u093F\u092F\u0928",
    lb: "\u0932\u0915\u094D\u095B\u092E\u092C\u0930\u094D\u0917\u093F\u0936",
    lo: "\u0932\u093E\u0913",
    lv: "\u0932\u093E\u0924\u0935\u093F\u092F\u0928",
    ln: "\u0932\u093F\u0902\u0917\u093E\u0932\u093E",
    lt: "\u0932\u093F\u0925\u0941\u0906\u0928\u093F\u092F\u0928",
    lg: "\u0932\u0941\u0917\u093E\u0902\u0921\u093E",
    la: "\u0932\u0948\u091F\u093F\u0928",
    vi: "\u0935\u093F\u092F\u0924\u0928\u093E\u092E\u0940",
    ug: "\u0935\u0940\u0917\u0930",
    cy: "\u0935\u0947\u0932\u094D\u0936",
    sn: "\u0936\u094B\u0928\u093E",
    su: "\u0938\u0902\u0921\u0928\u0940\u091C\u093C",
    sa: "\u0938\u0902\u0938\u094D\u0915\u0943\u0924",
    sm: "\u0938\u092E\u094B\u0906\u0908",
    sr: "\u0938\u0930\u094D\u092C\u093F\u092F\u093E\u0908",
    si: "\u0938\u093F\u0902\u0939\u0932\u093E",
    sd: "\u0938\u093F\u0928\u094D\u0927\u0940",
    nso: "\u0938\u0947\u092A\u0947\u0921\u0940",
    ceb: "\u0938\u0947\u092C\u0941\u0906\u0928\u094B",
    st: "\u0938\u0947\u0938\u094B\u0925\u094B",
    so: "\u0938\u094B\u092E\u093E\u0932\u0940",
    ts: "\u0938\u094C\u0902\u0917\u093E",
    gd: "\u0938\u094D\u0915\u0949\u091F\u094D\u0938 \u0917\u0947\u0932\u093F\u0915",
    es: "\u0938\u094D\u092A\u0948\u0928\u093F\u0936",
    sk: "\u0938\u094D\u0932\u094B\u0935\u093E\u0915",
    sl: "\u0938\u094D\u0932\u094B\u0935\u0947\u0928\u093F\u092F\u0928",
    sw: "\u0938\u094D\u0935\u093E\u0939\u093F\u0932\u0940",
    sv: "\u0938\u094D\u0935\u0940\u0921\u093F\u0936",
    hu: "\u0939\u0902\u0917\u0930\u093F\u092F\u0928",
    hmn: "\u0939\u092E\u0949\u0928\u094D\u0917",
    haw: "\u0939\u0935\u093E\u092F\u0928",
    hi: "\u0939\u093F\u0928\u094D\u0926\u0940",
    he: "\u0939\u0940\u092C\u094D\u0930\u0942",
    ht: "\u0939\u0948\u0924\u093F\u092F\u0928 \u0915\u094D\u0930\u093F\u0913\u0932",
    ha: "\u0939\u094C\u0938\u093E",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  hu: {
    af: "afrikaans",
    ay: "ajmara",
    sq: "alb\xE1n",
    am: "amhara",
    en: "angol",
    ar: "arab",
    as: "assz\xE1mi",
    az: "azeri",
    bm: "bambara",
    eu: "baszk",
    be: "belorusz",
    bn: "beng\xE1li",
    bho: "bhodzspuri",
    bg: "bolg\xE1r",
    bs: "bosny\xE1k",
    my: "burmai",
    ceb: "cebuano",
    ny: "chichewa",
    cs: "cseh",
    da: "d\xE1n",
    dv: "divehi (mald\xEDv)",
    doi: "dogri",
    eo: "eszperant\xF3",
    et: "\xE9szt",
    ee: "ewe",
    tl: "filipp\xEDn\xF3",
    fi: "finn",
    fr: "francia",
    fy: "fr\xEDz",
    gl: "gal\xEDciai",
    el: "g\xF6r\xF6g",
    ka: "gr\xFAz",
    gn: "guarani",
    gu: "gudzsar\xE1ti",
    ht: "haiti kreol",
    ha: "hausza",
    haw: "hawaii",
    he: "h\xE9ber",
    hi: "hindi",
    hmn: "hmong",
    nl: "holland",
    hr: "horv\xE1t",
    ig: "igbo",
    ilo: "ilokano",
    id: "indon\xE9z",
    ga: "\xEDr",
    is: "izlandi",
    ja: "jap\xE1n",
    jv: "j\xE1vai",
    yi: "jiddis",
    yo: "joruba",
    kn: "kannada",
    ca: "katal\xE1n",
    kk: "kazah",
    qu: "kecsua",
    km: "khmer",
    "zh-CN": "k\xEDnai (egyszer\u0171s\xEDtett)",
    "zh-TW": "k\xEDnai (hagyom\xE1nyos)",
    rw: "kinyarwanda",
    ky: "kirgiz",
    gom: "konkani",
    ko: "koreai",
    co: "korzikai",
    kri: "krio",
    ku: "kurd (kurmanji)",
    ckb: "kurd (szor\xE1ni)",
    lo: "lao",
    la: "latin",
    pl: "lengyel",
    lv: "lett",
    ln: "lingala",
    lt: "litv\xE1n",
    lg: "luganda",
    lb: "luxemburgi",
    mk: "maced\xF3n",
    hu: "magyar",
    mai: "maithili",
    mg: "malagaszi",
    ms: "mal\xE1j",
    ml: "malaj\xE1lam",
    mt: "m\xE1ltai",
    mi: "maori",
    mr: "mar\xE1thi",
    "mni-Mtei": "meiteilon (manipuri)",
    lus: "mizo",
    mn: "mongol",
    de: "n\xE9met",
    ne: "nep\xE1li",
    no: "norv\xE9g",
    or: "odia (orija)",
    it: "olasz",
    om: "oromo",
    ru: "orosz",
    hy: "\xF6rm\xE9ny",
    pa: "pandzs\xE1bi",
    ps: "pastu",
    fa: "perzsa",
    pt: "portug\xE1l",
    ro: "rom\xE1n",
    nso: "sepedi",
    sn: "shona",
    gd: "sk\xF3t-gael",
    es: "spanyol",
    sv: "sv\xE9d",
    sm: "szamoai",
    sa: "szanszkrit",
    sr: "szerb",
    sd: "szindhi",
    si: "szinhala",
    sk: "szlov\xE1k",
    sl: "szlov\xE9n",
    so: "szom\xE1li",
    st: "szoto",
    sw: "szuah\xE9li",
    su: "szundan\xE9z",
    tg: "tadzsik",
    ta: "tamil",
    tt: "tat\xE1r",
    te: "telugu",
    th: "thai",
    ti: "tigrinya",
    tr: "t\xF6r\xF6k",
    ts: "tsonga",
    tk: "t\xFCrkm\xE9n",
    ak: "twi",
    ug: "ujgur",
    uk: "ukr\xE1n",
    ur: "urdu",
    uz: "\xFCzb\xE9g",
    vi: "vietnami",
    cy: "walesi",
    xh: "xhosa",
    zu: "zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  it: {
    af: "Afrikaans",
    sq: "Albanese",
    am: "Amarico",
    ar: "Arabo",
    hy: "Armeno",
    as: "Assamese",
    ay: "Aymara",
    az: "Azero",
    bm: "Bambara",
    eu: "Basco",
    bn: "Bengalese",
    bho: "Bhojpuri",
    be: "Bielorusso",
    my: "Birmano",
    bs: "Bosniaco",
    bg: "Bulgaro",
    ca: "Catalano",
    ceb: "Cebuano",
    cs: "Ceco",
    ny: "Chichewa",
    ky: "Chirghiso",
    ak: "Ci",
    "zh-CN": "Cinese (semplificato)",
    "zh-TW": "Cinese (tradizionale)",
    ko: "Coreano",
    co: "Corso",
    ht: "Creolo haitiano",
    hr: "Croato",
    ku: "Curdo (Kurmanji)",
    ckb: "Curdo (Sorani)",
    da: "Danese",
    dv: "Dhivehi",
    doi: "Dogri",
    he: "Ebraico",
    eo: "Esperanto",
    et: "Estone",
    ee: "Ewe",
    tl: "Filippino",
    fi: "Finlandese",
    fr: "Francese",
    fy: "Frisone",
    gd: "Gaelico scozzese",
    gl: "Galiziano",
    cy: "Gallese",
    ka: "Georgiano",
    ja: "Giapponese",
    jv: "Giavanese",
    el: "Greco",
    gn: "Guaran\xED",
    gu: "Gujarati",
    ha: "Hausa",
    haw: "Hawaiano",
    hi: "Hindi",
    hmn: "Hmong",
    ig: "Igbo",
    ilo: "Ilocano",
    id: "Indonesiano",
    en: "Inglese",
    ga: "Irlandese",
    is: "Islandese",
    it: "Italiano",
    kn: "Kannada",
    kk: "Kazako",
    km: "Khmer",
    rw: "Kinyarwanda",
    gom: "Konkani",
    kri: "Krio",
    lo: "Lao",
    la: "Latino",
    lv: "Lettone",
    ln: "Lingala",
    lt: "Lituano",
    lg: "Luganda",
    lb: "Lussemburghese",
    mk: "Macedone",
    mai: "Maithili",
    ml: "Malayalam",
    ms: "Malese",
    mg: "Malgascio",
    mt: "Maltese",
    mi: "Maori",
    mr: "Marathi",
    "mni-Mtei": "Meiteilon (Manipuri)",
    lus: "Mizo",
    mn: "Mongolo",
    ne: "Nepalese",
    no: "Norvegese",
    or: "Odia (Oriya)",
    nl: "Olandese",
    om: "Oromo",
    ps: "Pashto",
    fa: "Persiano",
    pl: "Polacco",
    pt: "Portoghese",
    pa: "Punjabi",
    qu: "Quechua",
    ro: "Rumeno",
    ru: "Russo",
    sm: "Samoano",
    sa: "Sanscrito",
    nso: "Sepedi",
    sr: "Serbo",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Singalese",
    sk: "Slovacco",
    sl: "Sloveno",
    so: "Somalo",
    es: "Spagnolo",
    su: "Sundanese",
    sv: "Svedese",
    sw: "Swahili",
    tg: "Tagico",
    ta: "Tamil",
    tt: "Tataro",
    de: "Tedesco",
    te: "Telugu",
    th: "Thai",
    ti: "Tigrino",
    ts: "Tsonga",
    tr: "Turco",
    tk: "Turcomanno",
    uk: "Ucraino",
    ug: "Uiguro",
    hu: "Ungherese",
    ur: "Urdu",
    uz: "Uzbeco",
    vi: "Vietnamita",
    xh: "Xhosa",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  ja: {
    is: "\u30A2\u30A4\u30B9\u30E9\u30F3\u30C9\u8A9E",
    ay: "\u30A2\u30A4\u30DE\u30E9\u8A9E",
    ga: "\u30A2\u30A4\u30EB\u30E9\u30F3\u30C9\u8A9E",
    az: "\u30A2\u30BC\u30EB\u30D0\u30A4\u30B8\u30E3\u30F3\u8A9E",
    as: "\u30A2\u30C3\u30B5\u30E0\u8A9E",
    af: "\u30A2\u30D5\u30EA\u30AB\u30FC\u30F3\u30B9\u8A9E",
    am: "\u30A2\u30E0\u30CF\u30E9\u8A9E",
    ar: "\u30A2\u30E9\u30D3\u30A2\u8A9E",
    sq: "\u30A2\u30EB\u30D0\u30CB\u30A2\u8A9E",
    hy: "\u30A2\u30EB\u30E1\u30CB\u30A2\u8A9E",
    it: "\u30A4\u30BF\u30EA\u30A2\u8A9E",
    yi: "\u30A4\u30C7\u30A3\u30C3\u30B7\u30E5\u8A9E",
    ig: "\u30A4\u30DC\u8A9E",
    ilo: "\u30A4\u30ED\u30AB\u30CE\u8A9E",
    id: "\u30A4\u30F3\u30C9\u30CD\u30B7\u30A2\u8A9E",
    ug: "\u30A6\u30A4\u30B0\u30EB\u8A9E",
    cy: "\u30A6\u30A7\u30FC\u30EB\u30BA\u8A9E",
    uk: "\u30A6\u30AF\u30E9\u30A4\u30CA\u8A9E",
    uz: "\u30A6\u30BA\u30D9\u30AF\u8A9E",
    ur: "\u30A6\u30EB\u30C9\u30A5\u8A9E",
    ee: "\u30A8\u30A6\u30A7\u8A9E",
    et: "\u30A8\u30B9\u30C8\u30CB\u30A2\u8A9E",
    eo: "\u30A8\u30B9\u30DA\u30E9\u30F3\u30C8\u8A9E",
    nl: "\u30AA\u30E9\u30F3\u30C0\u8A9E",
    or: "\u30AA\u30EA\u30E4\u8A9E",
    om: "\u30AA\u30ED\u30E2\u8A9E",
    kk: "\u30AB\u30B6\u30D5\u8A9E",
    ca: "\u30AB\u30BF\u30EB\u30FC\u30CB\u30E3\u8A9E",
    gl: "\u30AC\u30EA\u30B7\u30A2\u8A9E",
    kn: "\u30AB\u30F3\u30CA\u30C0\u8A9E",
    rw: "\u30AD\u30CB\u30E4\u30EB\u30EF\u30F3\u30C0\u8A9E",
    el: "\u30AE\u30EA\u30B7\u30E3\u8A9E",
    ky: "\u30AD\u30EB\u30AE\u30B9\u8A9E",
    gn: "\u30B0\u30A2\u30E9\u30CB\u8A9E",
    gu: "\u30B0\u30B8\u30E3\u30E9\u30FC\u30C8\u8A9E",
    km: "\u30AF\u30E1\u30FC\u30EB\u8A9E",
    kri: "\u30AF\u30EA\u30AA\u8A9E",
    ku: "\u30AF\u30EB\u30C9\u8A9E\uFF08\u30AF\u30EB\u30DE\u30F3\u30B8\u30FC\uFF09",
    ckb: "\u30AF\u30EB\u30C9\u8A9E\uFF08\u30BD\u30E9\u30CB\u30FC\uFF09",
    hr: "\u30AF\u30ED\u30A2\u30C1\u30A2\u8A9E",
    qu: "\u30B1\u30C1\u30E5\u30A2\u8A9E",
    xh: "\u30B3\u30FC\u30B5\u8A9E",
    co: "\u30B3\u30EB\u30B7\u30AB\u8A9E",
    gom: "\u30B3\u30F3\u30AB\u30CB\u8A9E",
    sm: "\u30B5\u30E2\u30A2\u8A9E",
    sa: "\u30B5\u30F3\u30B9\u30AF\u30EA\u30C3\u30C8\u8A9E",
    jv: "\u30B8\u30E3\u30EF\u8A9E",
    ka: "\u30B8\u30E7\u30FC\u30B8\u30A2\u8A9E\uFF08\u30B0\u30EB\u30B8\u30A2\u8A9E\uFF09",
    sn: "\u30B7\u30E7\u30CA\u8A9E",
    sd: "\u30B7\u30F3\u30C9\u8A9E",
    si: "\u30B7\u30F3\u30CF\u30E9\u8A9E",
    sv: "\u30B9\u30A6\u30A7\u30FC\u30C7\u30F3\u8A9E",
    zu: "\u30BA\u30FC\u30EB\u30FC\u8A9E",
    gd: "\u30B9\u30B3\u30C3\u30C8\u30E9\u30F3\u30C9 \u30B2\u30FC\u30EB\u8A9E",
    es: "\u30B9\u30DA\u30A4\u30F3\u8A9E",
    sk: "\u30B9\u30ED\u30D0\u30AD\u30A2\u8A9E",
    sl: "\u30B9\u30ED\u30D9\u30CB\u30A2\u8A9E",
    sw: "\u30B9\u30EF\u30D2\u30EA\u8A9E",
    su: "\u30B9\u30F3\u30C0\u8A9E",
    ceb: "\u30BB\u30D6\u30A2\u30CE\u8A9E",
    nso: "\u30BB\u30DA\u30C7\u30A3\u8A9E",
    sr: "\u30BB\u30EB\u30D3\u30A2\u8A9E",
    st: "\u30BD\u30C8\u8A9E",
    so: "\u30BD\u30DE\u30EA\u8A9E",
    th: "\u30BF\u30A4\u8A9E",
    tl: "\u30BF\u30AC\u30ED\u30B0\u8A9E",
    tg: "\u30BF\u30B8\u30AF\u8A9E",
    tt: "\u30BF\u30BF\u30FC\u30EB\u8A9E",
    ta: "\u30BF\u30DF\u30EB\u8A9E",
    cs: "\u30C1\u30A7\u30B3\u8A9E",
    ny: "\u30C1\u30A7\u30EF\u8A9E",
    ts: "\u30C4\u30A9\u30F3\u30AC\u8A9E",
    ti: "\u30C6\u30A3\u30B0\u30EA\u30CB\u30E3\u8A9E",
    dv: "\u30C7\u30A3\u30D9\u30D2\u8A9E",
    te: "\u30C6\u30EB\u30B0\u8A9E",
    da: "\u30C7\u30F3\u30DE\u30FC\u30AF\u8A9E",
    de: "\u30C9\u30A4\u30C4\u8A9E",
    ak: "\u30C8\u30A5\u30A4\u8A9E",
    doi: "\u30C9\u30B0\u30EA\u8A9E",
    tk: "\u30C8\u30EB\u30AF\u30E1\u30F3\u8A9E",
    tr: "\u30C8\u30EB\u30B3\u8A9E",
    ne: "\u30CD\u30D1\u30FC\u30EB\u8A9E",
    no: "\u30CE\u30EB\u30A6\u30A7\u30FC\u8A9E",
    ht: "\u30CF\u30A4\u30C1\u8A9E",
    ha: "\u30CF\u30A6\u30B5\u8A9E",
    ps: "\u30D1\u30B7\u30E5\u30C8\u8A9E",
    eu: "\u30D0\u30B9\u30AF\u8A9E",
    haw: "\u30CF\u30EF\u30A4\u8A9E",
    hu: "\u30CF\u30F3\u30AC\u30EA\u30FC\u8A9E",
    pa: "\u30D1\u30F3\u30B8\u30E3\u30D6\u8A9E",
    bm: "\u30D0\u30F3\u30D0\u30E9\u8A9E",
    hi: "\u30D2\u30F3\u30C7\u30A3\u30FC\u8A9E",
    fi: "\u30D5\u30A3\u30F3\u30E9\u30F3\u30C9\u8A9E",
    fr: "\u30D5\u30E9\u30F3\u30B9\u8A9E",
    fy: "\u30D5\u30EA\u30B8\u30A2\u8A9E",
    bg: "\u30D6\u30EB\u30AC\u30EA\u30A2\u8A9E",
    vi: "\u30D9\u30C8\u30CA\u30E0\u8A9E",
    he: "\u30D8\u30D6\u30E9\u30A4\u8A9E",
    be: "\u30D9\u30E9\u30EB\u30FC\u30B7\u8A9E",
    fa: "\u30DA\u30EB\u30B7\u30E3\u8A9E",
    bn: "\u30D9\u30F3\u30AC\u30EB\u8A9E",
    bho: "\u30DC\u30FC\u30B8\u30E5\u30D7\u30EA\u30FC\u8A9E",
    pl: "\u30DD\u30FC\u30E9\u30F3\u30C9\u8A9E",
    bs: "\u30DC\u30B9\u30CB\u30A2\u8A9E",
    pt: "\u30DD\u30EB\u30C8\u30AC\u30EB\u8A9E",
    mai: "\u30DE\u30A4\u30C6\u30A3\u30EA\u30FC\u8A9E",
    mi: "\u30DE\u30AA\u30EA\u8A9E",
    mk: "\u30DE\u30B1\u30C9\u30CB\u30A2\u8A9E",
    mr: "\u30DE\u30E9\u30FC\u30C6\u30A3\u30FC\u8A9E",
    mg: "\u30DE\u30E9\u30AC\u30B7\u8A9E",
    ml: "\u30DE\u30E9\u30E4\u30FC\u30E9\u30E0\u8A9E",
    mt: "\u30DE\u30EB\u30BF\u8A9E",
    ms: "\u30DE\u30EC\u30FC\u8A9E",
    lus: "\u30DF\u30BE\u8A9E",
    my: "\u30DF\u30E3\u30F3\u30DE\u30FC\u8A9E\uFF08\u30D3\u30EB\u30DE\u8A9E\uFF09",
    "mni-Mtei": "\u30E1\u30A4\u30C6\u30A4\u8A9E\uFF08\u30DE\u30CB\u30D7\u30EA\u8A9E\uFF09",
    mn: "\u30E2\u30F3\u30B4\u30EB\u8A9E",
    hmn: "\u30E2\u30F3\u8A9E",
    yo: "\u30E8\u30EB\u30D0\u8A9E",
    lo: "\u30E9\u30AA\u8A9E",
    la: "\u30E9\u30C6\u30F3\u8A9E",
    lv: "\u30E9\u30C8\u30D3\u30A2\u8A9E",
    lt: "\u30EA\u30C8\u30A2\u30CB\u30A2\u8A9E",
    ln: "\u30EA\u30F3\u30AC\u30E9\u8A9E",
    ro: "\u30EB\u30FC\u30DE\u30CB\u30A2\u8A9E",
    lg: "\u30EB\u30AC\u30F3\u30C0\u8A9E",
    lb: "\u30EB\u30AF\u30BB\u30F3\u30D6\u30EB\u30AF\u8A9E",
    ru: "\u30ED\u30B7\u30A2\u8A9E",
    en: "\u82F1\u8A9E",
    ko: "\u97D3\u56FD\u8A9E",
    "zh-CN": "\u4E2D\u56FD\u8A9E\uFF08\u7C21\u4F53\uFF09",
    "zh-TW": "\u4E2D\u56FD\u8A9E\uFF08\u7E41\u4F53\uFF09",
    ja: "\u65E5\u672C\u8A9E",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  ko: {
    gl: "\uAC08\uB9AC\uC2DC\uC544\uC5B4",
    gn: "\uACFC\uB77C\uB2C8\uC5B4",
    gu: "\uAD6C\uC790\uB77C\uD2B8\uC5B4",
    el: "\uADF8\uB9AC\uC2A4\uC5B4",
    nl: "\uB124\uB35C\uB780\uB4DC\uC5B4",
    ne: "\uB124\uD314\uC5B4",
    no: "\uB178\uB974\uC6E8\uC774\uC5B4",
    da: "\uB374\uB9C8\uD06C\uC5B4",
    doi: "\uB3C4\uADF8\uB9AC\uC5B4",
    de: "\uB3C5\uC77C\uC5B4",
    dv: "\uB514\uBCA0\uD788\uC5B4",
    lo: "\uB77C\uC624\uC5B4",
    lv: "\uB77C\uD2B8\uBE44\uC544\uC5B4",
    la: "\uB77C\uD2F4\uC5B4",
    ru: "\uB7EC\uC2DC\uC544\uC5B4",
    lg: "\uB8E8\uAC04\uB2E4\uC5B4",
    ro: "\uB8E8\uB9C8\uB2C8\uC544\uC5B4",
    lb: "\uB8E9\uC148\uBD80\uB974\uD06C\uC5B4",
    lt: "\uB9AC\uD22C\uC544\uB2C8\uC544\uC5B4",
    ln: "\uB9C1\uAC08\uB77C\uC5B4",
    mr: "\uB9C8\uB77C\uD2F0\uC5B4",
    mi: "\uB9C8\uC624\uB9AC\uC5B4",
    mai: "\uB9C8\uC774\uD2F8\uC5B4",
    mk: "\uB9C8\uCF00\uB3C4\uB2C8\uC544\uC5B4",
    mg: "\uB9D0\uB77C\uAC00\uC2DC\uC5B4",
    ml: "\uB9D0\uB77C\uC584\uB78C\uC5B4",
    ms: "\uB9D0\uB808\uC774\uC5B4",
    "mni-Mtei": "\uBA54\uC774\uD14C\uC774\uC5B4(\uB9C8\uB2C8\uD478\uB974\uC5B4)",
    mt: "\uBAB0\uD0C0\uC5B4",
    mn: "\uBABD\uACE8\uC5B4",
    hmn: "\uBABD\uC5B4",
    my: "\uBBF8\uC580\uB9C8\uC5B4(\uBC84\uB9C8\uC5B4)",
    lus: "\uBBF8\uC870\uC5B4",
    eu: "\uBC14\uC2A4\uD06C\uC5B4",
    bm: "\uBC24\uBC14\uB77C\uC5B4",
    vi: "\uBCA0\uD2B8\uB0A8\uC5B4",
    be: "\uBCA8\uB77C\uB8E8\uC2A4\uC5B4",
    bn: "\uBCB5\uACE8\uC5B4",
    bs: "\uBCF4\uC2A4\uB2C8\uC544\uC5B4",
    bho: "\uBCF4\uC988\uD478\uB9AC\uC5B4",
    nso: "\uBD81\uC18C\uD1A0\uC5B4",
    bg: "\uBD88\uAC00\uB9AC\uC544\uC5B4",
    sm: "\uC0AC\uBAA8\uC544\uC5B4",
    sa: "\uC0B0\uC2A4\uD06C\uB9AC\uD2B8",
    sr: "\uC138\uB974\uBE44\uC544\uC5B4",
    ceb: "\uC138\uBD80\uC544\uB178\uC5B4",
    st: "\uC138\uC18C\uD1A0\uC5B4",
    so: "\uC18C\uB9D0\uB9AC\uC544\uC5B4",
    sn: "\uC1FC\uB098\uC5B4",
    su: "\uC21C\uB2E4\uC5B4",
    sw: "\uC2A4\uC640\uD790\uB9AC\uC5B4",
    sv: "\uC2A4\uC6E8\uB374\uC5B4",
    gd: "\uC2A4\uCF54\uD2C0\uB79C\uB4DC \uAC8C\uC77C\uC5B4",
    es: "\uC2A4\uD398\uC778\uC5B4",
    sk: "\uC2AC\uB85C\uBC14\uD0A4\uC544\uC5B4",
    sl: "\uC2AC\uB85C\uBCA0\uB2C8\uC544\uC5B4",
    sd: "\uC2E0\uB514\uC5B4",
    si: "\uC2F1\uD560\uB77C\uC5B4",
    ar: "\uC544\uB78D\uC5B4",
    hy: "\uC544\uB974\uBA54\uB2C8\uC544\uC5B4",
    as: "\uC544\uC0BC\uC5B4",
    ay: "\uC544\uC774\uB9C8\uB77C\uC5B4",
    is: "\uC544\uC774\uC2AC\uB780\uB4DC\uC5B4",
    ht: "\uC544\uC774\uD2F0 \uD06C\uB9AC\uC62C\uC5B4",
    ga: "\uC544\uC77C\uB79C\uB4DC\uC5B4",
    az: "\uC544\uC81C\uB974\uBC14\uC774\uC794\uC5B4",
    af: "\uC544\uD504\uB9AC\uCE78\uC2A4\uC5B4",
    sq: "\uC54C\uBC14\uB2C8\uC544\uC5B4",
    am: "\uC554\uD558\uB77C\uC5B4",
    et: "\uC5D0\uC2A4\uD1A0\uB2C8\uC544\uC5B4",
    eo: "\uC5D0\uC2A4\uD398\uB780\uD1A0\uC5B4",
    ee: "\uC5D0\uC6E8\uC5B4",
    en: "\uC601\uC5B4",
    om: "\uC624\uB85C\uBAA8\uC5B4",
    or: "\uC624\uB9AC\uC57C\uC5B4",
    yo: "\uC694\uB8E8\uBC14\uC5B4",
    ur: "\uC6B0\uB974\uB450\uC5B4",
    uz: "\uC6B0\uC988\uBCA0\uD06C\uC5B4",
    uk: "\uC6B0\uD06C\uB77C\uC774\uB098\uC5B4",
    cy: "\uC6E8\uC77C\uC988\uC5B4",
    ug: "\uC704\uAD6C\uB974\uC5B4",
    ig: "\uC774\uADF8\uBCF4\uC5B4",
    yi: "\uC774\uB514\uC2DC\uC5B4",
    it: "\uC774\uD0C8\uB9AC\uC544\uC5B4",
    id: "\uC778\uB3C4\uB124\uC2DC\uC544\uC5B4",
    ilo: "\uC77C\uB85C\uCE74\uB178\uC5B4",
    ja: "\uC77C\uBCF8\uC5B4",
    jv: "\uC790\uBC14\uC5B4",
    ka: "\uC870\uC9C0\uC544\uC5B4",
    zu: "\uC904\uB8E8\uC5B4",
    "zh-CN": "\uC911\uAD6D\uC5B4(\uAC04\uCCB4)",
    "zh-TW": "\uC911\uAD6D\uC5B4(\uBC88\uCCB4)",
    ny: "\uCCB4\uC640\uC5B4",
    cs: "\uCCB4\uCF54\uC5B4",
    ts: "\uCD1D\uAC00\uC5B4",
    kk: "\uCE74\uC790\uD750\uC5B4",
    ca: "\uCE74\uD0C8\uB85C\uB2C8\uC544\uC5B4",
    kn: "\uCE78\uB098\uB2E4\uC5B4",
    qu: "\uCF00\uCD94\uC544\uC5B4",
    co: "\uCF54\uB974\uC2DC\uCE74\uC5B4",
    xh: "\uCF54\uC0AC\uC5B4",
    gom: "\uCF58\uCE78\uC5B4",
    ckb: "\uCFE0\uB974\uB4DC\uC5B4(\uC18C\uB77C\uB2C8)",
    ku: "\uCFE0\uB974\uB4DC\uC5B4(\uCFE0\uB974\uB9CC\uC9C0)",
    hr: "\uD06C\uB85C\uC544\uD2F0\uC544\uC5B4",
    kri: "\uD06C\uB9AC\uC624\uC5B4",
    km: "\uD06C\uBA54\uB974\uC5B4",
    rw: "\uD0A4\uB0D0\uB974\uC644\uB2E4\uC5B4",
    ky: "\uD0A4\uB974\uAE30\uC2A4\uC5B4",
    ta: "\uD0C0\uBC00\uC5B4",
    tg: "\uD0C0\uC9C0\uD06C\uC5B4",
    tt: "\uD0C0\uD0C0\uB974\uC5B4",
    th: "\uD0DC\uAD6D\uC5B4",
    tr: "\uD130\uD0A4\uC5B4",
    te: "\uD154\uB8E8\uAD6C\uC5B4",
    tk: "\uD22C\uB974\uD06C\uBA58\uC5B4",
    ak: "\uD2B8\uC704\uC5B4",
    ti: "\uD2F0\uADF8\uB9AC\uB0D0\uC5B4",
    ps: "\uD30C\uC288\uD1A0\uC5B4",
    pa: "\uD380\uC790\uBE0C\uC5B4",
    fa: "\uD398\uB974\uC2DC\uC544\uC5B4",
    pt: "\uD3EC\uB974\uD22C\uAC08\uC5B4",
    pl: "\uD3F4\uB780\uB4DC\uC5B4",
    fr: "\uD504\uB791\uC2A4\uC5B4",
    fy: "\uD504\uB9AC\uC9C0\uC544\uC5B4",
    fi: "\uD540\uB780\uB4DC\uC5B4",
    tl: "\uD544\uB9AC\uD540\uC5B4",
    haw: "\uD558\uC640\uC774\uC5B4",
    ha: "\uD558\uC6B0\uC0AC\uC5B4",
    ko: "\uD55C\uAD6D\uC5B4",
    hu: "\uD5DD\uAC00\uB9AC\uC5B4",
    he: "\uD788\uBE0C\uB9AC\uC5B4",
    hi: "\uD78C\uB514\uC5B4",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  fa: {
    az: "\u0622\u0630\u0631\u0628\u0627\uFEF3\uFEA0\uFE8E\uFEE7\uFEF0",
    as: "\u0622\u0633\u0627\u0645\u06CC",
    sq: "\u0622\u0644\u0628\u0627\u0646\u06CC\u0627\u06CC\u06CC",
    de: "\u0622\u0644\u0645\u0627\u0646\u06CC",
    ay: "\u0622\u06CC\u0645\u0627\u0631\u0627",
    ur: "\u0627\u0631\u062F\u0648",
    hy: "\u0627\u0631\u0645\u0646\u06CC",
    uz: "\u0627\u0632\u0628\u06A9\u06CC",
    es: "\u0627\u0633\u067E\u0627\u0646\u06CC\u0627\u06CC\u06CC",
    eo: "\u0627\u0633\u067E\u0631\u0627\u0646\u062A\u0648",
    et: "\u0627\u0633\u062A\u0648\u0646\u064A\u0627\u064A\u06CC",
    sk: "\u0627\u0633\u0644\u0648\u0627\u06A9\u06CC",
    sl: "\u0627\u0633\u0644\u0648\u0646\u06CC\u0627\u06CC\u06CC",
    af: "\u0627\u0641\u0631\u06CC\u06A9\u0627\u0646\u0633",
    uk: "\u0627\u06A9\u0631\u0627\u064A\u0646\u06CC",
    am: "\u0627\u0645\u0647\u0631\u06CC",
    id: "\u0627\u0646\u062F\u0648\u0646\u0632\u064A\u0627\u064A\u06CC",
    en: "\u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC",
    or: "\u0627\u0648\u062F\u06CC\u0647 (\u0627\u0648\u0631\u06CC\u0647)",
    om: "\u0627\u0648\u0631\u0648\u0645\u0648",
    ee: "\u0627\u0648\u0647\u200C\u0627\u06CC",
    ug: "\u0627\u0648\u06CC\u063A\u0648\u0631\u06CC",
    it: "\u0627\u06CC\u062A\u0627\u0644\u06CC\u0627\u06CC\u06CC",
    ga: "\u0627\u06CC\u0631\u0644\u0646\u062F\u06CC",
    is: "\u0627\u064A\u0633\u0644\u0646\u062F\u06CC",
    ig: "\u0627\u06CC\u06AF\u0628\u0648",
    ilo: "\u0627\u06CC\u0644\u0648\u06A9\u0627\u0646\u0648",
    eu: "\u0628\u0627\u0633\u06A9\u06CC",
    bm: "\u0628\u0627\u0645\u0628\u0627\u0631\u0627",
    my: "\u0628\u0631\u0645\u0647\u200C\u0627\u06CC",
    be: "\u0628\u0644\u0627\u0631\u0648\u0633\u06CC",
    bg: "\u0628\u0644\u063A\u0627\u0631\u06CC",
    bn: "\u0628\u0646\u06AF\u0627\u0644\u06CC",
    bho: "\u0628\u0648\u062C\u067E\u0648\u0631\u06CC",
    bs: "\u0628\u0648\u0633\u0646\u06CC\u0627\u06CC\u06CC",
    pt: "\u067E\u0631\u062A\u063A\u0627\u0644\u06CC",
    ps: "\u067E\u0634\u062A\u0648",
    pa: "\u067E\u0646\u062C\u0627\u0628\u06CC",
    tt: "\u062A\u0627\u062A\u0627\u0631",
    tg: "\u062A\u0627\u062C\u06CC\u06A9",
    ta: "\u062A\u0627\u0645\u064A\u0644\u06CC",
    th: "\u062A\u0627\u064A\u0644\u0646\u062F\u06CC",
    tk: "\u062A\u0631\u06A9\u0645\u0646\u06CC",
    tr: "\u062A\u0631\u06A9\u06CC \u0627\u0633\u062A\u0627\u0646\u0628\u0648\u0644\u06CC",
    ts: "\u062A\u0633\u0648\u0646\u06AF\u0627",
    te: "\u062A\u0644\u0648\u06AF\u0648",
    ak: "\u062A\u0648\u06CC\u06CC",
    ti: "\u062A\u06CC\u06AF\u0631\u06CC\u0646\u06CC\u0627",
    jv: "\u062C\u0627\u0648\u0647\u200C\u0627\u06CC",
    cs: "\u0686\u06A9",
    ny: "\u0686\u0648\u0627\u06CC\u06CC",
    "zh-CN": "\u0686\u06CC\u0646\u06CC (\u0633\u0627\u062F\u0647\u200C\u0634\u062F\u0647)",
    "zh-TW": "\u0686\u06CC\u0646\u06CC (\u0633\u0646\u062A\u06CC)",
    km: "\u062E\u0645\u0631\u06CC",
    xh: "\u062E\u0648\u0633\u0627\u06CC\u06CC",
    da: "\u062F\u0627\u0646\u0645\u0627\u0631\u06A9\u06CC",
    doi: "\u062F\u0648\u06AF\u0631\u06CC",
    dv: "\u062F\u06CC\u0648\u0647\u06CC",
    ru: "\u0631\u0648\u0633\u06CC",
    ro: "\u0631\u0648\u0645\u0627\u0646\u064A\u0627\u064A\u06CC",
    zu: "\u0632\u0648\u0644\u0648",
    ja: "\u0698\u0627\u067E\u0646\u06CC",
    sm: "\u0633\u0627\u0645\u0648\u0627\u06CC\u06CC",
    sa: "\u0633\u0627\u0646\u0633\u06A9\u0631\u06CC\u062A",
    ceb: "\u0633\u0628\u0648\u0627\u0646\u0648",
    sd: "\u0633\u0646\u062F\u06CC",
    sw: "\u0633\u0648\u0627\u062D\u06CC\u0644\u06CC",
    sv: "\u0633\u0648\u0626\u062F\u06CC",
    st: "\u0633\u0648\u062A\u0648",
    nso: "\u0633\u0648\u062A\u0648\u06CC",
    su: "\u0633\u0648\u062F\u0627\u0646\u06CC",
    so: "\u0633\u0648\u0645\u0627\u0644\u06CC\u0627\u06CC\u06CC",
    si: "\u0633\u06CC\u0646\u0647\u0627\u0644\u06CC",
    sn: "\u0634\u0648\u0646\u0627",
    sr: "\u0635\u0631\u0628\u06CC",
    he: "\u0639\u0628\u0631\u06CC",
    ar: "\u0639\u0631\u0628\u06CC",
    fa: "\u0641\u0627\u0631\u0633\u06CC",
    fr: "\u0641\u0631\u0627\u0646\u0633\u0648\u06CC",
    fy: "\u0641\u0631\u064A\u0633\u06CC",
    fi: "\u0641\u0646\u0644\u0627\u0646\u062F\u06CC",
    tl: "\u0641\u06CC\u0644\u06CC\u067E\u06CC\u0646\u06CC",
    ky: "\u0642\u0631\u0642\u06CC\u0632\u06CC",
    kk: "\u0642\u0632\u0627\u0642\u06CC",
    ca: "\u06A9\u0627\u062A\u0627\u0644\u0627\u0646",
    kn: "\u06A9\u0627\u0646\u0627\u0631\u0627",
    qu: "\u06A9\u0686\u0648\u0622",
    ht: "\u06A9\u0631\u0626\u0648\u0644 \u0647\u0627\u0626\u06CC\u062A\u06CC",
    ckb: "\u06A9\u0631\u062F\u06CC (\u0633\u0648\u0631\u0627\u0646\u06CC)",
    ku: "\u06A9\u0631\u062F\u06CC (\u06A9\u0631\u0645\u0627\u0646\u062C\u06CC)",
    co: "\u0643\u0631\u0633\u06CC",
    hr: "\u06A9\u0631\u0648\u0627\u062A\u06CC",
    ko: "\u06A9\u0631\u0647\u200C\u0627\u06CC",
    kri: "\u06A9\u0631\u06CC\u0648",
    gom: "\u06A9\u0648\u0646\u06A9\u0627\u0646\u06CC",
    rw: "\u06A9\u06CC\u0646\u06CC\u0627\u0631\u0648\u0627\u0646\u062F\u0627",
    gl: "\u06AF\u0627\u0644\u06CC\u0633\u06CC",
    gd: "\u06AF\u0627\u0644\u064A\u06A9 \u0627\u0633\u06A9\u0627\u062A\u0644\u0646\u062F\u06CC",
    gu: "\u06AF\u062C\u0631\u0627\u062A\u06CC",
    ka: "\u06AF\u0631\u062C\u06CC",
    gn: "\u06AF\u0648\u0627\u0631\u0627\u0646\u06CC",
    lo: "\u0644\u0627\u0626\u0648\u0633\u06CC",
    la: "\u0644\u0627\u062A\u064A\u0646",
    lv: "\u0644\u062A\u0648\u0646\u064A\u0627\u064A\u06CC",
    lg: "\u0644\u0648\u06AF\u0627\u0646\u062F\u0627",
    lb: "\u0644\u0648\u06AF\u0632\u0627\u0645\u0628\u0648\u0631\u06AF\u06CC",
    pl: "\u0644\u0647\u0633\u062A\u0627\u0646\u06CC",
    lt: "\u0644\u064A\u062A\u0648\u0627\u0646\u064A\u0627\u064A\u06CC",
    ln: "\u0644\u06CC\u0646\u06AF\u0627\u0644\u0627",
    mi: "\u0645\u0627\u0626\u0648\u0631\u06CC",
    mg: "\u0645\u0627\u0644\u0627\u06AF\u0627\u0633\u06CC",
    ml: "\u0645\u0627\u0644\u0627\u06CC\u0627\u0644\u0645\u06CC",
    ms: "\u0645\u0627\u0644\u0627\u064A\u06CC",
    mt: "\u0645\u0627\u0644\u062A\u06CC",
    mai: "\u0645\u0627\u06CC\u062A\u0647\u06CC\u0644\u06CC",
    hu: "\u0645\u062C\u0627\u0631\u06CC",
    mr: "\u0645\u0631\u0627\u062A\u06CC",
    mn: "\u0645\u063A\u0648\u0644\u06CC",
    mk: "\u0645\u0642\u062F\u0648\u0646\u064A\u0647\u200C\u0627\u06CC",
    "mni-Mtei": "\u0645\u06CC\u200C\u062A\u0650\u06CC\u0644\u0648\u0646 (\u0645\u0627\u0646\u06CC\u067E\u0648\u0631\u06CC)",
    lus: "\u0645\u06CC\u0632\u0648",
    ne: "\u0646\u067E\u0627\u0644\u06CC",
    no: "\u0646\u0631\u0648\u0698\u06CC",
    cy: "\u0648\u0644\u0632\u06CC",
    vi: "\u0648\u064A\u062A\u0646\u0627\u0645\u06CC",
    haw: "\u0647\u0627\u0648\u0627\u06CC\u06CC",
    nl: "\u0647\u0644\u0646\u062F\u06CC",
    hmn: "\u0647\u0645\u0648\u0646\u06AF",
    hi: "\u0647\u0646\u062F\u06CC",
    ha: "\u0647\u0648\u0633\u0647",
    yi: "\u06CC\u062F\u06CC\u0634\u06CC",
    yo: "\u06CC\u0648\u0631\u0648\u0628\u0627\u06CC\u06CC",
    el: "\u064A\u0648\u0646\u0627\u0646\u06CC",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  pl: {
    af: "afrikaans",
    ay: "ajmara",
    sq: "alba\u0144ski",
    am: "amharski",
    en: "angielski",
    ar: "arabski",
    as: "asamski",
    az: "azerski",
    bm: "bambara",
    eu: "baskijski",
    bn: "bengalski",
    bho: "bhod\u017Apuri",
    be: "bia\u0142oruski",
    my: "birma\u0144ski",
    bs: "bo\u015Bniacki",
    bg: "bu\u0142garski",
    ceb: "cebua\u0144ski",
    "zh-TW": "chi\u0144ski (tradycyjny)",
    "zh-CN": "chi\u0144ski (uproszczony)",
    hr: "chorwacki",
    cs: "czeski",
    ny: "cziczewa",
    dv: "dhivehi",
    doi: "dogri",
    da: "du\u0144ski",
    eo: "esperanto",
    et: "esto\u0144ski",
    ee: "ewe",
    tl: "filipi\u0144ski",
    fi: "fi\u0144ski",
    fr: "francuski",
    fy: "fryzyjski",
    gl: "galicyjski",
    el: "grecki",
    ka: "gruzi\u0144ski",
    gn: "guarani",
    gu: "gud\u017Carati",
    ha: "hausa",
    haw: "hawajski",
    he: "hebrajski",
    hi: "hindi",
    es: "hiszpa\u0144ski",
    hmn: "hmong",
    ig: "igbo",
    ilo: "iloka\u0144ski",
    id: "indonezyjski",
    ga: "irlandzki",
    is: "islandzki",
    ja: "japo\u0144ski",
    jv: "jawajski",
    yi: "jidysz",
    yo: "joruba",
    kn: "kannada",
    ca: "katalo\u0144ski",
    kk: "kazachski",
    qu: "keczua",
    km: "khmerski",
    ky: "kirgiski",
    gom: "konkani",
    ko: "korea\u0144ski",
    co: "korsyka\u0144ski",
    ht: "kreolski (Haiti)",
    kri: "krio",
    ku: "kurdyjski (kurmand\u017Ci)",
    ckb: "kurdyjski (sorani)",
    lo: "laota\u0144ski",
    ln: "lingala",
    lt: "litewski",
    lg: "luganda",
    lb: "luksemburski",
    la: "\u0142aci\u0144ski",
    lv: "\u0142otewski",
    mk: "macedo\u0144ski",
    mai: "maithili",
    ml: "malajalam",
    ms: "malajski",
    mg: "malgaski",
    mt: "malta\u0144ski",
    mi: "maori",
    mr: "marathi",
    "mni-Mtei": "meiteilon (manipuri)",
    lus: "mizo",
    mn: "mongolski",
    ne: "nepalski",
    nl: "niderlandzki",
    de: "niemiecki",
    no: "norweski",
    or: "odia (orija)",
    hy: "ormia\u0144ski",
    om: "oromo",
    ps: "paszto",
    pa: "pend\u017Cabski",
    fa: "perski",
    pl: "polski",
    pt: "portugalski",
    ru: "rosyjski",
    rw: "ruanda-rundi",
    ro: "rumu\u0144ski",
    sm: "samoa\u0144ski",
    sa: "sanskryt",
    nso: "sepedi",
    sr: "serbski",
    st: "sesotho",
    sn: "shona",
    sd: "sindhi",
    sk: "s\u0142owacki",
    sl: "s\u0142owe\u0144ski",
    so: "somalijski",
    sw: "suahili",
    su: "sundajski",
    si: "syngaleski",
    gd: "szkocki gaelicki",
    sv: "szwedzki",
    tg: "tad\u017Cycki",
    th: "tajski",
    ta: "tamilski",
    tt: "tatarski",
    te: "telugu",
    ti: "tigrinia",
    ts: "tsonga",
    tr: "turecki",
    tk: "turkme\u0144ski",
    ak: "twi",
    ug: "ujgurski",
    uk: "ukrai\u0144ski",
    ur: "urdu",
    uz: "uzbecki",
    cy: "walijski",
    hu: "w\u0119gierski",
    vi: "wietnamski",
    it: "w\u0142oski",
    xh: "xhosa",
    zu: "zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  "pt-PT": {
    af: "Afrikaans",
    ay: "Aimar\xE1",
    sq: "Alban\xEAs",
    de: "Alem\xE3o",
    am: "Am\xE1rico",
    ar: "\xC1rabe",
    hy: "Arm\xE9nio",
    as: "Assam\xEAs",
    az: "Azerbaijano",
    bm: "Bambara",
    eu: "Basco",
    bn: "Bengali",
    bho: "Bhojpuri",
    be: "Bielorusso",
    my: "Birman\xEAs",
    bs: "B\xF3snio",
    bg: "B\xFAlgaro",
    kn: "Canarim",
    ca: "Catal\xE3o",
    kk: "Cazaque",
    ceb: "Cebuano",
    cs: "Checo",
    ny: "Chichewa",
    "zh-CN": "Chin\xEAs (Simplificado)",
    "zh-TW": "Chin\xEAs (Tradicional)",
    si: "Cingal\xEAs",
    gom: "Concani",
    ko: "Coreano",
    co: "Corso",
    ht: "Crioulo Haitiano",
    hr: "Croata",
    ku: "Curdo (kurmanji)",
    ckb: "Curdo (sorani)",
    da: "Dinamarqu\xEAs",
    dv: "Divehi",
    doi: "Dogri",
    sk: "Eslovaco",
    sl: "Esloveno",
    es: "Espanhol",
    eo: "Esperanto",
    et: "Est\xF3nio",
    ee: "Ewe",
    tl: "Filipino",
    fi: "Finland\xEAs",
    fr: "Franc\xEAs",
    fy: "Fr\xEDsio",
    gd: "Ga\xE9lico da Esc\xF3cia",
    gl: "Galego",
    cy: "Gal\xEAs",
    ka: "Georgiano",
    el: "Grego",
    gn: "Guarani",
    gu: "Gujarati",
    ha: "Ha\xFA\xE7a",
    haw: "Havaiano",
    he: "Hebraico",
    hi: "Hindu",
    hmn: "Hmong",
    nl: "Holand\xEAs",
    hu: "H\xFAngaro",
    ig: "Ibo",
    yi: "I\xEDdiche",
    ilo: "Ilocano",
    id: "Indon\xE9sio",
    en: "Ingl\xEAs",
    yo: "Ioruba",
    ga: "Irland\xEAs",
    is: "Island\xEAs",
    it: "Italiano",
    ja: "Japon\xEAs",
    jv: "Javan\xEAs",
    km: "Khmer",
    rw: "Kinyarwanda",
    kri: "Krio",
    lo: "Laosiano",
    la: "Latim",
    lv: "Let\xE3o",
    ln: "Lingala",
    lt: "Lituano",
    lg: "Luganda",
    lb: "Luxemburgu\xEAs",
    mk: "Maced\xF3nio",
    mai: "Maithili",
    ml: "Malaiala",
    ms: "Malaio",
    mg: "Malgaxe",
    mt: "Malt\xEAs",
    mi: "Maori",
    mr: "Marata",
    "mni-Mtei": "Meiteilon (manipuri)",
    lus: "Mizo",
    mn: "Mongol",
    ne: "Nepal\xEAs",
    no: "Noruegu\xEAs",
    or: "Ori\xE1 (oriya)",
    om: "Oromo",
    ps: "Past\xF3",
    fa: "Persa",
    pl: "Polaco",
    pt: "Portugu\xEAs",
    pa: "Punjabi",
    qu: "Qu\xEDchua",
    ky: "Quirguistan\xEAs",
    ro: "Romeno",
    ru: "Russo",
    sm: "Samoano",
    sa: "S\xE2nscrito",
    nso: "Sepedi",
    sr: "S\xE9rvio",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindi",
    so: "Somali",
    sw: "Sua\xEDli",
    su: "Sudan\xEAs",
    sv: "Sueco",
    th: "Tailand\xEAs",
    tg: "Tajique",
    ta: "T\xE2mil",
    tt: "T\xE1rtaro",
    te: "Telugu",
    ti: "Tigrino",
    ts: "Tsonga",
    tr: "Turco",
    tk: "Turcomano",
    ak: "Twi",
    uk: "Ucraniano",
    ug: "Uigur",
    ur: "Urdu",
    uz: "Usbeque",
    vi: "Vietnamita",
    xh: "Xhosa",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  "pt-BR": {
    af: "Afric\xE2ner",
    ay: "Aimar\xE1",
    sq: "Alban\xEAs",
    de: "Alem\xE3o",
    am: "Am\xE1rico",
    ar: "\xC1rabe",
    hy: "Arm\xEAnio",
    as: "Assam\xEAs",
    az: "Azerbaijano",
    bm: "Bambara",
    eu: "Basco",
    bn: "Bengali",
    be: "Bielorrusso",
    my: "Birman\xEAs",
    bho: "Boiapuri",
    bs: "B\xF3snio",
    bg: "B\xFAlgaro",
    kn: "Canar\xEAs",
    ca: "Catal\xE3o",
    kk: "Cazaque",
    ceb: "Cebuano",
    ny: "Chicheua",
    "zh-CN": "Chin\xEAs (simplificado)",
    "zh-TW": "Chin\xEAs (tradicional)",
    sn: "Chona",
    si: "Cingal\xEAs",
    gom: "Concani",
    ko: "Coreano",
    co: "Corso",
    ht: "Crioulo haitiano",
    hr: "Croata",
    ku: "Curdo (kurmanji)",
    ckb: "Curdo (sor\xE2ni)",
    da: "Dinamarqu\xEAs",
    dv: "Dive\xED",
    doi: "Dogri",
    sk: "Eslovaco",
    sl: "Esloveno",
    es: "Espanhol",
    eo: "Esperanto",
    et: "Estoniano",
    tl: "Filipino",
    fi: "Finland\xEAs",
    fr: "Franc\xEAs",
    fy: "Fr\xEDsio",
    gd: "Ga\xE9lico escoc\xEAs",
    gl: "Galego",
    cy: "Gal\xEAs",
    ka: "Georgiano",
    el: "Grego",
    gn: "Guarani",
    gu: "Guzerate",
    ha: "Hau\xE7\xE1",
    haw: "Havaiano",
    he: "Hebraico",
    hi: "Hindi",
    hmn: "Hmong",
    nl: "Holand\xEAs",
    hu: "H\xFAngaro",
    ig: "Igbo",
    yi: "I\xEDdiche",
    ilo: "Ilocano",
    id: "Indon\xE9sio",
    en: "Ingl\xEAs",
    yo: "Iorub\xE1",
    ga: "Irland\xEAs",
    is: "Island\xEAs",
    it: "Italiano",
    ja: "Japon\xEAs",
    jv: "Javan\xEAs",
    ee: "Jeje",
    km: "Khmer",
    kri: "Krio",
    lo: "Laosiano",
    la: "Latim",
    lv: "Let\xE3o",
    ln: "Lingala",
    lt: "Lituano",
    lg: "Luganda",
    lb: "Luxemburgu\xEAs",
    mk: "Maced\xF4nio",
    mai: "Maithili",
    ml: "Malaiala",
    ms: "Malaio",
    mg: "Malgaxe",
    mt: "Malt\xEAs",
    mi: "Maori",
    mr: "Marata",
    "mni-Mtei": "Meiteilon (manipuri)",
    lus: "Mizo",
    mn: "Mongol",
    ne: "Nepal\xEAs",
    no: "Noruegu\xEAs",
    or: "Ori\xE1",
    om: "Oromo",
    ps: "Pachto",
    fa: "Persa",
    pl: "Polon\xEAs",
    pt: "Portugu\xEAs",
    pa: "Punjabi",
    qu: "Qu\xEDchua",
    rw: "Quiniaruanda",
    ky: "Quirguiz",
    ro: "Romeno",
    ru: "Russo",
    sm: "Samoano",
    sa: "S\xE2nscrito",
    nso: "Sepedi",
    sr: "S\xE9rvio",
    st: "Sessoto",
    sd: "Sindi",
    so: "Somali",
    sw: "Sua\xEDli",
    sv: "Sueco",
    su: "Sundan\xEAs",
    tg: "Tadjique",
    th: "Tailand\xEAs",
    ta: "T\xE2mil",
    tt: "T\xE1rtaro",
    cs: "Tcheco",
    te: "Telugo",
    ti: "Tigr\xEDnia",
    ts: "Tsonga",
    tr: "Turco",
    tk: "Turcomano",
    ak: "Twi",
    uk: "Ucraniano",
    ug: "Uigur",
    ur: "Urdu",
    uz: "Uzbeque",
    vi: "Vietnamita",
    xh: "Xhosa",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  ro: {
    af: "Afrikaans",
    sq: "Albanez\u0103",
    am: "Amharic\u0103",
    ar: "Arab\u0103",
    hy: "Armean\u0103",
    as: "Asamez\u0103",
    ay: "Aymara",
    az: "Azerbaidjan\u0103",
    bm: "Bambara",
    eu: "Basc\u0103",
    bn: "Bengali",
    bho: "Bhojpuri",
    be: "Bielorus\u0103",
    my: "Birman\u0103",
    bs: "Bosniac\u0103",
    bg: "Bulgar\u0103",
    ca: "Catalan\u0103",
    ceb: "Cebuan\u0103",
    cs: "Ceh\u0103",
    ny: "Chichewa",
    "zh-CN": "Chinez\u0103 (Simplificat\u0103)",
    "zh-TW": "Chinez\u0103 (Tradi\u021Bional\u0103)",
    ko: "Coreean\u0103",
    co: "Corsican\u0103",
    ht: "Creol\u0103 haitian\u0103",
    hr: "Croat\u0103",
    da: "Danez\u0103",
    dv: "Dhivehi",
    doi: "Dogri",
    he: "Ebraic\u0103",
    en: "Englez\u0103",
    eo: "Esperanto",
    et: "Eston\u0103",
    ee: "Ewe",
    tl: "Filipinez\u0103",
    fi: "Finlandez\u0103",
    fr: "Francez\u0103",
    fy: "Frizon\u0103",
    cy: "Galez\u0103",
    gd: "Galica sco\u021Bian\u0103",
    gl: "Galician\u0103",
    de: "German\u0103",
    el: "Greac\u0103",
    ka: "Gruzin\u0103",
    gn: "Guarani",
    gu: "Gujarati",
    ha: "Hausa",
    haw: "Hawaiian\u0103",
    hi: "Hindi",
    hmn: "Hmong",
    yi: "Idi\u0219",
    ig: "Igbo",
    ilo: "Ilocano",
    id: "Indonezian\u0103",
    ga: "Irlandez\u0103",
    is: "Islandez\u0103",
    it: "Italian\u0103",
    ja: "Japonez\u0103",
    jv: "Javanez\u0103",
    kn: "Kannada",
    kk: "Kazah\u0103",
    ky: "K\xE2rg\xE2z\u0103",
    km: "Khmer\u0103",
    rw: "Kinyarwanda",
    gom: "Konkan\u0103",
    kri: "Krio",
    ku: "Kurd\u0103 (Kurmanji)",
    ckb: "Kurd\u0103 (Sorani)",
    lo: "Lao\u021Bian\u0103",
    la: "Latin\u0103",
    lv: "Leton\u0103",
    ln: "Lingala",
    lt: "Lituanian\u0103",
    lg: "Luganda",
    lb: "Luxemburghez\u0103",
    mk: "Macedonean\u0103",
    hu: "Maghiar\u0103",
    mai: "Maithil\u0103",
    ms: "Malaez\u0103",
    ml: "Malayalam",
    mg: "Malga\u0219\u0103",
    mt: "Maltez\u0103",
    mi: "Maori",
    mr: "Marathi",
    "mni-Mtei": "Meiteilon (Manipuri)",
    lus: "Mizo",
    mn: "Mongol\u0103",
    nl: "Neerlandez\u0103",
    ne: "Nepalez\u0103",
    no: "Norvegian\u0103",
    or: "Odia (Oriya)",
    om: "Oromo",
    ps: "Pashto",
    fa: "Persan\u0103",
    pl: "Polonez\u0103",
    pt: "Portughez\u0103",
    pa: "Punjabi",
    qu: "Quechua",
    ro: "Rom\xE2n\u0103",
    ru: "Rus\u0103",
    sm: "Samoan\u0103",
    sa: "Sanscrit\u0103",
    sr: "S\xE2rb\u0103",
    nso: "Sepedi",
    st: "Sesotho",
    sn: "Shon\u0103",
    sd: "Sindhi",
    si: "Singhalez\u0103",
    sk: "Slovac\u0103",
    sl: "Sloven\u0103",
    so: "Somali",
    es: "Spaniol\u0103",
    sv: "Suedez\u0103",
    su: "Sundanez\u0103",
    sw: "Swahili",
    tg: "Tadjic\u0103",
    ta: "Tamil\u0103",
    tt: "T\u0103tar\u0103",
    te: "Telugu",
    th: "Thailandez\u0103",
    ti: "Tigrin\u0103",
    ts: "Tsonga",
    tr: "Turc\u0103",
    tk: "Turkmen\u0103",
    ak: "Twi",
    uk: "Ucrainean\u0103",
    ug: "Uigur\u0103",
    ur: "Urdu",
    uz: "Uzbec\u0103",
    vi: "Vietnamez\u0103",
    xh: "Xhosa",
    yo: "Yoruba",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  ru: {
    az: "\u0430\u0437\u0435\u0440\u0431\u0430\u0439\u0434\u0436\u0430\u043D\u0441\u043A\u0438\u0439",
    ay: "\u0430\u0439\u043C\u0430\u0440\u0430",
    sq: "\u0430\u043B\u0431\u0430\u043D\u0441\u043A\u0438\u0439",
    am: "\u0430\u043C\u0445\u0430\u0440\u0441\u043A\u0438\u0439",
    en: "\u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
    ar: "\u0430\u0440\u0430\u0431\u0441\u043A\u0438\u0439",
    hy: "\u0430\u0440\u043C\u044F\u043D\u0441\u043A\u0438\u0439",
    as: "\u0430\u0441\u0441\u0430\u043C\u0441\u043A\u0438\u0439",
    af: "\u0430\u0444\u0440\u0438\u043A\u0430\u0430\u043D\u0441",
    bm: "\u0431\u0430\u043C\u0431\u0430\u0440\u0430",
    eu: "\u0431\u0430\u0441\u043A\u0441\u043A\u0438\u0439",
    be: "\u0431\u0435\u043B\u043E\u0440\u0443\u0441\u0441\u043A\u0438\u0439",
    bn: "\u0431\u0435\u043D\u0433\u0430\u043B\u044C\u0441\u043A\u0438\u0439",
    my: "\u0431\u0438\u0440\u043C\u0430\u043D\u0441\u043A\u0438\u0439",
    bg: "\u0431\u043E\u043B\u0433\u0430\u0440\u0441\u043A\u0438\u0439",
    bs: "\u0431\u043E\u0441\u043D\u0438\u0439\u0441\u043A\u0438\u0439",
    bho: "\u0431\u0445\u043E\u0434\u0436\u043F\u0443\u0440\u0438",
    cy: "\u0432\u0430\u043B\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
    hu: "\u0432\u0435\u043D\u0433\u0435\u0440\u0441\u043A\u0438\u0439",
    vi: "\u0432\u044C\u0435\u0442\u043D\u0430\u043C\u0441\u043A\u0438\u0439",
    haw: "\u0433\u0430\u0432\u0430\u0439\u0441\u043A\u0438\u0439",
    gl: "\u0433\u0430\u043B\u0438\u0441\u0438\u0439\u0441\u043A\u0438\u0439",
    el: "\u0433\u0440\u0435\u0447\u0435\u0441\u043A\u0438\u0439",
    ka: "\u0433\u0440\u0443\u0437\u0438\u043D\u0441\u043A\u0438\u0439",
    gn: "\u0433\u0443\u0430\u0440\u0430\u043D\u0438",
    gu: "\u0433\u0443\u0434\u0436\u0430\u0440\u0430\u0442\u0438",
    da: "\u0434\u0430\u0442\u0441\u043A\u0438\u0439",
    doi: "\u0434\u043E\u0433\u0440\u0438",
    zu: "\u0437\u0443\u043B\u0443",
    he: "\u0438\u0432\u0440\u0438\u0442",
    ig: "\u0438\u0433\u0431\u043E",
    yi: "\u0438\u0434\u0438\u0448",
    ilo: "\u0438\u043B\u043E\u043A\u0430\u043D\u0441\u043A\u0438\u0439",
    id: "\u0438\u043D\u0434\u043E\u043D\u0435\u0437\u0438\u0439\u0441\u043A\u0438\u0439",
    ga: "\u0438\u0440\u043B\u0430\u043D\u0434\u0441\u043A\u0438\u0439",
    is: "\u0438\u0441\u043B\u0430\u043D\u0434\u0441\u043A\u0438\u0439",
    es: "\u0438\u0441\u043F\u0430\u043D\u0441\u043A\u0438\u0439",
    it: "\u0438\u0442\u0430\u043B\u044C\u044F\u043D\u0441\u043A\u0438\u0439",
    yo: "\u0439\u043E\u0440\u0443\u0431\u0430",
    kk: "\u043A\u0430\u0437\u0430\u0445\u0441\u043A\u0438\u0439",
    kn: "\u043A\u0430\u043D\u043D\u0430\u0434\u0430",
    ca: "\u043A\u0430\u0442\u0430\u043B\u0430\u043D\u0441\u043A\u0438\u0439",
    qu: "\u043A\u0435\u0447\u0443\u0430",
    ky: "\u043A\u0438\u0440\u0433\u0438\u0437\u0441\u043A\u0438\u0439",
    "zh-TW": "\u043A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 (\u0442\u0440\u0430\u0434\u0438\u0446\u0438\u043E\u043D\u043D\u044B\u0439)",
    "zh-CN": "\u043A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 (\u0443\u043F\u0440\u043E\u0449\u0435\u043D\u043D\u044B\u0439)",
    gom: "\u043A\u043E\u043D\u043A\u0430\u043D\u0438",
    ko: "\u043A\u043E\u0440\u0435\u0439\u0441\u043A\u0438\u0439",
    co: "\u043A\u043E\u0440\u0441\u0438\u043A\u0430\u043D\u0441\u043A\u0438\u0439",
    xh: "\u043A\u043E\u0441\u0430",
    ht: "\u043A\u0440\u0435\u043E\u043B\u044C\u0441\u043A\u0438\u0439 (\u0433\u0430\u0438\u0442\u0438)",
    kri: "\u043A\u0440\u0438\u043E",
    ku: "\u043A\u0443\u0440\u0434\u0441\u043A\u0438\u0439 (\u043A\u0443\u0440\u043C\u0430\u043D\u0434\u0436\u0438)",
    ckb: "\u043A\u0443\u0440\u0434\u0441\u043A\u0438\u0439 (\u0441\u043E\u0440\u0430\u043D\u0438)",
    km: "\u043A\u0445\u043C\u0435\u0440\u0441\u043A\u0438\u0439",
    lo: "\u043B\u0430\u043E\u0441\u0441\u043A\u0438\u0439",
    la: "\u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0439",
    lv: "\u043B\u0430\u0442\u044B\u0448\u0441\u043A\u0438\u0439",
    ln: "\u043B\u0438\u043D\u0433\u0430\u043B\u0430",
    lt: "\u043B\u0438\u0442\u043E\u0432\u0441\u043A\u0438\u0439",
    lg: "\u043B\u0443\u0433\u0430\u043D\u0434\u0430",
    lb: "\u043B\u044E\u043A\u0441\u0435\u043C\u0431\u0443\u0440\u0433\u0441\u043A\u0438\u0439",
    mai: "\u043C\u0430\u0439\u0442\u0445\u0438\u043B\u0438",
    mk: "\u043C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438\u0439",
    mg: "\u043C\u0430\u043B\u0430\u0433\u0430\u0441\u0438\u0439\u0441\u043A\u0438\u0439",
    ms: "\u043C\u0430\u043B\u0430\u0439\u0441\u043A\u0438\u0439",
    ml: "\u043C\u0430\u043B\u0430\u044F\u043B\u0430\u043C",
    dv: "\u043C\u0430\u043B\u044C\u0434\u0438\u0432\u0441\u043A\u0438\u0439",
    mt: "\u043C\u0430\u043B\u044C\u0442\u0438\u0439\u0441\u043A\u0438\u0439",
    mi: "\u043C\u0430\u043E\u0440\u0438",
    mr: "\u043C\u0430\u0440\u0430\u0442\u0445\u0438",
    "mni-Mtei": "\u043C\u0435\u0439\u0442\u0435\u0439\u043B\u043E\u043D (\u043C\u0430\u043D\u0438\u043F\u0443\u0440\u0438)",
    lus: "\u043C\u0438\u0437\u043E",
    mn: "\u043C\u043E\u043D\u0433\u043E\u043B\u044C\u0441\u043A\u0438\u0439",
    de: "\u043D\u0435\u043C\u0435\u0446\u043A\u0438\u0439",
    ne: "\u043D\u0435\u043F\u0430\u043B\u044C\u0441\u043A\u0438\u0439",
    nl: "\u043D\u0438\u0434\u0435\u0440\u043B\u0430\u043D\u0434\u0441\u043A\u0438\u0439",
    no: "\u043D\u043E\u0440\u0432\u0435\u0436\u0441\u043A\u0438\u0439",
    or: "\u043E\u0440\u0438\u044F",
    om: "\u043E\u0440\u043E\u043C\u043E",
    pa: "\u043F\u0430\u043D\u0434\u0436\u0430\u0431\u0438",
    fa: "\u043F\u0435\u0440\u0441\u0438\u0434\u0441\u043A\u0438\u0439",
    pl: "\u043F\u043E\u043B\u044C\u0441\u043A\u0438\u0439",
    pt: "\u043F\u043E\u0440\u0442\u0443\u0433\u0430\u043B\u044C\u0441\u043A\u0438\u0439",
    ps: "\u043F\u0443\u0448\u0442\u0443",
    rw: "\u0440\u0443\u0430\u043D\u0434\u0430",
    ro: "\u0440\u0443\u043C\u044B\u043D\u0441\u043A\u0438\u0439",
    ru: "\u0440\u0443\u0441\u0441\u043A\u0438\u0439",
    sm: "\u0441\u0430\u043C\u043E\u0430\u043D\u0441\u043A\u0438\u0439",
    sa: "\u0441\u0430\u043D\u0441\u043A\u0440\u0438\u0442",
    ceb: "\u0441\u0435\u0431\u0443\u0430\u043D\u0441\u043A\u0438\u0439",
    nso: "\u0441\u0435\u043F\u0435\u0434\u0438",
    sr: "\u0441\u0435\u0440\u0431\u0441\u043A\u0438\u0439",
    st: "\u0441\u0435\u0441\u043E\u0442\u043E",
    si: "\u0441\u0438\u043D\u0433\u0430\u043B\u044C\u0441\u043A\u0438\u0439",
    sd: "\u0441\u0438\u043D\u0434\u0445\u0438",
    sk: "\u0441\u043B\u043E\u0432\u0430\u0446\u043A\u0438\u0439",
    sl: "\u0441\u043B\u043E\u0432\u0435\u043D\u0441\u043A\u0438\u0439",
    so: "\u0441\u043E\u043C\u0430\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
    sw: "\u0441\u0443\u0430\u0445\u0438\u043B\u0438",
    su: "\u0441\u0443\u043D\u0434\u0430\u043D\u0441\u043A\u0438\u0439",
    tg: "\u0442\u0430\u0434\u0436\u0438\u043A\u0441\u043A\u0438\u0439",
    th: "\u0442\u0430\u0439\u0441\u043A\u0438\u0439",
    ta: "\u0442\u0430\u043C\u0438\u043B\u044C\u0441\u043A\u0438\u0439",
    tt: "\u0442\u0430\u0442\u0430\u0440\u0441\u043A\u0438\u0439",
    te: "\u0442\u0435\u043B\u0443\u0433\u0443",
    ti: "\u0442\u0438\u0433\u0440\u0438\u043D\u044C\u044F",
    ts: "\u0442\u0441\u043E\u043D\u0433\u0430",
    tr: "\u0442\u0443\u0440\u0435\u0446\u043A\u0438\u0439",
    tk: "\u0442\u0443\u0440\u043A\u043C\u0435\u043D\u0441\u043A\u0438\u0439",
    uz: "\u0443\u0437\u0431\u0435\u043A\u0441\u043A\u0438\u0439",
    ug: "\u0443\u0439\u0433\u0443\u0440\u0441\u043A\u0438\u0439",
    uk: "\u0443\u043A\u0440\u0430\u0438\u043D\u0441\u043A\u0438\u0439",
    ur: "\u0443\u0440\u0434\u0443",
    tl: "\u0444\u0438\u043B\u0438\u043F\u043F\u0438\u043D\u0441\u043A\u0438\u0439",
    fi: "\u0444\u0438\u043D\u0441\u043A\u0438\u0439",
    fr: "\u0444\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0439",
    fy: "\u0444\u0440\u0438\u0437\u0441\u043A\u0438\u0439",
    ha: "\u0445\u0430\u0443\u0441\u0430",
    hi: "\u0445\u0438\u043D\u0434\u0438",
    hmn: "\u0445\u043C\u043E\u043D\u0433",
    hr: "\u0445\u043E\u0440\u0432\u0430\u0442\u0441\u043A\u0438\u0439",
    ak: "\u0447\u0432\u0438",
    ny: "\u0447\u0435\u0432\u0430",
    cs: "\u0447\u0435\u0448\u0441\u043A\u0438\u0439",
    sv: "\u0448\u0432\u0435\u0434\u0441\u043A\u0438\u0439",
    sn: "\u0448\u043E\u043D\u0430",
    gd: "\u0448\u043E\u0442\u043B\u0430\u043D\u0434\u0441\u043A\u0438\u0439 (\u0433\u044D\u043B\u044C\u0441\u043A\u0438\u0439)",
    ee: "\u044D\u0432\u0435",
    eo: "\u044D\u0441\u043F\u0435\u0440\u0430\u043D\u0442\u043E",
    et: "\u044D\u0441\u0442\u043E\u043D\u0441\u043A\u0438\u0439",
    jv: "\u044F\u0432\u0430\u043D\u0441\u043A\u0438\u0439",
    ja: "\u044F\u043F\u043E\u043D\u0441\u043A\u0438\u0439",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  sl: {
    af: "afrikan\u0161\u010Dina",
    ay: "ajmar\u0161\u010Dina",
    sq: "alban\u0161\u010Dina",
    am: "amhar\u0161\u010Dina",
    en: "angle\u0161\u010Dina",
    ar: "arab\u0161\u010Dina",
    hy: "armen\u0161\u010Dina",
    as: "asam\u0161\u010Dina",
    az: "azerbajd\u017Ean\u0161\u010Dina",
    bm: "bambar\u0161\u010Dina",
    eu: "baskov\u0161\u010Dina",
    be: "beloru\u0161\u010Dina",
    bn: "bengal\u0161\u010Dina",
    bho: "bojpur\u0161\u010Dina",
    bg: "bolgar\u0161\u010Dina",
    bs: "bosan\u0161\u010Dina",
    my: "burman\u0161\u010Dina",
    cs: "\u010De\u0161\u010Dina",
    ny: "\u010Dev\u0161\u010Dina",
    da: "dan\u0161\u010Dina",
    dv: "dive\u0161\u010Dina",
    doi: "dogri",
    eo: "esperanto",
    et: "eston\u0161\u010Dina",
    ee: "evej\u0161\u010Dina",
    fi: "fin\u0161\u010Dina",
    fr: "franco\u0161\u010Dina",
    fy: "frizij\u0161\u010Dina",
    gl: "galicij\u0161\u010Dina",
    el: "gr\u0161\u010Dina",
    ka: "gruzin\u0161\u010Dina",
    gu: "gud\u017Earat\u0161\u010Dina",
    gn: "gvaran\u0161\u010Dina",
    ht: "haitijska kreol\u0161\u010Dina",
    haw: "havaj\u0161\u010Dina",
    ha: "hav\u0161\u010Dina",
    he: "hebrej\u0161\u010Dina",
    hi: "hindij\u0161\u010Dina",
    hmn: "hmon\u0161\u010Dina",
    hr: "hrva\u0161\u010Dina",
    ig: "igbo\u0161\u010Dina",
    ilo: "ilokan\u0161\u010Dina",
    id: "indonezij\u0161\u010Dina",
    ga: "ir\u0161\u010Dina",
    is: "island\u0161\u010Dina",
    it: "italijan\u0161\u010Dina",
    ja: "japon\u0161\u010Dina",
    jv: "javan\u0161\u010Dina",
    yi: "jidi\u0161\u010Dina",
    yo: "jorub\u0161\u010Dina",
    kn: "kanare\u0161\u010Dina",
    ca: "katalon\u0161\u010Dina",
    kk: "kaza\u0161\u010Dina",
    qu: "ke\u010Dvan\u0161\u010Dina",
    rw: "kinjarvand\u0161\u010Dina",
    ky: "kirgi\u0161\u010Dina",
    "zh-CN": "kitaj\u0161\u010Dina (poenostavljena)",
    "zh-TW": "kitaj\u0161\u010Dina (tradicionalna)",
    km: "kmer\u0161\u010Dina",
    gom: "konkan\u0161\u010Dina",
    ko: "korej\u0161\u010Dina",
    co: "korzi\u0161\u010Dina",
    xh: "ko\u0161\u010Dina",
    kri: "krij\u0161\u010Dina",
    ku: "kurd\u0161\u010Dina (kurmand\u017Ei)",
    ckb: "kurd\u0161\u010Dina (soran\u0161\u010Dina)",
    lo: "lao\u0161\u010Dina",
    la: "latin\u0161\u010Dina",
    lv: "latvij\u0161\u010Dina",
    ln: "lingala",
    lt: "litov\u0161\u010Dina",
    lg: "lugand\u0161\u010Dina",
    lb: "luksembur\u0161\u010Dina",
    hu: "mad\u017Ear\u0161\u010Dina",
    mai: "maitil\u0161\u010Dina",
    mk: "makedon\u0161\u010Dina",
    mg: "malaga\u0161\u010Dina",
    ml: "malajal\u0161\u010Dina",
    ms: "malaj\u0161\u010Dina",
    mt: "malte\u0161\u010Dina",
    mi: "maor\u0161\u010Dina",
    mr: "marat\u0161\u010Dina",
    "mni-Mtei": "meiteilon (manipur\u0161\u010Dina)",
    lus: "mizoj\u0161\u010Dina",
    mn: "mongol\u0161\u010Dina",
    de: "nem\u0161\u010Dina",
    ne: "nepal\u0161\u010Dina",
    nl: "nizozem\u0161\u010Dina",
    no: "norve\u0161\u010Dina",
    or: "odij\u0161\u010Dina (orij\u0161\u010Dina)",
    om: "orom\u0161\u010Dina",
    pa: "pand\u017Eab\u0161\u010Dina",
    ps: "pa\u0161tun\u0161\u010Dina",
    fa: "perzij\u0161\u010Dina",
    pl: "polj\u0161\u010Dina",
    pt: "portugal\u0161\u010Dina",
    ro: "romun\u0161\u010Dina",
    ru: "ru\u0161\u010Dina",
    sm: "samoan\u0161\u010Dina",
    sa: "sanskrt",
    ceb: "sebuan\u0161\u010Dina",
    nso: "seped\u0161\u010Dina",
    st: "sesot\u0161\u010Dina",
    sd: "sind\u0161\u010Dina",
    si: "singal\u0161\u010Dina",
    sk: "slova\u0161\u010Dina",
    sl: "sloven\u0161\u010Dina",
    so: "somal\u0161\u010Dina",
    sr: "srb\u0161\u010Dina",
    su: "sundan\u0161\u010Dina",
    sw: "svahil\u0161\u010Dina",
    gd: "\u0161kotska gel\u0161\u010Dina",
    sn: "\u0161on\u0161\u010Dina",
    es: "\u0161pan\u0161\u010Dina",
    sv: "\u0161ved\u0161\u010Dina",
    tg: "tad\u017Ei\u0161\u010Dina",
    tl: "tagalo\u0161\u010Dina",
    th: "taj\u0161\u010Dina",
    ta: "tamil\u0161\u010Dina",
    tt: "tatar\u0161\u010Dina",
    te: "telu\u0161\u010Dina",
    ti: "tigrinj\u0161\u010Dina",
    ts: "tsong\u0161\u010Dina",
    tk: "turkmen\u0161\u010Dina",
    tr: "tur\u0161\u010Dina",
    ak: "tvi\u0161\u010Dina",
    ug: "ujgur\u0161\u010Dina",
    uk: "ukrajin\u0161\u010Dina",
    ur: "urduj\u0161\u010Dina",
    uz: "uzbe\u0161\u010Dina",
    cy: "vali\u017Ean\u0161\u010Dina",
    vi: "vietnam\u0161\u010Dina",
    zu: "zuluj\u0161\u010Dina",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  es: {
    af: "afrik\xE1ans",
    ay: "aimara",
    sq: "alban\xE9s",
    de: "alem\xE1n",
    am: "amh\xE1rico",
    ar: "\xE1rabe",
    hy: "armenio",
    as: "asam\xE9s",
    az: "azer\xED",
    bm: "bambara",
    bn: "bengal\xED",
    bho: "bhoyapur\xED",
    be: "bielorruso",
    my: "birmano",
    bs: "bosnio",
    bg: "b\xFAlgaro",
    km: "camboyano",
    kn: "canar\xE9s",
    ca: "catal\xE1n",
    ceb: "cebuano",
    cs: "checo",
    ny: "chichewa",
    "zh-CN": "chino (simplificado)",
    "zh-TW": "chino (tradicional)",
    si: "cingal\xE9s",
    ko: "coreano",
    co: "corso",
    ht: "criollo haitiano",
    hr: "croata",
    da: "dan\xE9s",
    dv: "divehi",
    doi: "dogri",
    sk: "eslovaco",
    sl: "esloveno",
    es: "espa\xF1ol",
    eo: "esperanto",
    et: "estonio",
    eu: "euskera",
    ee: "ew\xE9",
    fi: "finland\xE9s",
    fr: "franc\xE9s",
    fy: "frisio",
    gd: "ga\xE9lico escoc\xE9s",
    cy: "gal\xE9s",
    gl: "gallego",
    ka: "georgiano",
    el: "griego",
    gn: "guaran\xED",
    gu: "gujarati",
    ha: "hausa",
    haw: "hawaiano",
    he: "hebreo",
    hi: "hindi",
    hmn: "hmong",
    hu: "h\xFAngaro",
    ig: "igbo",
    ilo: "ilocano",
    id: "indonesio",
    en: "ingl\xE9s",
    ga: "irland\xE9s",
    is: "island\xE9s",
    it: "italiano",
    ja: "japon\xE9s",
    jv: "javan\xE9s",
    kk: "kazajo",
    rw: "kinyarwanda",
    ky: "kirgu\xEDs",
    gom: "konkan\xED",
    kri: "krio",
    ku: "kurdo (kurmanyi)",
    ckb: "kurdo (sorani)",
    lo: "lao",
    la: "lat\xEDn",
    lv: "let\xF3n",
    ln: "lingala",
    lt: "lituano",
    lg: "luganda",
    lb: "luxemburgu\xE9s",
    mk: "macedonio",
    mai: "maithili",
    ml: "malayalam",
    ms: "malayo",
    mg: "malgache",
    mt: "malt\xE9s",
    mi: "maor\xED",
    mr: "marat\xED",
    "mni-Mtei": "meiteilon (manipuri)",
    lus: "mizo",
    mn: "mongol",
    nl: "neerland\xE9s",
    ne: "nepal\xED",
    no: "noruego",
    or: "oriya",
    om: "oromo",
    pa: "panyab\xED",
    ps: "past\xFAn",
    fa: "persa",
    pl: "polaco",
    pt: "portugu\xE9s",
    qu: "quechua",
    ro: "rumano",
    ru: "ruso",
    sm: "samoano",
    sa: "s\xE1nscrito",
    nso: "sepedi",
    sr: "serbio",
    st: "sesoto",
    sn: "shona",
    sd: "sindhi",
    so: "somal\xED",
    sw: "suajili",
    sv: "sueco",
    su: "sundan\xE9s",
    tl: "tagalo",
    th: "tailand\xE9s",
    ta: "tamil",
    tt: "t\xE1rtaro",
    tg: "tayiko",
    te: "telugu",
    ti: "tigri\xF1a",
    ts: "tsonga",
    tr: "turco",
    tk: "turkmeno",
    ak: "twi",
    uk: "ucraniano",
    ug: "uigur",
    ur: "urdu",
    uz: "uzbeco",
    vi: "vietnamita",
    xh: "xhosa",
    yi: "yidis",
    yo: "yoruba",
    zu: "zul\xFA",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  sv: {
    af: "afrikaans",
    sq: "albanska",
    am: "amhariska",
    ar: "arabiska",
    hy: "armeniska",
    as: "assamesiska",
    ay: "aymara",
    az: "azerbajdzjanska",
    bm: "bambara",
    eu: "baskiska",
    bn: "bengali",
    bho: "bhojpuri",
    bs: "bosniska",
    bg: "bulgariska",
    my: "burmesiska",
    ceb: "cebuano",
    ny: "chichewa",
    da: "danska",
    dv: "divehi",
    doi: "dogri",
    en: "engelska",
    eo: "esperanto",
    et: "estniska",
    ee: "ewe",
    tl: "filippinska",
    fi: "finska",
    fr: "franska",
    fy: "frisiska",
    gd: "gaeliska",
    gl: "galiciska",
    ka: "georgiska",
    el: "grekiska",
    gn: "guarani",
    gu: "gujarati",
    ht: "haitiska",
    ha: "hausa",
    haw: "hawaiianska",
    he: "hebreiska",
    hi: "hindi",
    hmn: "hmong",
    ig: "igbo",
    ilo: "ilocano",
    id: "indonesiska",
    ga: "irl\xE4ndska",
    is: "isl\xE4ndska",
    it: "italienska",
    ja: "japanska",
    jv: "javanesiska",
    yi: "jiddisch",
    kn: "kanaresiska",
    ca: "katalanska",
    kk: "kazakiska",
    km: "khmer",
    "zh-CN": "kinesiska (f\xF6renklad)",
    "zh-TW": "kinesiska (traditionell)",
    rw: "kinyarwanda",
    ky: "kirgiziska",
    gom: "konkani",
    ko: "koreanska",
    co: "korsiska",
    kri: "krio",
    hr: "kroatiska",
    ku: "kurdiska (kurmanji)",
    ckb: "kurdiska (sorani)",
    lo: "laotiska",
    la: "latin",
    lv: "lettiska",
    ln: "lingala",
    lt: "litauiska",
    lg: "luganda",
    lb: "luxemburgska",
    mai: "maithili",
    mk: "makedonska",
    mg: "malagassiska",
    ml: "malayalam",
    ms: "malaysiska",
    mt: "maltesiska",
    mi: "maori",
    mr: "marathi",
    "mni-Mtei": "meitei (manipuri)",
    lus: "mizo",
    mn: "mongoliska",
    nl: "nederl\xE4ndska",
    ne: "nepali",
    no: "norska",
    or: "odia (oriya)",
    om: "oromo",
    ps: "pashto",
    fa: "persiska",
    pl: "polska",
    pt: "portugisiska",
    pa: "punjabi",
    qu: "quechua",
    ro: "rum\xE4nska",
    ru: "ryska",
    sm: "samoanska",
    sa: "sanskrit",
    nso: "sepedi",
    sr: "serbiska",
    st: "sesotho",
    sn: "shona",
    sd: "sindhi",
    si: "singalesiska",
    sk: "slovakiska",
    sl: "slovenska",
    so: "somaliska",
    es: "spanska",
    su: "sundanesiska",
    sv: "svenska",
    sw: "swahili",
    tg: "tadzjikiska",
    ta: "tamil",
    tt: "tatariska",
    te: "telugu",
    th: "thail\xE4ndska",
    ti: "tigrinja",
    cs: "tjeckiska",
    ts: "tsonga",
    tr: "turkiska",
    tk: "turkmeniska",
    ak: "twi",
    de: "tyska",
    ug: "uiguriska",
    uk: "ukrainska",
    hu: "ungerska",
    ur: "urdu",
    uz: "uzbekiska",
    vi: "vietnamesiska",
    be: "vitryska",
    cy: "walesiska",
    xh: "xhosa",
    yo: "yoruba",
    zu: "zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  th: {
    gom: "\u0E01\u0E07\u0E01\u0E13\u0E35",
    el: "\u0E01\u0E23\u0E35\u0E01",
    gn: "\u0E01\u0E27\u0E32\u0E23\u0E32\u0E19\u0E35",
    kn: "\u0E01\u0E31\u0E19\u0E19\u0E32\u0E14\u0E32",
    gl: "\u0E01\u0E32\u0E25\u0E34\u0E40\u0E0A\u0E35\u0E22\u0E19",
    gd: "\u0E40\u0E01\u0E25\u0E34\u0E01\u0E2A\u0E01\u0E2D\u0E15",
    ko: "\u0E40\u0E01\u0E32\u0E2B\u0E25\u0E35",
    km: "\u0E40\u0E02\u0E21\u0E23",
    kri: "\u0E04\u0E23\u0E34\u0E42\u0E2D",
    co: "\u0E04\u0E2D\u0E23\u0E4C\u0E2A\u0E34\u0E01\u0E32",
    kk: "\u0E04\u0E32\u0E0B\u0E31\u0E04",
    ca: "\u0E04\u0E32\u0E15\u0E32\u0E25\u0E31\u0E19",
    rw: "\u0E04\u0E34\u0E19\u0E22\u0E32\u0E23\u0E27\u0E31\u0E19\u0E14\u0E32",
    ky: "\u0E04\u0E35\u0E23\u0E4C\u0E01\u0E34\u0E0B",
    gu: "\u0E04\u0E38\u0E0A\u0E23\u0E32\u0E15",
    qu: "\u0E40\u0E04\u0E0A\u0E31\u0E27",
    ku: "\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E14 (\u0E01\u0E38\u0E23\u0E21\u0E31\u0E19\u0E0A\u0E35)",
    ckb: "\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E14 (\u0E42\u0E0B\u0E23\u0E32\u0E19\u0E35)",
    xh: "\u0E42\u0E04\u0E0B\u0E32",
    hr: "\u0E42\u0E04\u0E23\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22",
    ka: "\u0E08\u0E2D\u0E23\u0E4C\u0E40\u0E08\u0E35\u0E22",
    "zh-TW": "\u0E08\u0E35\u0E19 (\u0E15\u0E31\u0E27\u0E40\u0E15\u0E47\u0E21)",
    "zh-CN": "\u0E08\u0E35\u0E19 (\u0E15\u0E31\u0E27\u0E22\u0E48\u0E2D)",
    jv: "\u0E0A\u0E27\u0E32",
    ny: "\u0E0A\u0E34\u0E40\u0E0A\u0E27\u0E32",
    cs: "\u0E40\u0E0A\u0E47\u0E01",
    sn: "\u0E42\u0E0A\u0E19\u0E32",
    ts: "\u0E0B\u0E2D\u0E07\u0E01\u0E32",
    sm: "\u0E0B\u0E32\u0E21\u0E31\u0E27",
    ceb: "\u0E0B\u0E35\u0E1A\u0E31\u0E27\u0E42\u0E19",
    su: "\u0E0B\u0E38\u0E19\u0E14\u0E32",
    zu: "\u0E0B\u0E39\u0E25\u0E39",
    st: "\u0E40\u0E0B\u0E42\u0E0B\u0E42\u0E17",
    sr: "\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E40\u0E1A\u0E35\u0E22\u0E19",
    nso: "\u0E42\u0E0B\u0E42\u0E17\u0E40\u0E2B\u0E19\u0E37\u0E2D",
    so: "\u0E42\u0E0B\u0E21\u0E32\u0E25\u0E35",
    ja: "\u0E0D\u0E35\u0E48\u0E1B\u0E38\u0E48\u0E19",
    nl: "\u0E14\u0E31\u0E15\u0E0A\u0E4C",
    dv: "\u0E14\u0E34\u0E40\u0E27\u0E2E\u0E34",
    da: "\u0E40\u0E14\u0E19\u0E21\u0E32\u0E23\u0E4C\u0E01",
    doi: "\u0E42\u0E14\u0E01\u0E23\u0E35",
    tr: "\u0E15\u0E38\u0E23\u0E01\u0E35",
    te: "\u0E40\u0E15\u0E25\u0E39\u0E01\u0E39",
    tk: "\u0E40\u0E15\u0E34\u0E23\u0E4C\u0E01\u0E40\u0E21\u0E19",
    ta: "\u0E17\u0E21\u0E34\u0E2C",
    ak: "\u0E17\u0E27\u0E34",
    tg: "\u0E17\u0E32\u0E08\u0E34\u0E01",
    tt: "\u0E17\u0E32\u0E17\u0E32\u0E23\u0E4C",
    ti: "\u0E17\u0E35\u0E01\u0E23\u0E34\u0E19\u0E22\u0E32",
    th: "\u0E44\u0E17\u0E22",
    no: "\u0E19\u0E2D\u0E23\u0E4C\u0E40\u0E27\u0E22\u0E4C",
    ne: "\u0E40\u0E19\u0E1B\u0E32\u0E25",
    bs: "\u0E1A\u0E2D\u0E2A\u0E40\u0E19\u0E35\u0E22",
    bm: "\u0E1A\u0E31\u0E21\u0E1A\u0E32\u0E23\u0E32",
    bg: "\u0E1A\u0E31\u0E25\u0E41\u0E01\u0E40\u0E23\u0E35\u0E22",
    eu: "\u0E1A\u0E32\u0E2A\u0E01\u0E4C",
    bn: "\u0E40\u0E1A\u0E07\u0E01\u0E2D\u0E25",
    be: "\u0E40\u0E1A\u0E25\u0E32\u0E23\u0E38\u0E2A",
    pa: "\u0E1B\u0E31\u0E0D\u0E08\u0E32\u0E1B",
    fa: "\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E40\u0E0B\u0E35\u0E22",
    pt: "\u0E42\u0E1B\u0E23\u0E15\u0E38\u0E40\u0E01\u0E2A",
    pl: "\u0E42\u0E1B\u0E41\u0E25\u0E19\u0E14\u0E4C",
    fr: "\u0E1D\u0E23\u0E31\u0E48\u0E07\u0E40\u0E28\u0E2A",
    ps: "\u0E1E\u0E32\u0E0A\u0E15\u0E39",
    fy: "\u0E1F\u0E23\u0E34\u0E40\u0E0A\u0E35\u0E22\u0E19",
    fi: "\u0E1F\u0E34\u0E19\u0E41\u0E25\u0E19\u0E14\u0E4C",
    tl: "\u0E1F\u0E34\u0E25\u0E34\u0E1B\u0E1B\u0E34\u0E19\u0E2A\u0E4C",
    bho: "\u0E42\u0E20\u0E0A\u0E1B\u0E38\u0E23\u0E35",
    hmn: "\u0E21\u0E49\u0E07",
    "mni-Mtei": "\u0E21\u0E13\u0E35\u0E1B\u0E38\u0E23\u0E30 (\u0E21\u0E32\u0E19\u0E34\u0E1E\u0E39\u0E23\u0E35)",
    mn: "\u0E21\u0E2D\u0E07\u0E42\u0E01\u0E40\u0E25\u0E35\u0E22",
    mt: "\u0E21\u0E31\u0E25\u0E17\u0E35\u0E2A",
    mk: "\u0E21\u0E32\u0E0B\u0E35\u0E42\u0E14\u0E40\u0E19\u0E35\u0E22",
    mr: "\u0E21\u0E32\u0E23\u0E32\u0E10\u0E35",
    mg: "\u0E21\u0E32\u0E25\u0E32\u0E01\u0E32\u0E0B\u0E35",
    ml: "\u0E21\u0E32\u0E25\u0E32\u0E22\u0E32\u0E25\u0E31\u0E21",
    ms: "\u0E21\u0E32\u0E40\u0E25\u0E22\u0E4C",
    lus: "\u0E21\u0E34\u0E42\u0E0B",
    mi: "\u0E40\u0E21\u0E32\u0E23\u0E35",
    my: "\u0E40\u0E21\u0E35\u0E22\u0E19\u0E21\u0E32 (\u0E1E\u0E21\u0E48\u0E32)",
    mai: "\u0E44\u0E21\u0E16\u0E34\u0E25\u0E35",
    yi: "\u0E22\u0E34\u0E14\u0E14\u0E34\u0E0A",
    uk: "\u0E22\u0E39\u0E40\u0E04\u0E23\u0E19",
    de: "\u0E40\u0E22\u0E2D\u0E23\u0E21\u0E31\u0E19",
    yo: "\u0E42\u0E22\u0E23\u0E39\u0E1A\u0E32",
    ru: "\u0E23\u0E31\u0E2A\u0E40\u0E0B\u0E35\u0E22",
    ro: "\u0E42\u0E23\u0E21\u0E32\u0E40\u0E19\u0E35\u0E22",
    la: "\u0E25\u0E30\u0E15\u0E34\u0E19",
    lb: "\u0E25\u0E31\u0E01\u0E40\u0E0B\u0E21\u0E40\u0E1A\u0E34\u0E23\u0E4C\u0E01",
    lv: "\u0E25\u0E31\u0E15\u0E40\u0E27\u0E35\u0E22",
    lo: "\u0E25\u0E32\u0E27",
    ln: "\u0E25\u0E34\u0E07\u0E01\u0E32\u0E25\u0E32",
    lt: "\u0E25\u0E34\u0E17\u0E31\u0E27\u0E40\u0E19\u0E35\u0E22",
    lg: "\u0E25\u0E39\u0E01\u0E31\u0E19\u0E14\u0E32",
    cy: "\u0E40\u0E27\u0E25\u0E2A\u0E4C",
    vi: "\u0E40\u0E27\u0E35\u0E22\u0E14\u0E19\u0E32\u0E21",
    es: "\u0E2A\u0E40\u0E1B\u0E19",
    sk: "\u0E2A\u0E42\u0E25\u0E27\u0E31\u0E01",
    sl: "\u0E2A\u0E42\u0E25\u0E27\u0E35\u0E40\u0E19\u0E35\u0E22",
    sw: "\u0E2A\u0E27\u0E32\u0E2E\u0E34\u0E25\u0E35",
    sv: "\u0E2A\u0E27\u0E35\u0E40\u0E14\u0E19",
    sa: "\u0E2A\u0E31\u0E19\u0E2A\u0E01\u0E24\u0E15",
    si: "\u0E2A\u0E34\u0E07\u0E2B\u0E25",
    sd: "\u0E2A\u0E34\u0E19\u0E18\u0E35",
    en: "\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29",
    am: "\u0E2D\u0E31\u0E21\u0E2E\u0E32\u0E23\u0E34\u0E01",
    as: "\u0E2D\u0E31\u0E2A\u0E2A\u0E31\u0E21",
    az: "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E44\u0E1A\u0E08\u0E31\u0E19",
    hy: "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E21\u0E40\u0E19\u0E35\u0E22",
    ar: "\u0E2D\u0E32\u0E2B\u0E23\u0E31\u0E1A",
    ig: "\u0E2D\u0E34\u0E01\u0E42\u0E1A",
    it: "\u0E2D\u0E34\u0E15\u0E32\u0E25\u0E35",
    id: "\u0E2D\u0E34\u0E19\u0E42\u0E14\u0E19\u0E35\u0E40\u0E0B\u0E35\u0E22",
    ilo: "\u0E2D\u0E35\u0E42\u0E25\u0E01\u0E32\u0E42\u0E19",
    ee: "\u0E2D\u0E35\u0E40\u0E27",
    ug: "\u0E2D\u0E38\u0E22\u0E01\u0E39\u0E23\u0E4C",
    uz: "\u0E2D\u0E38\u0E2A\u0E40\u0E1A\u0E01\u0E34\u0E2A\u0E16\u0E32\u0E19",
    ur: "\u0E2D\u0E39\u0E23\u0E14\u0E39",
    et: "\u0E40\u0E2D\u0E2A\u0E42\u0E17\u0E40\u0E19\u0E35\u0E22",
    eo: "\u0E40\u0E2D\u0E2A\u0E40\u0E1B\u0E2D\u0E41\u0E23\u0E19\u0E42\u0E15",
    af: "\u0E41\u0E2D\u0E1F\u0E23\u0E34\u0E01\u0E32",
    sq: "\u0E41\u0E2D\u0E25\u0E40\u0E1A\u0E40\u0E19\u0E35\u0E22",
    or: "\u0E42\u0E2D\u0E40\u0E14\u0E35\u0E22 (\u0E42\u0E2D\u0E23\u0E34\u0E22\u0E32)",
    om: "\u0E42\u0E2D\u0E42\u0E23\u0E42\u0E21",
    is: "\u0E44\u0E2D\u0E0B\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C",
    ay: "\u0E44\u0E2D\u0E21\u0E32\u0E23\u0E32",
    ga: "\u0E44\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C",
    hu: "\u0E2E\u0E31\u0E07\u0E01\u0E32\u0E23\u0E35",
    ha: "\u0E2E\u0E31\u0E27\u0E0B\u0E32",
    haw: "\u0E2E\u0E32\u0E27\u0E32\u0E22",
    hi: "\u0E2E\u0E34\u0E19\u0E14\u0E35",
    he: "\u0E2E\u0E35\u0E1A\u0E23\u0E39",
    ht: "\u0E40\u0E2E\u0E15\u0E34\u0E04\u0E23\u0E35\u0E42\u0E2D\u0E25",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  tr: {
    af: "Afrikaanca",
    de: "Almanca",
    ar: "Arap\xE7a",
    sq: "Arnavut\xE7a",
    as: "Assamca",
    ay: "Aymaraca",
    az: "Azerbaycan dili",
    bm: "Bambara",
    eu: "Bask\xE7a",
    be: "Belarus\xE7a",
    bn: "Bengalce",
    bho: "Bhojpuri",
    bs: "Bo\u015Fnak\xE7a",
    bg: "Bulgarca",
    my: "Burmaca",
    jv: "Cava dili",
    ceb: "Cebuano",
    ny: "Chicheva",
    cs: "\xC7ek\xE7e",
    "zh-CN": "\xC7ince (Basitle\u015Ftirilmi\u015F)",
    "zh-TW": "\xC7ince (Geleneksel)",
    da: "Danca",
    dv: "Dhivehi",
    doi: "Dogri",
    id: "Endonezce",
    hy: "Ermenice",
    eo: "Esperanto",
    et: "Estonyaca",
    ee: "Ewe",
    fa: "Fars\xE7a",
    nl: "Felemenk\xE7e",
    tl: "Filipince",
    fi: "Fince",
    fr: "Frans\u0131zca",
    fy: "Frizce",
    cy: "Galce",
    gl: "Gali\xE7yaca",
    gn: "Guarani",
    gu: "G\xFCcerat\xE7a",
    ka: "G\xFCrc\xFCce",
    am: "Habe\u015F\xE7e",
    ht: "Haiti Kreyolu",
    ha: "Hausa dili",
    haw: "Hawai dili",
    hr: "H\u0131rvat\xE7a",
    hi: "Hint\xE7e",
    hmn: "Hmong",
    xh: "Hosa",
    ig: "\u0130bo dili",
    he: "\u0130branice",
    ilo: "\u0130lokano",
    en: "\u0130ngilizce",
    ga: "\u0130rlandaca",
    gd: "\u0130sko\xE7 Gaelcesi",
    es: "\u0130spanyolca",
    sv: "\u0130sve\xE7\xE7e",
    it: "\u0130talyanca",
    is: "\u0130zlandaca",
    ja: "Japonca",
    km: "Kambo\xE7yaca",
    kn: "Kannada",
    ca: "Katalanca",
    kk: "Kazak\xE7a",
    qu: "Ke\xE7uva",
    ky: "K\u0131rg\u0131zca",
    gom: "Konkani",
    ko: "Korece",
    co: "Korsikaca",
    kri: "Krio",
    ku: "K\xFCrt\xE7e (Kurman\xE7\xE7a)",
    ckb: "K\xFCrt\xE7e (Sorani)",
    lo: "Laoca",
    la: "Latince",
    pl: "Leh\xE7e",
    lv: "Letonca",
    ln: "Lingala",
    lt: "Litvanca",
    lg: "Luganda",
    lb: "L\xFCksemburgca",
    hu: "Macarca",
    mai: "Maithili",
    mk: "Makedonca",
    ml: "Malayalam",
    ms: "Malayca",
    mg: "Malga\u015F\xE7a",
    mt: "Maltaca",
    mi: "Maori dili",
    mr: "Marathi",
    "mni-Mtei": "Meiteilon (Manipuri)",
    lus: "Mizo",
    mn: "Mo\u011Folca",
    ne: "Nepalce",
    no: "Norve\xE7\xE7e",
    or: "Odiya (Oriya)",
    om: "Oromo",
    uz: "\xD6zbek\xE7e",
    pa: "Pencap\xE7a",
    ps: "Pe\u015Ftuca",
    pt: "Portekizce",
    ro: "Romence",
    rw: "Ruandaca",
    ru: "Rus\xE7a",
    sm: "Samoaca",
    sa: "Sanskrit\xE7e",
    nso: "Sepedi",
    st: "Sesotho dili",
    si: "Seylanca",
    sn: "Shona",
    sr: "S\u0131rp\xE7a",
    sd: "Sint",
    sk: "Slovak\xE7a",
    sl: "Slovence",
    so: "Somalice",
    su: "Sundanizce",
    sw: "Svahili dili",
    tg: "Tacikce",
    ta: "Tamil",
    tt: "Tatarca",
    th: "Tayca",
    te: "Telugu dili",
    ti: "Tigrinya dili",
    ts: "Tsongaca",
    tr: "T\xFCrk\xE7e",
    tk: "T\xFCrkmence",
    ak: "Twi dili",
    uk: "Ukraynaca",
    ur: "Urduca",
    ug: "Uygurca",
    vi: "Vietnamca",
    yi: "Yidce",
    yo: "Yoruba",
    el: "Yunanca",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  uk: {
    az: "\u0430\u0437\u0435\u0440\u0431\u0430\u0439\u0434\u0436\u0430\u043D\u0441\u044C\u043A\u0430",
    ay: "\u0430\u0439\u043C\u0430\u0440\u0441\u044C\u043A\u0430",
    sq: "\u0430\u043B\u0431\u0430\u043D\u0441\u044C\u043A\u0430",
    am: "\u0430\u043C\u0445\u0430\u0440\u0441\u044C\u043A\u0430",
    en: "\u0430\u043D\u0433\u043B\u0456\u0439\u0441\u044C\u043A\u0430",
    ar: "\u0430\u0440\u0430\u0431\u0441\u044C\u043A\u0430",
    as: "\u0430\u0441\u0441\u0430\u043C\u0441\u044C\u043A\u0430",
    af: "\u0430\u0444\u0440\u0438\u043A\u0430\u0430\u043D\u0441",
    bm: "\u0431\u0430\u043C\u0431\u0430\u0440\u0430",
    eu: "\u0431\u0430\u0441\u043A\u0441\u044C\u043A\u0430",
    bn: "\u0431\u0435\u043D\u0433\u0430\u043B\u044C\u0441\u044C\u043A\u0430",
    be: "\u0431\u0456\u043B\u043E\u0440\u0443\u0441\u044C\u043A\u0430",
    my: "\u0431\u0456\u0440\u043C\u0430\u043D\u0441\u044C\u043A\u0430",
    bg: "\u0431\u043E\u043B\u0433\u0430\u0440\u0441\u044C\u043A\u0430",
    bs: "\u0431\u043E\u0441\u043D\u0456\u0439\u0441\u044C\u043A\u0430",
    bho: "\u0431\u0445\u043E\u0434\u0436\u043F\u0443\u0440\u0456",
    vi: "\u0432\u2019\u0454\u0442\u043D\u0430\u043C\u0441\u044C\u043A\u0430",
    cy: "\u0432\u0430\u043B\u043B\u0456\u0439\u0441\u044C\u043A\u0430",
    hy: "\u0432\u0456\u0440\u043C\u0435\u043D\u0441\u044C\u043A\u0430",
    haw: "\u0433\u0430\u0432\u0430\u0439\u0441\u044C\u043A\u0430",
    ht: "\u0433\u0430\u0457\u0442\u044F\u043D\u0441\u044C\u043A\u0430 \u043A\u0440\u0435\u043E\u043B\u044C\u0441\u044C\u043A\u0430",
    hi: "\u0433\u0456\u043D\u0434\u0456",
    el: "\u0433\u0440\u0435\u0446\u044C\u043A\u0430",
    ka: "\u0433\u0440\u0443\u0437\u0438\u043D\u0441\u044C\u043A\u0430",
    gn: "\u0433\u0443\u0430\u0440\u0430\u043D\u0456",
    gl: "\u0491\u0430\u043B\u0456\u0441\u0456\u0439\u0441\u044C\u043A\u0430",
    gu: "\u0491\u0443\u0434\u0436\u0430\u0440\u0430\u0442\u0441\u044C\u043A\u0430",
    da: "\u0434\u0430\u043D\u0441\u044C\u043A\u0430",
    dv: "\u0434\u0456\u0432\u0435\u0445\u0456",
    doi: "\u0434\u043E\u0433\u0440\u0456",
    ee: "\u0435\u0432\u0435",
    eo: "\u0435\u0441\u043F\u0435\u0440\u0430\u043D\u0442\u043E",
    et: "\u0435\u0441\u0442\u043E\u043D\u0441\u044C\u043A\u0430",
    zu: "\u0437\u0443\u043B\u0443",
    he: "\u0456\u0432\u0440\u0438\u0442",
    ig: "\u0456\u0433\u0431\u043E (\u0456\u0431\u043E)",
    yi: "\u0456\u0434\u0438\u0448",
    ilo: "\u0456\u043B\u043E\u043A\u0430\u043D\u0441\u044C\u043A\u0430",
    id: "\u0456\u043D\u0434\u043E\u043D\u0435\u0437\u0456\u0439\u0441\u044C\u043A\u0430",
    ga: "\u0456\u0440\u043B\u0430\u043D\u0434\u0441\u044C\u043A\u0430",
    is: "\u0456\u0441\u043B\u0430\u043D\u0434\u0441\u044C\u043A\u0430",
    es: "\u0456\u0441\u043F\u0430\u043D\u0441\u044C\u043A\u0430",
    it: "\u0456\u0442\u0430\u043B\u0456\u0439\u0441\u044C\u043A\u0430",
    yo: "\u0439\u043E\u0440\u0443\u0431\u0430",
    kk: "\u043A\u0430\u0437\u0430\u0445\u0441\u044C\u043A\u0430",
    km: "\u043A\u0430\u043C\u0431\u043E\u0434\u0436\u0456\u0439\u0441\u044C\u043A\u0430",
    kn: "\u043A\u0430\u043D\u043D\u0430\u0434\u0430",
    ca: "\u043A\u0430\u0442\u0430\u043B\u0430\u043D\u0441\u044C\u043A\u0430",
    qu: "\u043A\u0435\u0447\u0443\u0430",
    ky: "\u043A\u0438\u0440\u0433\u0438\u0437\u044C\u043A\u0430",
    "zh-CN": "\u043A\u0438\u0442\u0430\u0439\u0441\u044C\u043A\u0430 (\u0441\u043F\u0440\u043E\u0449\u0435\u043D\u0430)",
    "zh-TW": "\u043A\u0438\u0442\u0430\u0439\u0441\u044C\u043A\u0430 (\u0442\u0440\u0430\u0434\u0438\u0446\u0456\u0439\u043D\u0430)",
    gom: "\u043A\u043E\u043D\u043A\u0430\u043D\u0456",
    ko: "\u043A\u043E\u0440\u0435\u0439\u0441\u044C\u043A\u0430",
    co: "\u043A\u043E\u0440\u0441\u0438\u043A\u0430\u043D\u0441\u044C\u043A\u0430",
    kri: "\u043A\u0440\u0456\u043E",
    ku: "\u043A\u0443\u0440\u0434\u0441\u044C\u043A\u0430 (\u043A\u0443\u0440\u043C\u0430\u043D\u0434\u0436\u0456)",
    ckb: "\u043A\u0443\u0440\u0434\u0441\u044C\u043A\u0430 (\u0441\u043E\u0440\u0430\u043D\u0456)",
    xh: "\u043A\u0445\u043E\u0441\u0430",
    lo: "\u043B\u0430\u043E\u0441\u044C\u043A\u0430",
    la: "\u043B\u0430\u0442\u0438\u043D\u0441\u044C\u043A\u0430",
    lv: "\u043B\u0430\u0442\u0438\u0441\u044C\u043A\u0430",
    lt: "\u043B\u0438\u0442\u043E\u0432\u0441\u044C\u043A\u0430",
    ln: "\u043B\u0456\u043D\u0433\u0430\u043B\u0430",
    lg: "\u043B\u0443\u0433\u0430\u043D\u0434\u0430",
    lb: "\u043B\u044E\u043A\u0441\u0435\u043C\u0431\u0443\u0440\u0437\u044C\u043A\u0430",
    mai: "\u043C\u0430\u0439\u0442\u0445\u0456\u043B\u0456",
    mk: "\u043C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u044C\u043A\u0430",
    mg: "\u043C\u0430\u043B\u0430\u0433\u0430\u0441\u0456\u0439\u0441\u044C\u043A\u0430",
    ms: "\u043C\u0430\u043B\u0430\u0439\u0441\u044C\u043A\u0430",
    ml: "\u043C\u0430\u043B\u0430\u044F\u043B\u0430\u043C",
    mt: "\u043C\u0430\u043B\u044C\u0442\u0456\u0439\u0441\u044C\u043A\u0430",
    mi: "\u043C\u0430\u043E\u0440\u0456",
    mr: "\u043C\u0430\u0440\u0430\u0442\u0445\u0456",
    "mni-Mtei": "\u043C\u0435\u0439\u0442\u0435\u0439\u043B\u043E\u043D (\u043C\u0430\u043D\u0456\u043F\u0443\u0440\u0456)",
    lus: "\u043C\u0456\u0437\u043E",
    mn: "\u043C\u043E\u043D\u0433\u043E\u043B\u044C\u0441\u044C\u043A\u0430",
    ne: "\u043D\u0435\u043F\u0430\u043B\u044C\u0441\u044C\u043A\u0430",
    nl: "\u043D\u0456\u0434\u0435\u0440\u043B\u0430\u043D\u0434\u0441\u044C\u043A\u0430",
    de: "\u043D\u0456\u043C\u0435\u0446\u044C\u043A\u0430",
    no: "\u043D\u043E\u0440\u0432\u0435\u0437\u044C\u043A\u0430",
    or: "\u043E\u0434\u0456\u044F (\u043E\u0440\u0456\u044F)",
    om: "\u043E\u0440\u043E\u043C\u043E",
    pa: "\u043F\u0430\u043D\u0434\u0436\u0430\u0431\u0441\u044C\u043A\u0430",
    fa: "\u043F\u0435\u0440\u0441\u044C\u043A\u0430",
    pl: "\u043F\u043E\u043B\u044C\u0441\u044C\u043A\u0430",
    pt: "\u043F\u043E\u0440\u0442\u0443\u0433\u0430\u043B\u044C\u0441\u044C\u043A\u0430",
    ps: "\u043F\u0443\u0448\u0442\u0443",
    ru: "\u0440\u043E\u0441\u0456\u0439\u0441\u044C\u043A\u0430",
    rw: "\u0440\u0443\u0430\u043D\u0434\u0456\u0439\u0441\u044C\u043A\u0430",
    ro: "\u0440\u0443\u043C\u0443\u043D\u0441\u044C\u043A\u0430",
    sm: "\u0441\u0430\u043C\u043E\u0430\u043D\u0441\u044C\u043A\u0430",
    sa: "\u0441\u0430\u043D\u0441\u043A\u0440\u0438\u0442",
    ceb: "\u0441\u0435\u0431\u0443\u0430\u043D\u043E",
    nso: "\u0441\u0435\u043F\u0435\u0434\u0456",
    sr: "\u0441\u0435\u0440\u0431\u0441\u044C\u043A\u0430",
    st: "\u0441\u0435\u0441\u043E\u0442\u043E",
    si: "\u0441\u0438\u043D\u0433\u0430\u043B\u044C\u0441\u044C\u043A\u0430",
    sd: "\u0441\u0456\u043D\u0434\u0445\u0456",
    sk: "\u0441\u043B\u043E\u0432\u0430\u0446\u044C\u043A\u0430",
    sl: "\u0441\u043B\u043E\u0432\u0435\u043D\u0441\u044C\u043A\u0430",
    so: "\u0441\u043E\u043C\u0430\u043B\u0456",
    sw: "\u0441\u0443\u0430\u0445\u0456\u043B\u0456",
    su: "\u0441\u0443\u043D\u0434\u0430\u043D\u0441\u044C\u043A\u0430",
    tg: "\u0442\u0430\u0434\u0436\u0438\u0446\u044C\u043A\u0430",
    th: "\u0442\u0430\u0439\u0441\u044C\u043A\u0430",
    ta: "\u0442\u0430\u043C\u0456\u043B\u044C\u0441\u044C\u043A\u0430",
    tt: "\u0442\u0430\u0442\u0430\u0440\u0441\u044C\u043A\u0430",
    te: "\u0442\u0435\u043B\u0443\u0491\u0443",
    ti: "\u0442\u0438\u0433\u0440\u0438\u043Dc\u044C\u043A\u0430",
    ts: "\u0442\u0441\u043E\u043D\u0433\u0430",
    tr: "\u0442\u0443\u0440\u0435\u0446\u044C\u043A\u0430",
    tk: "\u0442\u0443\u0440\u043A\u043C\u0435\u043D\u0441\u044C\u043A\u0430",
    hu: "\u0443\u0433\u043E\u0440\u0441\u044C\u043A\u0430",
    uz: "\u0443\u0437\u0431\u0435\u0446\u044C\u043A\u0430",
    ug: "\u0443\u0439\u0433\u0443\u0440\u0441\u044C\u043A\u0430",
    uk: "\u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430",
    ur: "\u0443\u0440\u0434\u0443",
    tl: "\u0444\u0456\u043B\u0456\u043F\u043F\u0456\u043D\u0441\u044C\u043A\u0430",
    fi: "\u0444\u0456\u043D\u0441\u044C\u043A\u0430",
    fr: "\u0444\u0440\u0430\u043D\u0446\u0443\u0437\u044C\u043A\u0430",
    fy: "\u0444\u0440\u0438\u0437\u044C\u043A\u0430",
    ha: "\u0445\u0430\u0443\u0441\u0430",
    hmn: "\u0445\u043C\u043E\u043D\u0433",
    hr: "\u0445\u043E\u0440\u0432\u0430\u0442\u0441\u044C\u043A\u0430",
    ak: "\u0447\u0432\u0456",
    cs: "\u0447\u0435\u0441\u044C\u043A\u0430",
    ny: "\u0447\u0438\u0447\u0435\u0432\u0430",
    sv: "\u0448\u0432\u0435\u0434\u0441\u044C\u043A\u0430",
    sn: "\u0448\u043E\u043D\u0430",
    gd: "\u0448\u043E\u0442\u043B\u0430\u043D\u0434\u0441\u044C\u043A\u0430 (\u0491\u0435\u043B\u044C\u0441\u044C\u043A\u0430)",
    jv: "\u044F\u0432\u0430\u043D\u0441\u044C\u043A\u0430",
    ja: "\u044F\u043F\u043E\u043D\u0441\u044C\u043A\u0430",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  vi: {
    ar: "\u1EA2 R\u1EADp",
    sq: "Albania",
    am: "Amharic",
    en: "Anh",
    hy: "Armenia",
    as: "Assam",
    ay: "Aymara",
    az: "Azerbaijan",
    pl: "Ba Lan",
    fa: "Ba T\u01B0",
    bm: "Bambara",
    xh: "Bantu",
    eu: "Basque",
    be: "Belarus",
    bn: "Bengal",
    bho: "Bhojpuri",
    bs: "Bosnia",
    pt: "B\u1ED3 \u0110\xE0o Nha",
    bg: "Bulgaria",
    ca: "Catalan",
    ceb: "Cebuano",
    ny: "Chichewa",
    co: "Corsi",
    ht: "Creole (Haiti)",
    hr: "Croatia",
    dv: "Dhivehi",
    he: "Do Th\xE1i",
    doi: "Dogri",
    da: "\u0110an M\u1EA1ch",
    de: "\u0110\u1EE9c",
    et: "Estonia",
    ee: "Ewe",
    tl: "Filipino",
    fy: "Frisia",
    gd: "Gael Scotland",
    gl: "Galicia",
    ka: "George",
    gn: "Guarani",
    gu: "Gujarat",
    nl: "H\xE0 Lan",
    af: "H\xE0 Lan (Nam Phi)",
    ko: "H\xE0n",
    ha: "Hausa",
    haw: "Hawaii",
    hi: "Hindi",
    hmn: "Hmong",
    hu: "Hungary",
    el: "Hy L\u1EA1p",
    is: "Iceland",
    ig: "Igbo",
    ilo: "Ilocano",
    id: "Indonesia",
    ga: "Ireland",
    jv: "Java",
    kn: "Kannada",
    kk: "Kazakh",
    km: "Khmer",
    rw: "Kinyarwanda",
    gom: "Konkani",
    kri: "Krio",
    ku: "Kurd (Kurmanji)",
    ckb: "Kurd (Sorani)",
    ky: "Kyrgyz",
    lo: "L\xE0o",
    la: "Latinh",
    lv: "Latvia",
    ln: "Lingala",
    lt: "Litva",
    lg: "Luganda",
    lb: "Luxembourg",
    ms: "M\xE3 Lai",
    mk: "Macedonia",
    mai: "Maithili",
    mg: "Malagasy",
    ml: "Malayalam",
    mt: "Malta",
    mi: "Maori",
    mr: "Marathi",
    "mni-Mtei": "Meiteilon (Manipuri)",
    lus: "Mizo",
    mn: "M\xF4ng C\u1ED5",
    my: "Myanmar",
    no: "Na Uy",
    ne: "Nepal",
    ru: "Nga",
    ja: "Nh\u1EADt",
    or: "Odia (Oriya)",
    om: "Oromo",
    ps: "Pashto",
    sa: "Ph\u1EA1n",
    fr: "Ph\xE1p",
    fi: "Ph\u1EA7n Lan",
    pa: "Punjab",
    qu: "Quechua",
    eo: "Qu\u1ED1c t\u1EBF ng\u1EEF",
    ro: "Rumani",
    sm: "Samoa",
    cs: "S\xE9c",
    nso: "Sepedi",
    sr: "Serbia",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Sinhala",
    sk: "Slovak",
    sl: "Slovenia",
    so: "Somali",
    su: "Sunda",
    sw: "Swahili",
    tg: "Tajik",
    ta: "Tamil",
    tt: "Tatar",
    es: "T\xE2y Ban Nha",
    te: "Telugu",
    th: "Th\xE1i",
    tr: "Th\u1ED5 Nh\u0129 K\u1EF3",
    sv: "Th\u1EE5y \u0110i\u1EC3n",
    ti: "Tigrinya",
    "zh-CN": "Trung (Gi\u1EA3n th\u1EC3)",
    "zh-TW": "Trung (Ph\u1ED3n th\u1EC3)",
    ts: "Tsonga",
    tk: "Turkmen",
    ak: "Twi",
    uk: "Ukraina",
    ur: "Urdu",
    ug: "Uyghur",
    uz: "Uzbek",
    vi: "Vi\u1EC7t",
    cy: "X\u1EE9 Wales",
    it: "\xDD",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zulu",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  },
  is: {
    af: "afr\xEDkanska",
    ay: "a\xEDmar\xEDska",
    sq: "albanska",
    am: "amhar\xEDska",
    ar: "arab\xEDska",
    hy: "armenska",
    az: "aserska",
    as: "assamska",
    bm: "bambara",
    eu: "baskneska",
    bn: "bengalska",
    bho: "bhojpuri",
    bs: "bosn\xEDska",
    bg: "b\xFAlgarska",
    my: "b\xFArm\xEDska",
    ny: "chichewa",
    da: "danska",
    dv: "dhivehi",
    doi: "dogri",
    et: "eistneska",
    en: "enska",
    eo: "esperant\xF3",
    ee: "ewe",
    tl: "filippseyska",
    fi: "finnska",
    fr: "franska",
    fy: "fr\xEDsneska",
    gl: "galis\xEDska",
    ka: "georg\xEDska",
    el: "gr\xEDska",
    gu: "gujarati",
    gn: "gvaran\xED",
    ht: "ha\xEDt\xEDskt kre\xF3lam\xE1l",
    haw: "hava\xEDska",
    ha: "h\xE1sa",
    he: "hebreska",
    hi: "hind\xED",
    hmn: "hmong",
    nl: "hollenska",
    be: "hv\xEDtr\xFAssneska",
    ig: "igb\xF3",
    ilo: "ilokano",
    id: "ind\xF3nes\xEDska",
    ga: "\xEDrska",
    is: "\xEDslenska",
    it: "\xEDtalska",
    ja: "japanska",
    jv: "jav\xEDska",
    yi: "jidd\xEDska",
    yo: "jor\xFAba",
    kn: "kannada",
    kk: "kasakstanska",
    ca: "katal\xF3nska",
    km: "khmer",
    rw: "kinjarvanda",
    ky: "kirgis\xEDska",
    "zh-CN": "k\xEDnverska (einf\xF6ldu\xF0)",
    "zh-TW": "k\xEDnverska (hef\xF0bundin)",
    gom: "konkani",
    co: "kors\xEDska",
    ko: "k\xF3reska",
    kri: "krio",
    hr: "kr\xF3at\xEDska",
    ku: "k\xFArd\xEDska (kurmanji)",
    ckb: "k\xFArd\xEDska (soran\xED)",
    lo: "lao",
    la: "lat\xEDna",
    lv: "lettneska",
    ln: "lingala",
    lt: "lith\xE1\xEDska",
    lg: "l\xFAganda",
    lb: "l\xFAxemborgska",
    mai: "maithili",
    mk: "maked\xF3nska",
    mg: "malagas\xEDska",
    ms: "malaj\xEDska",
    ml: "malayalam",
    mt: "maltneska",
    mi: "maor\xEDska",
    mr: "marat\xED",
    "mni-Mtei": "meiteilon (manipuri)",
    lus: "mizo",
    mn: "mong\xF3lska",
    ne: "nepalska",
    no: "norska",
    or: "od\xEDa (oriya)",
    om: "oromo",
    ps: "pashto",
    fa: "persneska",
    pt: "port\xFAgalska",
    pl: "p\xF3lska",
    pa: "punjabi",
    qu: "quechua",
    ro: "r\xFAmenska",
    ru: "r\xFAssneska",
    sm: "sam\xF3ska",
    sa: "sanskr\xEDt",
    ceb: "seb\xFAan\xF3",
    nso: "sepedi",
    sr: "serbneska",
    st: "ses\xF3t\xF3",
    sn: "shona",
    sd: "sindh\xED",
    si: "sinhala",
    gd: "skosk-gel\xEDska",
    sk: "sl\xF3vak\xEDska",
    sl: "sl\xF3venska",
    so: "s\xF3malska",
    es: "sp\xE6nska",
    zu: "s\xFAl\xFA",
    su: "s\xFAnd\xEDska",
    sw: "svah\xEDl\xED",
    sv: "s\xE6nska",
    tg: "tadsjik\xEDska",
    th: "ta\xEDlenska",
    ta: "tam\xEDlska",
    tt: "tatarska",
    te: "telugu",
    cs: "t\xE9kkneska",
    ti: "tigrin\xEDska",
    ts: "tsonga",
    tk: "t\xFArkmenska",
    ak: "twi",
    tr: "tyrkneska",
    hu: "ungverska",
    ug: "uyghur",
    uk: "\xFAkra\xEDnska",
    ur: "\xFArd\xFA",
    uz: "\xFAsbek\xEDska",
    cy: "velska",
    vi: "v\xEDetnamska",
    xh: "xhosa",
    de: "\xFE\xFDska",
    ba: "Bashkir",
    cv: "Chuvash",
    mrj: "Hill Mari",
    kazlat: "Kazakh (Latin)",
    mhr: "Mari",
    pap: "Papiamento",
    udm: "Udmurt",
    uzbcyr: "Uzbek (Cyrillic)",
    sah: "Yakut"
  }
};
function codeToLanguageNameInEnglish(langCode) {
  const languageList = allLanguagesNames["en"];
  const languageName = languageList[langCode];
  return languageName;
}
var otherConfigs = {
  // English
  "en": {
    name: "English",
    nameEn: "English",
    phoneticNotation: "IPA"
  },
  "en-US": {
    name: "American English",
    nameEn: "English (US)",
    phoneticNotation: "IPA",
    isSource: false
  },
  "en-GB": {
    name: "British English",
    nameEn: "English (UK)",
    phoneticNotation: "IPA",
    isSource: false
  },
  "en-CA": {
    name: "Canadian English",
    nameEn: "English (Canada)",
    phoneticNotation: "IPA",
    isSource: false
  },
  "en-AU": {
    name: "Australian English",
    nameEn: "English (Australia)",
    phoneticNotation: "IPA",
    isSource: false
  },
  // CJK
  // Chinese
  "zh-Hans": {
    nameEn: "Simplified Chinese",
    name: "\u7B80\u4F53\u4E2D\u6587",
    isVariant: true,
    phoneticNotation: "Pinyin"
  },
  "zh-Hant": {
    nameEn: "Traditional Chinese",
    name: "\u7E41\u9AD4\u4E2D\u6587",
    isVariant: true,
    phoneticNotation: "Bopomofo"
    // aka 注音
  },
  "yue": {
    nameEn: "Cantonese",
    name: "\u7CA4\u8BED",
    phoneticNotation: "Jyutping",
    isSource: false
  },
  "lzh": {
    nameEn: "Classical Chinese",
    name: "\u6587\u8A00",
    phoneticNotation: "Pinyin"
  },
  "jdbhw": {
    nameEn: "Modern Standard Chinese",
    name: "\u8FD1\u4EE3\u767D\u8BDD\u6587",
    phoneticNotation: "Gwoyeu Romatzyh",
    rolePrompt: "\u60A8\u662F\u4E00\u4F4D\u5728\u4E2D\u6587\u7CFB\u7814\u7A76\u4E2D\u6587\u7684\u8D44\u6DF1\u5B66\u8005",
    isSource: false
  },
  "xdbhw": {
    nameEn: "Contemporary Chinese",
    name: "\u73B0\u4EE3\u767D\u8BDD\u6587",
    phoneticNotation: "Hanyu Pinyin",
    rolePrompt: "\u60A8\u662F\u4E00\u4F4D\u5728\u4E2D\u6587\u7CFB\u7814\u7A76\u4E2D\u6587\u7684\u8D44\u6DF1\u5B66\u8005",
    isSource: false
  },
  // Japanese
  "ja": {
    name: "\u65E5\u672C\u8A9E",
    nameEn: "Japanese",
    phoneticNotation: "hiragana"
  },
  // Korean
  "ko": {
    nameEn: "Korean",
    name: "\uD55C\uAD6D\uC5B4",
    // Korean formal speech (GPT uses formal speech by default if not specified)
    phoneticNotation: "Revised Romanization"
  },
  "ko-banmal": {
    nameEn: "Korean",
    name: "\uD55C\uAD6D\uC5B4 \uBC18\uB9D0",
    // Korean casual / informal speech, especially Haera-che,
    // used when talking to close friends or relatives of similar age, and by adults to children,
    // in impersonal writing (books, newspapers, magazines and 報告書),
    // grammar books or indirect quotations.
    // see https://en.wikipedia.org/wiki/Korean_speech_levels
    phoneticNotation: "Revised Romanization",
    isVariant: true,
    isSource: false,
    genCommandPrompt: (sourceLanguageConfig, quoteStart, quoteEnd) => `Translate from ${sourceLanguageConfig.nameEn} to Korean banmal. Please use \uB2E4 endings. Never use formal or honorific endings. Return translated text only. Only translate the text between ${quoteStart} and ${quoteEnd}. You can only translate and cannot interpret the content.`
  },
  "fr": {
    nameEn: "French",
    name: "Fran\xE7ais",
    phoneticNotation: "IPA"
  },
  "de": {
    nameEn: "German",
    name: "Deutsch",
    phoneticNotation: "IPA"
  },
  "es": {
    nameEn: "Spanish",
    name: "Espa\xF1ol",
    phoneticNotation: "IPA"
  },
  "it": {
    nameEn: "Italian",
    name: "Italiano",
    phoneticNotation: "IPA"
  },
  "ru": {
    nameEn: "Russian",
    name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    phoneticNotation: "Latin transcription"
  },
  "pt": {
    nameEn: "Portuguese",
    name: "Portugu\xEAs"
  },
  "nl": {
    nameEn: "Dutch",
    name: "Nederlands"
  },
  "pl": {
    nameEn: "Polish",
    name: "Polski"
  },
  "ar": {
    nameEn: "Arabic",
    name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    phoneticNotation: "Arabic script",
    direction: "rtl"
  },
  "af": {
    nameEn: "Afrikaans",
    name: "Afrikaans",
    phoneticNotation: "IPA"
  },
  "am": {
    nameEn: "Amharic",
    name: "\u12A0\u121B\u122D\u129B"
  },
  "az": {
    nameEn: "Azerbaijani",
    name: "Az\u0259rbaycan"
  },
  "be": {
    nameEn: "Belarusian",
    name: "\u0411\u0435\u043B\u0430\u0440\u0443\u0441\u043A\u0430\u044F"
  },
  "bg": {
    nameEn: "Bulgarian",
    name: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438"
  },
  "bn": {
    nameEn: "Bengali",
    name: "\u09AC\u09BE\u0982\u09B2\u09BE"
  },
  "bs": {
    nameEn: "Bosnian",
    name: "Bosanski"
  },
  "ca": {
    nameEn: "Catalan",
    name: "Catal\xE0"
  },
  "ceb": {
    nameEn: "Cebuano",
    name: "Cebuano"
  },
  "co": {
    nameEn: "Corsican",
    name: "Corsu"
  },
  "cs": {
    nameEn: "Czech",
    name: "\u010Ce\u0161tina"
  },
  "cy": {
    nameEn: "Welsh",
    name: "Cymraeg"
  },
  "da": {
    nameEn: "Danish",
    name: "Dansk"
  },
  "el": {
    nameEn: "Greek",
    name: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC"
  },
  "eo": {
    nameEn: "Esperanto",
    name: "Esperanto"
  },
  "et": {
    nameEn: "Estonian",
    name: "Eesti"
  },
  "eu": {
    nameEn: "Basque",
    name: "Euskara"
  },
  "fa": {
    nameEn: "Persian",
    name: "\u0641\u0627\u0631\u0633\u06CC",
    phoneticNotation: "latin transcription",
    direction: "rtl"
  },
  "fi": {
    nameEn: "Finnish",
    name: "Suomi"
  },
  "fj": {
    nameEn: "Fijian",
    name: "Fijian"
  },
  "fy": {
    nameEn: "Frisian",
    name: "Frysk"
  },
  "ga": {
    nameEn: "Irish",
    name: "Gaeilge"
  },
  "gd": {
    nameEn: "Scottish Gaelic",
    name: "G\xE0idhlig"
  },
  "gl": {
    nameEn: "Galician",
    name: "Galego"
  },
  "gu": {
    nameEn: "Gujarati",
    name: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0"
  },
  "ha": {
    nameEn: "Hausa",
    name: "Hausa"
  },
  "haw": {
    nameEn: "Hawaiian",
    name: "Hawai\u02BBi"
  },
  "he": {
    nameEn: "Hebrew",
    name: "\u05E2\u05D1\u05E8\u05D9\u05EA",
    phoneticNotation: "latin transcription",
    direction: "rtl"
  },
  "hi": {
    nameEn: "Hindi",
    name: "\u0939\u093F\u0928\u094D\u0926\u0940",
    phoneticNotation: "latin transcription"
  },
  "hmn": {
    nameEn: "Hmong",
    name: "Hmong",
    phoneticNotation: "latin transcription"
  },
  "hr": {
    nameEn: "Croatian",
    name: "Hrvatski"
  },
  "ht": {
    nameEn: "Haitian Creole",
    name: "Krey\xF2l Ayisyen"
  },
  "hu": {
    nameEn: "Hungarian",
    name: "Magyar"
  },
  "hy": {
    nameEn: "Armenian",
    name: "\u0540\u0561\u0575\u0565\u0580\u0565\u0576"
  },
  "id": {
    nameEn: "Indonesian",
    name: "Bahasa Indonesia"
  },
  "ig": {
    nameEn: "Igbo",
    name: "Igbo"
  },
  "is": {
    nameEn: "Icelandic",
    name: "\xCDslenska"
  },
  "jw": {
    nameEn: "Javanese",
    name: "Jawa"
  },
  "ka": {
    nameEn: "Georgian",
    name: "\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8"
  },
  "kk": {
    nameEn: "Kazakh",
    name: "\u049A\u0430\u0437\u0430\u049B"
  },
  "mn": {
    nameEn: "Mongolian",
    name: "\u041C\u043E\u043D\u0433\u043E\u043B \u0445\u044D\u043B",
    phoneticNotation: "Latin script"
  },
  "tr": {
    nameEn: "Turkish",
    name: "T\xFCrk\xE7e"
  },
  "ug": {
    nameEn: "Uyghur",
    name: "\u0626\u06C7\u064A\u063A\u06C7\u0631 \u062A\u0649\u0644\u0649",
    phoneticNotation: "Latin Y\xEBziqi",
    direction: "rtl"
  },
  "uk": {
    nameEn: "Ukrainian",
    name: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430",
    phoneticNotation: "national transcription"
  },
  "ur": {
    nameEn: "Urdu",
    name: "\u0627\u0631\u062F\u0648",
    phoneticNotation: "Urdu script",
    direction: "rtl"
  },
  "vi": {
    nameEn: "Vietnamese",
    name: "Ti\u1EBFng Vi\u1EC7t",
    phoneticNotation: false
  }
};
export {
  AI_CACHE_TTL_MS,
  BUILT_IN_PROVIDERS,
  DIALECT_SDK_NPM_PACKAGES,
  INTERNAL_TO_MODELSDEV,
  REASONING_DEFAULT,
  SDK_MAP,
  Service,
  Utils,
  allLanguagesNames,
  buildCacheKey,
  buildProviderOptions,
  buildReasoningDepthOptions,
  buildTranslationMessages,
  buildWordPromptRole,
  codeToLanguageNameInEnglish,
  computeEffectiveBaseURL,
  computeExtraBaseURL,
  createFileCache,
  createMemoryCache,
  createMemoryStorage,
  createModelClient,
  createModelsDevStore,
  createProviderRegistry,
  formatAiError,
  getPreviewProviders,
  getSmartDefaultModel,
  googleService,
  loadPreviewModels,
  lookupKnownApiBase,
  mergeRegistries,
  migrateProviderConfig,
  otherConfigs,
  parseGoogleResponse,
  resolveConfigValues,
  resolveDialect,
  resolveModelsDevId,
  resolveOpenRouterOverrides,
  serviceRuntime,
  streamChat,
  translateGoogle,
  validateProviderDefinition
};
//# sourceMappingURL=index.mjs.map
