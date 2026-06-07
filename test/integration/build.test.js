import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { build } from "../../src/index.js";

const projectRoot = process.cwd();
const fixture = path.join(projectRoot, "fixtures/drupal-project");

test("builds isolated deterministic Drupal extension outputs", async () => {
  await build({
    projectRoot,
    configPath: path.join(projectRoot, "drupal-assets.config.js"),
  });
  const catalogDist = path.join(fixture, "web/modules/custom/catalog/dist");
  const themeDist = path.join(fixture, "web/themes/custom/example/dist");
  const expected = [
    path.join(catalogDist, "css/main.css"),
    path.join(catalogDist, "css/components/card.css"),
    path.join(catalogDist, "js/main.js"),
    path.join(catalogDist, "js/components/modal.js"),
    path.join(catalogDist, "images/icons/search.svg"),
    path.join(catalogDist, "images/twig-only.svg"),
    path.join(catalogDist, "images/example-package/icon.svg"),
    path.join(catalogDist, "images/scope--library/icon.svg"),
    path.join(catalogDist, "fonts/fixture.woff2"),
    path.join(themeDist, "css/theme.css"),
    path.join(themeDist, "js/theme.js"),
    path.join(themeDist, "images/background.svg"),
    path.join(themeDist, "fonts/theme.woff"),
  ];
  await Promise.all(expected.map((file) => stat(file)));
  assert.equal(
    expected.some((file) => /\.[a-f0-9]{8}\./.test(file)),
    false,
  );

  const css = await readFile(path.join(catalogDist, "css/main.css"), "utf8");
  const js = await readFile(path.join(catalogDist, "js/main.js"), "utf8");
  assert.match(css, /images\/icons\/search\.svg/);
  assert.match(css, /fonts\/fixture\.woff2/);
  assert.doesNotMatch(css, /data:/);
  assert.match(js, /composer asset package/);
  assert.match(js, /^import /);
  const library = await readFile(
    path.join(fixture, "web/modules/custom/catalog/catalog.libraries.yml"),
    "utf8",
  );
  assert.match(library, /type: module/);
  await assert.rejects(stat(path.join(catalogDist, "assets")));
  assert.match(js, /Drupal\.t\(['"]Catalog loaded['"]\)/);
  assert.doesNotMatch(js, /main-[a-f0-9]+\.js/);
});
