import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadConfig, watch } from "../../src/index.js";

async function waitFor(filePath, exists = true) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      if (exists) return;
    } catch {
      if (!exists) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`${filePath} did not become ${exists ? "available" : "absent"}`);
}

test("watch discovers new entries and extensions and removes deleted outputs", async () => {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "drupal-assets-watch-"),
  );
  const firstRoot = path.join(projectRoot, "web/modules/custom/first");
  await mkdir(path.join(firstRoot, "assets/js"), { recursive: true });
  await writeFile(
    path.join(firstRoot, "assets/js/main.js"),
    "export const main = true;\n",
  );
  const config = await loadConfig({
    projectRoot,
    configPath: "missing.config.js",
  });
  const watcher = await watch({ config });
  try {
    const secondEntry = path.join(firstRoot, "assets/js/two.js");
    const secondOutput = path.join(firstRoot, "dist/js/two.js");
    await writeFile(secondEntry, "export const two = true;\n");
    await waitFor(secondOutput);
    const imageSource = path.join(firstRoot, "assets/images/new.svg");
    const imageOutput = path.join(firstRoot, "dist/images/new.svg");
    await mkdir(path.dirname(imageSource), { recursive: true });
    await writeFile(imageSource, `<svg xmlns="http://www.w3.org/2000/svg"/>\n`);
    await waitFor(imageOutput);
    await rm(imageSource);
    await waitFor(imageOutput, false);

    const nestedRoot = path.join(
      projectRoot,
      "web/themes/custom/group/new_theme",
    );
    const nestedEntry = path.join(nestedRoot, "assets/scss/theme.scss");
    const nestedOutput = path.join(nestedRoot, "dist/css/theme.css");
    await mkdir(path.dirname(nestedEntry), { recursive: true });
    await writeFile(nestedEntry, ".new-theme { display: block; }\n");
    await waitFor(nestedOutput);

    await rm(secondEntry);
    await waitFor(secondOutput, false);
  } finally {
    await watcher.close();
  }
});
