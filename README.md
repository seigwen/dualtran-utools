# DualTran for uTools

Translate the text you select in any app, or type — right inside uTools —
with **Google** or your own AI model (BYOK, 20+ providers). Powered by
`@dualtran/core`, the engine extracted from the
[DualTran browser extension](https://github.com/seigwen/DualTran-extension).

## Usage

- Select text anywhere → open uTools → the plugin appears with the text ready
  → press **Translate**.
- Or type `tr` (or `翻译` / `dt`) in uTools, enter text after it, press Enter.
- **Copy** puts the translation back on the clipboard (paste into the app you
  came from with Ctrl+V).

## Development

```bash
node scripts/sync-core.mjs   # stages dualtran-core/ (unminified core bundle)
npm install                  # dev deps + runtime deps (readable, as published)
npm test                     # unit + integration suites (incl. nodeFetch over a local server)
npm run build                # bundles the renderer to dist/
npm run verify               # test + build + structure guards
npm run package              # assembles DualTran-uTools-<version>.zip for submission
```

## Layout

- `preload.js` + `preload/` — Node side: no CORS, all network traffic lives
  here; kept unbundled and readable (uTools review rule — see
  `docs/DEPENDENCIES.md`).
- `src/renderer/` — the UI (bundled to `dist/`).
- `dualtran-core/` — staged engine bundle (produced by `scripts/sync-core.mjs`).
- `tests/` — vitest suites: bridge/settings/nodeFetch units, a real-core
  integration test, and dist guards (plugin.json contract, readability rule).

## License

MIT — the bundled `@dualtran/core` portion is MPL-2.0.
