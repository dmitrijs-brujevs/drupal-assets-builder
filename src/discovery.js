import path from "node:path";
import { glob } from "glob";
import { minimatch } from "minimatch";
import { classifyAsset, toPosix } from "./path-utils.js";
import { containsDirectorySymlink } from "./symlink-safety.js";

const EXTENSION_ASSET_PATTERN =
  "{modules,themes}/custom/**/assets/{scss,js,images,fonts}/**/*";

function extensionFromAsset(webRoot, sourcePath) {
  const relative = path.relative(webRoot, sourcePath);
  const segments = relative.split(path.sep);
  const assetsIndex = segments.lastIndexOf("assets");
  if (assetsIndex < 3) return null;
  const type =
    segments[0] === "modules"
      ? "module"
      : segments[0] === "themes"
        ? "theme"
        : null;
  if (!type || segments[1] !== "custom") return null;
  const root = path.join(webRoot, ...segments.slice(0, assetsIndex));
  return {
    type,
    name: segments[assetsIndex - 1],
    relativeRoot: toPosix(path.relative(webRoot, root)),
    root,
    assetsRoot: path.join(root, "assets"),
    distRoot: path.join(root, "dist"),
  };
}

function included(relativePath, include, exclude) {
  const matches = (patterns) =>
    patterns.some((pattern) =>
      minimatch(relativePath, pattern, { dot: false, matchBase: true }),
    );
  if (exclude.length && matches(exclude)) return false;
  return !include.length || matches(include);
}

/**
 * Discovers custom Drupal modules and themes that contain supported assets.
 *
 * @param {{ webRoot: string, include?: string[], exclude?: string[] }} config
 */
export async function discoverExtensions(config) {
  const files = await glob(EXTENSION_ASSET_PATTERN, {
    cwd: config.webRoot,
    absolute: true,
    nodir: true,
    follow: false,
    dot: false,
    ignore: config.exclude ?? [],
  });
  const extensions = new Map();
  for (const file of files.sort()) {
    const extension = extensionFromAsset(config.webRoot, file);
    if (!extension || !classifyAsset(file)) continue;
    if (await containsDirectorySymlink(config.webRoot, extension.root))
      continue;
    if (
      !included(
        extension.relativeRoot,
        config.include ?? [],
        config.exclude ?? [],
      )
    )
      continue;
    extensions.set(extension.root, extension);
  }
  return [...extensions.values()].sort((a, b) =>
    a.relativeRoot.localeCompare(b.relativeRoot),
  );
}

/**
 * Returns structured entries and static assets for one extension.
 *
 * @param {{ root: string, assetsRoot: string }} extension
 */
export async function discoverEntries(extension) {
  const files = await glob("assets/{scss,js,images,fonts}/**/*", {
    cwd: extension.root,
    absolute: true,
    nodir: true,
    follow: false,
  });
  const entries = { scss: [], js: [], images: [], fonts: [] };
  for (const source of files.sort()) {
    const type = classifyAsset(source);
    if (!type) continue;
    const relative = toPosix(path.relative(extension.assetsRoot, source));
    if (type === "scss") {
      const fromScss = relative.slice("scss/".length);
      if (
        path.posix.basename(fromScss).startsWith("_") ||
        fromScss.startsWith("abstracts/")
      )
        continue;
    }
    entries[type].push({
      type,
      source,
      relative,
      extensionRoot: extension.root,
    });
  }
  return entries;
}

export { extensionFromAsset };
