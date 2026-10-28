import { describe, expect, it } from "vitest";
import { createEnterDelivery } from "../../preload/enterDelivery.js";

/**
 * The page may not have registered its message listener when uTools fires
 * onPluginEnter (a freshly created window loads the page after the preload), so a
 * single postMessage can be lost. Delivery must therefore keep re-posting until
 * the page acknowledges, and stop as soon as it does.
 */
function harness({ retryMs = 250, maxMs = 4000 } = {}) {
  let clock = 0;
  let seq = 0;
  const timers = new Map();
  const posts = [];
  const delivery = createEnterDelivery({
    post: (message) => posts.push(message),
    setTimer: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { fn, at: clock + ms });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    now: () => clock,
    retryMs,
    maxMs,
  });
  const advance = (ms) => {
    const target = clock + ms;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      timers.delete(id);
      clock = timer.at;
      timer.fn();
    }
    clock = target;
  };
  return { delivery, posts, advance, inputs: () => posts.filter((p) => p.type === "input") };
}

describe("createEnterDelivery", () => {
  it("posts the entered text immediately", () => {
    const { delivery, inputs } = harness();
    delivery.send("serendipity");
    expect(inputs()).toEqual([{ __dualtran: true, type: "input", text: "serendipity" }]);
  });

  it("re-posts until the page acknowledges, then stays quiet", () => {
    const { delivery, advance, inputs } = harness();
    delivery.send("hello");
    advance(250);
    advance(250);
    expect(inputs().length).toBe(3);
    delivery.onAck();
    advance(5000);
    expect(inputs().length).toBe(3);
  });

  it("gives up after maxMs so a stale entry cannot fire hours later", () => {
    const { delivery, advance, inputs } = harness();
    delivery.send("hello");
    advance(5000);
    const settled = inputs().length;
    advance(5000);
    expect(inputs().length).toBe(settled);
    delivery.onReady();
    expect(inputs().length).toBe(settled);
  });

  it("re-delivers a pending text when the page reports ready", () => {
    const { delivery, advance, inputs } = harness();
    delivery.send("hello");
    advance(300);
    const before = inputs().length;
    delivery.onReady();
    expect(inputs().length).toBe(before + 1);
    expect(inputs().at(-1).text).toBe("hello");
  });

  it("focus entries carry no text and cancel a pending delivery", () => {
    const { delivery, advance, posts, inputs } = harness();
    delivery.send("hello");
    advance(100);
    delivery.sendFocus();
    expect(posts.at(-1)).toEqual({ __dualtran: true, type: "focus" });
    const settled = inputs().length;
    advance(2000);
    expect(inputs().length).toBe(settled);
  });

  it("does nothing when an ack arrives with no pending text", () => {
    const { delivery, posts } = harness();
    delivery.onAck();
    expect(posts).toEqual([]);
  });
});
