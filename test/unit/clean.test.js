import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cleanManagedOutput } from "../../src/clean.js";

test("cleans only managed output directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "drupal-assets-clean-"));
  const extension = {
    root: path.join(root, "web/modules/custom/example"),
    assetsRoot: path.join(root, "web/modules/custom/example/assets"),
  };
  await mkdir(path.join(extension.root, "dist/css"), { recursive: true });
  await writeFile(path.join(extension.root, "dist/css/main.css"), "css");
  await writeFile(path.join(extension.root, "dist/keep.txt"), "keep");
  await cleanManagedOutput(extension, { webRoot: path.join(root, "web") });
  assert.equal(existsSync(path.join(extension.root, "dist/keep.txt")), true);
});

test("refuses to follow managed-directory symlinks", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "drupal-assets-symlink-"));
  const extension = {
    root: path.join(root, "web/modules/custom/example"),
    assetsRoot: path.join(root, "web/modules/custom/example/assets"),
  };
  const outside = path.join(root, "outside");
  await mkdir(path.join(extension.root, "dist"), { recursive: true });
  await mkdir(outside);
  await symlink(outside, path.join(extension.root, "dist/css"));
  await assert.rejects(
    cleanManagedOutput(extension, { webRoot: path.join(root, "web") }),
    /Refusing to clean symlink/,
  );
});
