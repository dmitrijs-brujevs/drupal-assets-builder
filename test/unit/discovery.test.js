import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { discoverEntries, discoverExtensions } from "../../src/discovery.js";

const projectRoot = path.resolve("fixtures/drupal-project");
const webRoot = path.join(projectRoot, "web");

test("discovers modules, themes, nested entries, and excludes Sass non-entries", async () => {
  const extensions = await discoverExtensions({
    webRoot,
    include: [],
    exclude: [],
  });
  assert.deepEqual(
    extensions.map(({ type, relativeRoot }) => ({ type, relativeRoot })),
    [
      { type: "module", relativeRoot: "modules/custom/catalog" },
      { type: "theme", relativeRoot: "themes/custom/example" },
    ],
  );
  const entries = await discoverEntries(extensions[0]);
  assert.deepEqual(
    entries.scss.map((entry) => entry.relative),
    ["scss/components/card.scss", "scss/main.scss"],
  );
  assert.deepEqual(
    entries.js.map((entry) => entry.relative),
    ["js/components/modal.js", "js/main.js", "js/shared.js"],
  );
  assert.equal(entries.images.length, 2);
  assert.equal(entries.fonts.length, 1);
});
