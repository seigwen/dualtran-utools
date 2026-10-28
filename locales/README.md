# locales

One directory per UI language, same shape as the Chrome extension's `_locales`
(`{"key": {"message": "…"}}`), so both products can share translations.

- `en` is the source catalogue; every other locale must carry the same keys in
  the same order (enforced by `tests/dist/guards.mjs`).
- Keys that already exist in the extension are copied from it verbatim
  (`btnTranslate`, `btncopy`, `lblAiProvider`, `msgReasoningDepth*`, …).
- `zh_CN` and `zh_TW` are written by hand. The remaining ~35 languages are
  machine-translated (`npm run i18n:sync`) and reviewed on a best-effort basis —
  corrections are welcome; keep placeholders (`$COUNT$`, `$ERROR$`, `$STATUS$`)
  and the uTools panel label 「翻译」 untouched.
- `npm run build` bundles every catalogue into `dist/i18n.js` (the page runs from
  an asar, where fetching local JSON is not dependable).
