import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin.json"), "utf8"));

/**
 * The submission zip is assembled from an explicit list. plugin.json is the
 * authority for what uTools opens, so a rename there must not quietly produce a
 * zip that cannot boot (index.app.html went missing exactly this way).
 */
describe("uTools package manifest", () => {
  it("points at files that exist in the repository", () => {
    for (const key of ["main", "preload", "logo"]) {
      const rel = plugin[key];
      expect(rel, `${key} missing from plugin.json`).toBeTruthy();
      expect(fs.existsSync(path.join(ROOT, rel)), `${key} → ${rel} does not exist`).toBe(true);
    }
  });

  it("derives the packaged file list from plugin.json", () => {
    const script = fs.readFileSync(path.join(ROOT, "scripts", "package.mjs"), "utf8");
    expect(script).toContain("plugin.main");
    expect(script).toContain("plugin.preload");
  });
});
