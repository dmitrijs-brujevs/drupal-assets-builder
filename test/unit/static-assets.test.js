import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { deleteStaticOutput } from "../../src/static-assets.js";

test("maps deleted static sources to the matching output", async () => {
  const root = path.resolve(
    "fixtures/drupal-project/web/modules/custom/catalog",
  );
  const extension = {
    root,
    assetsRoot: path.join(root, "assets"),
    distRoot: path.join(root, "dist"),
  };
  const source = path.join(extension.assetsRoot, "images/missing.svg");
  const mapping = await deleteStaticOutput(source, extension);
  assert.equal(mapping.relative, "images/missing.svg");
});
