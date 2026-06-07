import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { discoverExtensions } from "../../src/discovery.js";

test("discovers nested extensions and applies include/exclude patterns", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "drupal-assets-discovery-"),
  );
  const webRoot = path.join(root, "web");
  const nested = path.join(webRoot, "modules/custom/group/nested/assets/js");
  const excluded = path.join(webRoot, "themes/custom/excluded/assets/js");
  await mkdir(nested, { recursive: true });
  await mkdir(excluded, { recursive: true });
  await writeFile(path.join(nested, "main.js"), "export default true;");
  await writeFile(path.join(excluded, "main.js"), "export default true;");

  const extensions = await discoverExtensions({
    webRoot,
    include: ["modules/custom/**"],
    exclude: ["**/excluded"],
  });
  assert.deepEqual(
    extensions.map((extension) => extension.relativeRoot),
    ["modules/custom/group/nested"],
  );
});

test("does not follow directory symlinks during discovery", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "drupal-assets-discovery-link-"),
  );
  const webRoot = path.join(root, "web");
  const outside = path.join(root, "outside/assets/js");
  const custom = path.join(webRoot, "modules/custom");
  await mkdir(outside, { recursive: true });
  await mkdir(custom, { recursive: true });
  await writeFile(path.join(outside, "main.js"), "export default true;");
  await symlink(path.join(root, "outside"), path.join(custom, "linked"));
  assert.deepEqual(
    await discoverExtensions({ webRoot, include: [], exclude: [] }),
    [],
  );
});
