import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { resolveComposerAsset } from "../../src/composer-resolver.js";

const composerAssetsDir = path.resolve(
  "fixtures/drupal-project/vendor/npm-asset",
);
const config = { composerAssetsDir, projectRoot: process.cwd() };

test("resolves standard, scoped, subpath, and CSS Composer assets", async () => {
  assert.equal(
    await resolveComposerAsset("example-package", config),
    path.join(composerAssetsDir, "example-package/index.js"),
  );
  assert.equal(
    await resolveComposerAsset("@scope/library", config),
    path.join(composerAssetsDir, "scope--library/index.js"),
  );
  assert.equal(
    await resolveComposerAsset("example-package/feature", config),
    path.join(composerAssetsDir, "example-package/feature.js"),
  );
  assert.equal(
    await resolveComposerAsset("example-package/styles.css", config),
    path.join(composerAssetsDir, "example-package/styles.css"),
  );
});

test("does not intercept relative, absolute, URL, or virtual imports", async () => {
  for (const specifier of [
    "./local.js",
    "/absolute.js",
    "https://example.com/a.js",
    "\0virtual",
  ]) {
    assert.equal(await resolveComposerAsset(specifier, config), null);
  }
});
