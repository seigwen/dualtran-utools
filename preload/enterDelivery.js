"use strict";
/**
 * Hand one enter payload to the page, reliably.
 *
 * The preload runs before the page, so onPluginEnter can fire while the page's
 * message listener does not exist yet — a single postMessage would be lost (the
 * original 120 ms one-shot did exactly that). Delivery therefore re-posts on a
 * short interval until the page acknowledges, gives up after `maxMs` so a stale
 * entry can never fire minutes later, and pushes the pending text immediately
 * when the page announces it is ready.
 *
 * Timer and clock are injected so the state machine is testable without waiting.
 */
function createEnterDelivery({ post, setTimer, clearTimer, now, retryMs = 250, maxMs = 4000 }) {
  let pending = null;
  let timer = null;
  let deadline = 0;

  function stopTimer() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function emit() {
    if (pending === null) return;
    post({ __dualtran: true, type: "input", text: pending });
  }

  function schedule() {
    stopTimer();
    if (pending === null) return;
    if (now() >= deadline) {
      // Unacknowledged for too long: drop it rather than fire it later.
      pending = null;
      return;
    }
    timer = setTimer(() => {
      timer = null;
      emit();
      schedule();
    }, retryMs);
  }

  function sendFocus() {
    pending = null;
    stopTimer();
    post({ __dualtran: true, type: "focus" });
  }

  return {
    /** Enter carried text (selection / pasted / keyword argument). */
    send(text) {
      if (typeof text !== "string" || !text.trim()) {
        sendFocus();
        return;
      }
      pending = text;
      deadline = now() + maxMs;
      emit();
      schedule();
    },
    /** Enter carried no text (bare keyword): let the page focus its input. */
    sendFocus,
    /** The page's listener is installed now — re-deliver anything still pending. */
    onReady() {
      if (pending === null) return;
      emit();
      schedule();
    },
    /** The page consumed the text; stop retrying. */
    onAck() {
      pending = null;
      stopTimer();
    },
  };
}

module.exports = { createEnterDelivery };
