import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadConfig, mergeConfig } from "../../src/config.js";

test("discovers config and resolves project-relative directories", async () => {
  const projectRoot = process.cwd();
  const config = await loadConfig({ projectRoot });
  assert.equal(
    config.webRoot,
    path.join(projectRoot, "fixtures/drupal-project/web"),
  );
  assert.equal(
    config.composerAssetsDir,
    path.join(projectRoot, "fixtures/drupal-project/vendor/npm-asset"),
  );
});

test("deep merges supported config sections", () => {
  const merged = mergeConfig(
    {
      devServer: { host: "localhost", port: 5173 },
      minify: { css: true, js: false },
    },
    { devServer: { port: 5175 }, minify: { js: true } },
  );
  assert.deepEqual(merged.devServer, { host: "localhost", port: 5175 });
  assert.deepEqual(merged.minify, { css: true, js: true });
});
