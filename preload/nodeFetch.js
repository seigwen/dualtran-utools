"use strict";
/**
 * nodeFetch — a minimal fetch() implementation over Node's http/https core
 * modules (plan 63 B2).
 *
 * Why it exists: in the uTools preload the global fetch() is the renderer's
 * Chromium fetch and enforces CORS — translation providers send no CORS
 * headers. Requests made through Node's http/https modules are not subject to
 * CORS, so the preload installs this implementation as globalThis.fetch; the
 * AI SDK and @dualtran/core both pick it up from there.
 *
 * Supports what the core + AI SDK need: URL, method, headers, string body,
 * AbortSignal, and a Response-like object with ok/status/statusText/headers/
 * text()/json() plus a streaming body (ReadableStream) for SSE.
 */
const http = require("node:http");
const https = require("node:https");

function createNodeFetch() {
  return function nodeFetch(url, init = {}) {
    return new Promise((resolve, reject) => {
      let target;
      try {
        target = new URL(String(url));
      } catch (err) {
        reject(err);
        return;
      }

      const mod = target.protocol === "https:" ? https : http;
      const request = mod.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || undefined,
          path: target.pathname + target.search,
          method: (init.method || "GET").toUpperCase(),
          headers: init.headers || {},
        },
        (res) => {
          const chunks = [];
          let settled = false;
          let doneResolve;
          let doneReject;
          const done = new Promise((res2, rej2) => {
            doneResolve = res2;
            doneReject = rej2;
          });

          const stream = new ReadableStream({
            start(controller) {
              res.on("data", (chunk) => {
                chunks.push(chunk);
                controller.enqueue(new Uint8Array(chunk));
              });
              res.on("end", () => {
                if (!settled) {
                  settled = true;
                  doneResolve();
                }
                controller.close();
              });
              res.on("error", (err) => {
                if (!settled) {
                  settled = true;
                  doneReject(err);
                }
                controller.error(err);
              });
            },
          });

          const headerMap = new Map(Object.entries(res.headers));
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage || "",
            headers: {
              get: (name) => headerMap.get(String(name).toLowerCase()) || null,
              has: (name) => headerMap.has(String(name).toLowerCase()),
              forEach: (callback) => headerMap.forEach((value, key) => callback(value, key)),
            },
            body: stream,
            async text() {
              await done;
              return Buffer.concat(chunks).toString("utf8");
            },
            async json() {
              await done;
              return JSON.parse(Buffer.concat(chunks).toString("utf8"));
            },
          });
        }
      );

      if (init.signal) {
        if (init.signal.aborted) {
          reject(new Error("The operation was aborted."));
          return;
        }
        init.signal.addEventListener(
          "abort",
          () => {
            request.destroy(new Error("The operation was aborted."));
          },
          { once: true }
        );
      }

      request.on("error", (err) => reject(err));
      if (init.body) {
        request.write(init.body);
      }
      request.end();
    });
  };
}

function installNodeFetch(target = globalThis) {
  const nodeFetch = createNodeFetch();
  target.fetch = nodeFetch;
  return nodeFetch;
}

module.exports = { createNodeFetch, installNodeFetch };
