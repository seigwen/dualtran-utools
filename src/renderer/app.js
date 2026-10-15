/**
 * Renderer layer — plain DOM, talks to the preload via window.__dualtran
 * (preload and renderer share one window in uTools). Bundled to dist/ by
 * scripts/build-renderer.mjs.
 */
const els = {
  engine: document.getElementById("engine"),
  source: document.getElementById("source"),
  target: document.getElementById("target"),
  input: document.getElementById("input"),
  translate: document.getElementById("translate"),
  copy: document.getElementById("copy"),
  status: document.getElementById("status"),
  result: document.getElementById("result"),
};

function setStatus(text, isError = false) {
  els.status.textContent = text || "";
  els.status.classList.toggle("error", Boolean(isError));
}

function applySettings(settings) {
  els.engine.value = settings.engine;
  els.source.value = settings.sourceLanguage;
  els.target.value = settings.targetLanguage;
}

function collectSettings() {
  return {
    engine: els.engine.value,
    sourceLanguage: els.source.value.trim() || "auto",
    targetLanguage: els.target.value.trim() || "en",
  };
}

async function translate() {
  const text = els.input.value.trim();
  if (!text) {
    setStatus("Nothing to translate.");
    return;
  }
  els.translate.disabled = true;
  setStatus("Translating…");
  els.result.textContent = "";
  els.copy.disabled = true;
  try {
    await window.__dualtran.saveSettings(collectSettings());
    const out = await window.__dualtran.translate(text);
    els.result.textContent = out;
    els.copy.disabled = !out;
    setStatus(out ? "Done." : "Empty translation.");
  } catch (error) {
    setStatus(String((error && error.message) || error), true);
  } finally {
    els.translate.disabled = false;
  }
}

function wire() {
  const api = window.__dualtran;
  if (!api) {
    setStatus("DualTran preload not available.", true);
    return;
  }
  applySettings(api.getSettings());
  els.translate.addEventListener("click", translate);
  els.copy.addEventListener("click", () => api.copyText(els.result.textContent));
  els.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      translate();
    }
  });
  // uTools hands the selected text in through onPluginEnter (preload).
  const pending = api.consumePendingInput();
  if (pending) {
    els.input.value = pending;
    translate();
  }
  window.__dualtranOnEnter = (text) => {
    els.input.value = text;
    translate();
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wire);
} else {
  wire();
}
