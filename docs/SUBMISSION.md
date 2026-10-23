# Submitting DualTran for uTools (uTools 插件市场)

Status: prepared, not yet submitted. The submission is the maintainer's
uTools-account action via the uTools developer tool.

## Prerequisites

- [ ] Public GitHub repository (`seigwen/dualtran-utools`) with this source.
- [ ] `npm run verify` green and `npm run package` produced
      `dualtran-utools-<version>.zip`.
- [ ] Version in `plugin.json` bumped; release notes drafted.
- [ ] Screenshots (3-4): selection→result; `tr` keyword flow; settings; an AI
      translation example.

## Steps (uTools 开发者工具 → 插件应用市场)

1. Open the uTools developer tool (开发者工具) → 项目 → select this repository
   directory (dev mode loads `plugin.json` directly).
2. Test the full flow in dev mode: select text in another app → invoke uTools
   → plugin shows the text → Translate; and the `tr` keyword flow.
3. 发布 (publish) → fill in: version, update notes, screenshots, category
   (工具 / 翻译), description; attach the packaged zip if the flow asks for an
   upload rather than a repo.
4. Review is manual (expect days). Common rejection reasons to pre-check:
   bundled preload dependencies (this repo ships them unminified, see
   `docs/DEPENDENCIES.md`), missing logo, non-descriptive name.

## Listing copy (draft)

- **Name:** DualTran
- **Description (short):** 翻译选中文本 — Google 或自有 AI 模型（BYOK，20+ 供应商）。
- **Long description:**

```
DualTran 把 DualTran 浏览器扩展的翻译引擎带进 uTools。

· 选中任意软件的文本 → 按 uTools 呼出快捷键（默认 Alt+Space，可在设置里改）→ 一键翻译
· 或输入关键词 tr / 翻译 / dt 后跟文本
· Google 引擎免费即用；AI 引擎（BYOK）支持 OpenAI / Anthropic / Gemini /
  DeepSeek / OpenRouter 等 20+ 供应商，用自己的 API Key
· 结果一键复制回剪贴板

文本只会在你点击翻译时发送给你选择的翻译服务；没有账号、没有统计、没有我们的服务器。
```

## Package layout (what reviewers will see)

`plugin.json` · `index.html` · `preload.js` · `preload/` (readable, unbundled)
· `dist/` (bundled renderer) · `dualtran-core/` (unminified engine bundle)
· `assets/logo.png` · `node_modules/` (runtime deps exactly as published on
npm — see DEPENDENCIES.md) · README/LICENSE/PRIVACY.
