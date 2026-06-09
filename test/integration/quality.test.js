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

test("quality tools honor extension exclude patterns", async () => {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "drupal-assets-quality-exclude-"),
  );
  const active = path.join(
    projectRoot,
    "web/modules/custom/active/assets/js/main.js",
  );
  const legacy = path.join(
    projectRoot,
    "web/modules/custom/legacy/assets/js/main.js",
  );
  await mkdir(path.dirname(active), { recursive: true });
  await mkdir(path.dirname(legacy), { recursive: true });
  await writeFile(active, "export const active = true;\n");
  await writeFile(legacy, "export const legacy = ;\n");

  const config = await loadConfig({
    projectRoot,
    configPath: "missing.config.js",
    overrides: {
      exclude: ["modules/custom/legacy"],
    },
  });

  assert.equal(await runQuality("lint", config), 0);
});

test("stylelint uses project config when one exists", async () => {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "drupal-assets-stylelint-config-"),
  );
  const source = path.join(
    projectRoot,
    "web/modules/custom/example/assets/scss/main.scss",
  );
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(
    path.join(projectRoot, "stylelint.config.js"),
    `export default {
  rules: {
    "selector-class-pattern": null,
  },
};
`,
  );
  await writeFile(
    source,
    ".language-switcher--links {\n  display: block;\n}\n",
  );

  const config = await loadConfig({
    projectRoot,
    configPath: "missing.config.js",
  });

  assert.equal(await runQuality("lint", config), 0);
});
