import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  detectOutputCollisions,
  mapSourceToOutput,
} from "../../src/mapping.js";

const root = path.resolve("fixtures/drupal-project/web/modules/custom/catalog");
const extension = {
  root,
  assetsRoot: path.join(root, "assets"),
  distRoot: path.join(root, "dist"),
};

for (const [source, expected] of [
  ["scss/main.scss", "css/main.css"],
  ["scss/components/card.scss", "css/components/card.css"],
  ["js/components/modal.js", "js/components/modal.js"],
  ["images/icons/search.svg", "images/icons/search.svg"],
  ["fonts/fixture.woff2", "fonts/fixture.woff2"],
]) {
  test(`maps ${source}`, () => {
    const mapping = mapSourceToOutput(
      path.join(extension.assetsRoot, source),
      extension,
    );
    assert.equal(mapping.relative, expected);
  });
}

test("rejects source paths outside the extension assets directory", () => {
  assert.throws(
    () => mapSourceToOutput(path.resolve("package.json"), extension),
    /escapes its allowed root/,
  );
});

test("detects output collisions", () => {
  const output = path.join(extension.distRoot, "images/example.svg");
  assert.throws(
    () =>
      detectOutputCollisions([
        { source: "/one.svg", output },
        { source: "/two.svg", output },
      ]),
    /Multiple sources map/,
  );
});
