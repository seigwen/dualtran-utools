# Shipped dependency manifest — preload side (plan 63 D5-A)

The uTools review rule for this side: Node dependencies used by `preload.js`
must sit next to it, unminified, with every line readable. This plugin ships
them exactly as published on npm — no re-bundling, no minification, no
obfuscation of preload-side code.

## Own code (this repository, readable)

| File | Purpose |
|---|---|
| `preload.js` | Thin wiring: utools API, storage, expose `window.__dualtran` |
| `preload/bridge.js` | Translation logic (Google batch / AI stream), dependency-injected |
| `preload/settings.js` | Settings shape + `utools.dbStorage` adapter |
| `preload/nodeFetch.js` | fetch() over node:http/https (preload has no CORS) |
| `dualtran-core/index.mjs` | `@dualtran/core` — this project's own engine bundle, built with esbuild with **minification disabled** (see the build config in the source repository) |

## Third-party npm packages (installed as published, unminified)

| Package | Version range | License | Why |
|---|---|---|---|
| `ai` | ^6.0.199 | Apache-2.0 | Vercel AI SDK — streaming chat transport used by `@dualtran/core` |
| `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/deepseek`, `@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/groq`, `@ai-sdk/perplexity`, `@ai-sdk/xai`, `@ai-sdk/togetherai`, `@ai-sdk/deepinfra`, `@ai-sdk/azure` | see `package.json` | Apache-2.0 | Built-in provider clients for BYOK AI translation |
| `@ai-sdk/openai-compatible` (+ transitive `@ai-sdk/provider*`) | transitive | Apache-2.0 | OpenAI-compatible fallback for other providers (e.g. OpenRouter) |
| `common-tags` | ^1.8.2 | MIT | Prompt template assembly in the core |
| `eventsource-parser` | ^1.0.0 | MIT | SSE stream parsing for AI responses |

Full unminiaturized source for everything under this project's own authorship:
https://github.com/seigwen/dualtran-utools and
https://github.com/seigwen/DualTran-extension (`src/core/`).

## Renderer side

`dist/renderer.js` (the plugin's own UI logic) is the bundled side — bundling
is permitted there by the same rule. Its readable source lives in
`src/renderer/app.js`.
