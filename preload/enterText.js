"use strict";
/**
 * Which text does a uTools enter action carry?
 *
 * uTools semantics (docs: onPluginEnter → PluginEnterAction):
 *   - type "over" / "regex" → 匹配指令: payload IS the matched text (this is the
 *     only path that carries a selection into the plugin);
 *   - type "text"           → 功能指令: payload is the COMMAND NAME ("dt"), not the
 *     user's text. Some versions append arguments after the command name, so a
 *     leading command token is stripped and whatever follows is the text;
 *   - img / files / window  → nothing to translate.
 *
 * Keeping this pure makes the contract testable without a running uTools.
 */
function makeEnterTextExtractor(commandNames) {
  const commands = new Set(
    (commandNames || [])
      .map((name) => String(name).trim().toLowerCase())
      .filter((name) => name.length > 0)
  );

  return function extractEnterText(action) {
    if (!action || typeof action !== "object") return "";
    const { type, payload } = action;
    if (typeof payload !== "string") return "";
    const raw = payload.trim();
    if (!raw) return "";
    if (type === "over" || type === "regex") return raw;
    if (type !== "text") return "";
    const withArguments = /^(\S+)\s+([\s\S]+)$/.exec(raw);
    if (withArguments && commands.has(withArguments[1].toLowerCase())) {
      return withArguments[2].trim();
    }
    if (commands.has(raw.toLowerCase())) return "";
    return raw;
  };
}

module.exports = { makeEnterTextExtractor };
