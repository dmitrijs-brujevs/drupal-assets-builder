import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadConfig } from "../../src/index.js";
import { runQuality } from "../../src/quality-tools.js";

async function fixtureWith(type, contents) {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), `drupal-assets-${type}-only-`),
  );
  const source = path.join(
    projectRoot,
    `web/modules/custom/example/assets/${type}/main.${type === "js" ? "js" : "scss"}`,
  );
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(source, contents);
  return loadConfig({ projectRoot, configPath: "missing.config.js" });
}

test("lint succeeds for SCSS-only and JavaScript-only projects", async () => {
  const scss = await fixtureWith("scss", ".example {\n  display: block;\n}\n");
  const javascript = await fixtureWith("js", "export const example = true;\n");
  assert.equal(await runQuality("lint", scss), 0);
  assert.equal(await runQuality("lint", javascript), 0);
});
