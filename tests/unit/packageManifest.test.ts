import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");
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

  it("keeps the packaged entry point inside the zip staging list", () => {
    const script = fs.readFileSync(path.join(ROOT, "scripts", "package.mjs"), "utf8");
    // The list is built from plugin.json (pluginFiles) — assert the wiring exists
    // so a future hand-written list cannot silently drop the entry point again.
    expect(script).toContain("plugin.main");
    expect(script).toContain("plugin.preload");
  });
});
