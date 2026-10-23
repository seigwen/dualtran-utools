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

1. 在网页、邮件、编辑器里**选中**要翻译的文字
2. 按 uTools 呼出快捷键（默认 `Alt+Space`）—— 选中的文字会被带进搜索框
3. 选 **DualTran**（或输入 `tr` 回车）
4. 插件打开时自动把这段文字填进去并翻译，不用再粘贴

### 4. 语言

- 源语言填 `auto` 让引擎自己判断；也可以填 `en`、`ja`、`ko` 等
- 目标语言默认 `zh-CN`，要英译就改成 `en`

### 5. 引擎

- **Google**：默认，免费、不用 key，直接可用
- **AI (BYOK)**：给有自己模型的人用（OpenAI 兼容端点）。当前 uTools 版还没有设置面板，
  选它会在翻译时报错 —— 需要先在配置里填 endpoint / model / key 才可用。

> 设置会记住（存在 uTools 本地数据库），下次打开不用重填语言。
