"use strict";
/**
 * DualTran for uTools — preload entry.
 *
 * One job: turn the enter action into text for the page, then hand it over
 * reliably. The contract (which uTools entry types carry text, and why a bare
 * keyword does not) lives in preload/enterText.js; the retry-until-acknowledged
 * delivery lives in preload/enterDelivery.js.
 *
 * All network work happens in the page: Node's raw sockets cannot reach
 * translate.googleapis.com on this network (ETIMEDOUT), while the page's fetch
 * does (200 in ~350 ms), so the browser stack is the working path.
 */
const pluginConfig = require("./plugin.json");
const { makeEnterTextExtractor } = require("./preload/enterText.js");
const { createEnterDelivery } = require("./preload/enterDelivery.js");

/** Every string cmd in plugin.json is a keyword; object cmds are matchers. */
const commandNames = (pluginConfig.features || []).reduce(
  (names, feature) => names.concat((feature.cmds || []).filter((cmd) => typeof cmd === "string")),
  []
);

const extractEnterText = makeEnterTextExtractor(commandNames);

const delivery = createEnterDelivery({
  post: (message) => window.postMessage(message, "*"),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle),
  now: () => Date.now(),
});

utools.onPluginEnter((action) => {
  const text = extractEnterText(action);
  if (text) delivery.send(text);
  else delivery.sendFocus();
});

window.addEventListener("message", (event) => {
  const message = event && event.data;
  if (!message || message.__dualtran !== true) return;
  if (message.type === "ready") delivery.onReady();
  else if (message.type === "ack") delivery.onAck();
});
