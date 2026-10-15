import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { createNodeFetch, installNodeFetch } from "../../preload/nodeFetch.js";

let server;
let base;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/text") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("hello");
    } else if (req.url === "/json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"a":1}');
    } else if (req.url === "/slow") {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write("chunk-1,");
      setTimeout(() => {
        res.write("chunk-2");
        res.end();
      }, 30);
    } else if (req.url === "/status") {
      res.writeHead(429, "Too Many Requests");
      res.end("slow down");
    } else if (req.url === "/echo") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ method: req.method, contentType: req.headers["content-type"], body }));
      });
    } else {
      res.writeHead(404);
      res.end("nope");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

describe("nodeFetch — fetch over node:http (preload, no CORS)", () => {
  it("GET text: ok/status/text()", async () => {
    const f = createNodeFetch();
    const res = await f(`${base}/text`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");
  });

  it("reports non-2xx without throwing", async () => {
    const f = createNodeFetch();
    const res = await f(`${base}/status`);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(429);
    expect(res.statusText).toBe("Too Many Requests");
    expect(await res.text()).toBe("slow down");
  });

  it("json() parses JSON bodies", async () => {
    const f = createNodeFetch();
    const res = await f(`${base}/json`);
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("response.body is a ReadableStream yielding the raw bytes (SSE path)", async () => {
    const f = createNodeFetch();
    const res = await f(`${base}/slow`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
    }
    expect(acc).toBe("chunk-1,chunk-2");
  });

  it("POSTs a string body with headers", async () => {
    const f = createNodeFetch();
    const res = await f(`${base}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"q":"hi"}',
    });
    expect(await res.json()).toEqual({
      method: "POST",
      contentType: "application/json",
      body: '{"q":"hi"}',
    });
  });

  it("rejects on abort", async () => {
    const f = createNodeFetch();
    const controller = new AbortController();
    const pending = f(`${base}/slow`, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow(/abort/i);
  });

  it("installNodeFetch assigns fetch onto the given target and returns it", () => {
    const target = {};
    const f = installNodeFetch(target);
    expect(target.fetch).toBe(f);
    expect(typeof f).toBe("function");
  });
});
