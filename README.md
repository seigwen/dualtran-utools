# DualTran for uTools

Translate the text you select in any app, or type — right inside uTools —
with **Google** or your own AI model (BYOK, 20+ providers). The interface ships
in **38 languages** (same catalogue as the browser extension) and follows the
system language; you can override it under *AI settings → Interface language*.
Powered by
`@dualtran/core`, the engine extracted from the
[DualTran browser extension](https://github.com/seigwen/DualTran-extension).

## Usage

- **Selected text (the main path)**: select it anywhere, press the uTools panel
  key (**middle mouse button** by default — 设置 → 超级面板) and pick **翻译**;
  the selection is translated the moment the plugin opens.
- **Typed text**: type the text into the uTools search box and pick
  **DualTran · 翻译**; Enter translates it.
- **Copied / pasted text does not trigger the matcher** — uTools evaluates
  matching commands only for typed text (and for pasted images/files), so
  `Ctrl+C` + `Alt+Space` shows no 翻译 row. Paste the text into the plugin's own
  box instead, or use the panel.
- **Keyword**: `dt` (or `tr` / `翻译`) opens the plugin with an empty box —
  uTools passes the keyword itself on that path, never the text that followed.
- **Copy** puts the translation back on the clipboard (paste into the app you
  came from with Ctrl+V).
- **Interface language** follows `navigator.language` (zh-CN → 简体中文, de-AT →
  Deutsch, …) and falls back to English; the picker in AI settings stores an
  override.
- A **bare keyword** never carries the selection: verified — the clipboard is
  untouched when the panel opens, so nothing about the selection reaches the
  search box.

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


## 使用

### 1. 打开插件

按 uTools 的呼出快捷键（**默认 `Alt+Space`**，可在 uTools 设置 → 快捷键 里改）或点悬浮球，输入任意一个关键字：

| 输入 | 说明 |
|---|---|
| `tr` | 最快 |
| `翻译` | 中文关键字 |
| `dt` | 缩写 |

然后回车，或点结果里的 **DualTran** 图标。

### 2. 翻译

窗口里三个东西：

- **上排**：引擎（Google / AI）、源语言（`auto` = 自动识别）、目标语言（`zh-CN` / `en` / …）
- **中间大框**：要翻译的文本，粘贴或直接输入
- **下面两个按钮**：`Translate` 翻译，`Copy` 复制译文（译文出现在按钮下方的只读区）

快捷键：文本框里按 `Ctrl+Enter` 直接翻译。

### 3. 划词翻译（最常用）

uTools 只在这两种情况下把文本交给「匹配指令」：**键盘输入的文本**，以及**选中后经超级面板**。
复制/自动粘贴进搜索框的文字**不参与匹配**（实测：`Ctrl+C` + `Alt+Space` 不会出现「翻译」行）。

1. **超级面板（推荐）**：选中文字 → 鼠标中键（设置 → 超级面板，可改成「长按鼠标右键」）→ 点「翻译」→ 插件打开即自动翻译。
2. **手打**：`Alt+Space` → 用键盘把要翻的文字打进去 → 结果里出现 **DualTran · 翻译** → 回车。
3. **关键字**：`dt` / `tr` / `翻译` 回车打开插件，再把文字粘进插件的输入框点 Translate。

> 选中文字后直接 `Alt+Space` 再输 `dt` 回车时，搜索框里只有 `dt`，选区不会跟过来——
> 这是 uTools 的入口限制（实测：呼出前后剪贴板都没变），不是插件丢了内容。

### 4. 语言

- 源语言填 `auto` 让引擎自己判断；也可以填 `en`、`ja`、`ko` 等
- 目标语言默认 `zh-CN`，要英译就改成 `en`

### 5. 引擎

- **Google**：默认，免费、不用 key，直接可用
- **AI (BYOK)**：给有自己模型的人用。在窗口里展开 **AI settings** 填服务商 / endpoint / model / key
  （服务商与模型列表来自 models.dev，可手动覆盖）；没填全就选 AI 会在翻译时报错

> 设置会记住（存在 uTools 本地数据库），下次打开不用重填语言。

## E2E

`npm run e2e` loads `index.app.html` in headless Chromium with a `window.utools` stub and a local mock endpoint: provider divider + catalogue, translation, AI request body (incl. `reasoning_effort`), spinner, error path, persistence. Artifacts land in `e2e-artifacts/`.
