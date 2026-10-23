"use strict";
/**
 * DualTran for uTools — preload entry.
 *
 * Single job: hand the selected text uTools passes on entry to the page.
 *
 * All network work happens in the page: Node's raw sockets cannot reach
 * translate.googleapis.com on this network (ETIMEDOUT), while the page's
 * fetch does (200 in ~350 ms), so the browser stack is the working path.
 */
let pendingText = null;

utools.onPluginEnter(({ type, payload }) => {
  if ((type === "text" || type === "over") && typeof payload === "string" && payload.trim()) {
    pendingText = payload.trim();
    setTimeout(() => {
      if (!pendingText) return;
      window.postMessage({ __dualtran: true, type: "input", text: pendingText }, "*");
      pendingText = null;
    }, 120);
  }
});
