"use strict";
/**
 * Tiny i18n runtime for the uTools page.
 *
 * The catalogues live in `locales/<code>/messages.json` (same shape as the Chrome
 * extension's `_locales`, so reused translations stay identical) and are bundled
 * into `dist/i18n.js` at build time — the page runs from an asar, where fetching
 * local files is not reliable.
 *
 * UMD so the unit tests can require() it directly.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DtI18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** BCP-47 tag → catalogue code. Unknown tags fall back to their base language. */
  function normalizeTag(tag) {
    if (!tag || typeof tag !== "string") return "";
    var raw = tag.trim().replace(/_/g, "-").toLowerCase();
    if (!raw) return "";
    if (raw.indexOf("zh-hant") === 0 || raw === "zh-tw" || raw === "zh-hk" || raw === "zh-mo") return "zh_TW";
    if (raw.indexOf("zh-hans") === 0 || raw.indexOf("zh-cn") === 0 || raw.indexOf("zh-sg") === 0 || raw === "zh") {
      return "zh_CN";
    }
    if (raw.indexOf("zh-") === 0) return "zh_CN";
    if (raw === "pt-br") return "pt_BR";
    if (raw === "pt-pt" || raw === "pt") return "pt_PT";
    if (raw === "nb" || raw === "nb-no" || raw === "nn" || raw === "no-no") return "no";
    return raw.split("-")[0];
  }

  /**
   * Pick the best catalogue code: exact tag → base language → English.
   * `available` is the list of codes we actually ship.
   */
  function detectLocale(preferred, available) {
    var codes = Array.isArray(available) && available.length ? available : ["en"];
    var exact = normalizeTag(preferred);
    if (!exact) return codes.indexOf("en") >= 0 ? "en" : codes[0];
    var match = codes.filter(function (code) {
      return String(code).toLowerCase() === exact.toLowerCase();
    })[0];
    if (match) return match;
    var baseTag = preferred.trim().replace(/_/g, "-").toLowerCase().split("-")[0];
    var base = codes.filter(function (code) {
      return String(code).toLowerCase().split("_")[0] === baseTag;
    })[0];
    if (base) return base;
    return codes.indexOf("en") >= 0 ? "en" : codes[0];
  }

  function interpolate(text, subs) {
    if (!subs) return text;
    return String(text).replace(/\$([A-Z0-9_]+)\$/g, function (whole, name) {
      return Object.prototype.hasOwnProperty.call(subs, name) ? String(subs[name]) : whole;
    });
  }

  /**
   * Build a translator for one catalog set.
   * `t` falls back per key: requested catalogue → English → the key itself.
   */
  function create(locales, preferred) {
    var codes = Object.keys(locales || {});
    var code = detectLocale(preferred, codes);
    var table = (locales && locales[code]) || {};
    var fallback = (locales && locales.en) || {};
    function t(key, subs) {
      var entry = table[key] || fallback[key];
      var text = entry && typeof entry === "object" ? entry.message : entry;
      if (typeof text !== "string") return key;
      return interpolate(text, subs);
    }
    return { code: code, t: t };
  }

  /** Fill [data-i18n] / [data-i18n-placeholder] / [data-i18n-title] nodes. */
  function apply(root, t) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    var texts = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < texts.length; i++) {
      var key = texts[i].getAttribute("data-i18n");
      if (key) texts[i].textContent = t(key);
    }
    var placeholders = root.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < placeholders.length; j++) {
      var pkey = placeholders[j].getAttribute("data-i18n-placeholder");
      if (pkey) placeholders[j].setAttribute("placeholder", t(pkey));
    }
    var titles = root.querySelectorAll("[data-i18n-title]");
    for (var k = 0; k < titles.length; k++) {
      var tkey = titles[k].getAttribute("data-i18n-title");
      if (tkey) titles[k].setAttribute("title", t(tkey));
    }
  }

  return { normalizeTag: normalizeTag, detectLocale: detectLocale, create: create, interpolate: interpolate, apply: apply };
});
