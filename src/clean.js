import path from "node:path";
import { lstat, realpath, rm } from "node:fs/promises";
import { DrupalAssetsError } from "./errors.js";
import { isInside } from "./path-utils.js";

const MANAGED_DIRECTORIES = ["css", "js", "images", "fonts"];

async function validateManagedDirectory(extension, directory, webRoot) {
  const expected = path.resolve(extension.root, "dist", directory);
  if (
    !isInside(extension.root, expected) ||
    expected === path.resolve(extension.root)
  ) {
    throw new DrupalAssetsError(
      "UNSAFE_CLEAN",
      `Refusing to clean unsafe path: ${expected}`,
    );
  }
  if (
    expected === path.resolve(webRoot) ||
    expected === path.resolve(extension.assetsRoot)
  ) {
    throw new DrupalAssetsError(
      "UNSAFE_CLEAN",
      `Refusing to clean protected path: ${expected}`,
    );
  }
  try {
    const stats = await lstat(expected);
    if (stats.isSymbolicLink()) {
      throw new DrupalAssetsError(
        "UNSAFE_CLEAN",
        `Refusing to clean symlink: ${expected}`,
      );
    }
    const resolved = await realpath(expected);
    if (!isInside(await realpath(extension.root), resolved)) {
      throw new DrupalAssetsError(
        "UNSAFE_CLEAN",
        `Clean path resolves outside extension: ${expected}`,
      );
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return expected;
}

/**
 * Removes only managed dist subdirectories for an extension.
 *
 * @param {{ root: string, assetsRoot: string }} extension
 * @param {{ webRoot: string, verbose?: boolean, logger?: Console }} options
 */
export async function cleanManagedOutput(extension, options) {
  const logger = options.logger ?? console;
  const directories = options.directories ?? MANAGED_DIRECTORIES;
  for (const directory of directories) {
    if (!MANAGED_DIRECTORIES.includes(directory)) {
      throw new DrupalAssetsError(
        "UNSAFE_CLEAN",
        `Unknown managed directory: ${directory}`,
      );
    }
    const target = await validateManagedDirectory(
      extension,
      directory,
      options.webRoot,
    );
    if (options.verbose) logger.log(`remove ${target}`);
    await rm(target, { recursive: true, force: true });
  }
}

export { validateManagedDirectory, MANAGED_DIRECTORIES };
