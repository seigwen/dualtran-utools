import { describe, expect, it } from "vitest";
import { makeEnterTextExtractor } from "../../preload/enterText.js";

const extract = makeEnterTextExtractor(["tr", "翻译", "dt"]);

/**
 * uTools contract under test (docs: onPluginEnter → PluginEnterAction):
 *   over / regex  → payload IS the matched text
 *   text          → payload is the COMMAND NAME ("dt"); arguments, when a version
 *                   passes them, follow the command name
 */
describe("makeEnterTextExtractor", () => {
  it("takes the matched text from an over (划词/搜索框文本) entry", () => {
    expect(extract({ type: "over", payload: "serendipity" })).toBe("serendipity");
    expect(extract({ type: "over", payload: "  hello world \n" })).toBe("hello world");
  });

  it("takes the matched text from a regex entry", () => {
    expect(extract({ type: "regex", payload: "https://example.com" })).toBe("https://example.com");
  });

  it("never returns the keyword itself as text", () => {
    for (const command of ["dt", "tr", "翻译", "DT", " Tr "]) {
      expect(extract({ type: "text", payload: command })).toBe("");
    }
  });

  it("strips a leading command token when arguments are passed", () => {
    expect(extract({ type: "text", payload: "dt hello world" })).toBe("hello world");
    expect(extract({ type: "text", payload: "翻译 你好" })).toBe("你好");
    expect(extract({ type: "text", payload: "DT\nsecond line" })).toBe("second line");
  });

  it("treats an unknown text payload as the text itself", () => {
    expect(extract({ type: "text", payload: "hello" })).toBe("hello");
    expect(extract({ type: "text", payload: "dt hello dt" })).toBe("hello dt");
  });

  it("carries no text for entries that are not text-bearing", () => {
    expect(extract({ type: "img", payload: "data:image/png;base64,xx" })).toBe("");
    expect(extract({ type: "files", payload: [{ path: "a.txt" }] })).toBe("");
    expect(extract({ type: "window", payload: { title: "x" } })).toBe("");
    expect(extract({ type: undefined, payload: "dt" })).toBe("");
  });

  it("survives empty, malformed and missing payloads", () => {
    expect(extract(undefined)).toBe("");
    expect(extract({})).toBe("");
    expect(extract({ type: "over" })).toBe("");
    expect(extract({ type: "over", payload: 42 })).toBe("");
    expect(extract({ type: "over", payload: "   " })).toBe("");
  });

  it("works with an empty command list", () => {
    const bare = makeEnterTextExtractor();
    expect(bare({ type: "text", payload: "dt" })).toBe("dt");
    expect(bare({ type: "over", payload: "word" })).toBe("word");
  });
});
