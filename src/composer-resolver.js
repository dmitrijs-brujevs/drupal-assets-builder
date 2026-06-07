import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { exports as resolveExports } from "resolve.exports";
import { DrupalAssetsError } from "./errors.js";

const require = createRequire(import.meta.url);
const SKIPPED_PREFIXES = [
  ".",
  "/",
  "\\",
  "#",
  "\0",
  "virtual:",
  "http:",
  "https:",
  "data:",
  "node:",
];

function parseSpecifier(specifier) {
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) {
    return {
      packageName: parts.slice(0, 2).join("/"),
      directory: `${parts[0].slice(1)}--${parts[1]}`,
      subpath: parts.slice(2).join("/"),
    };
  }
  return {
    packageName: parts[0],
    directory: parts[0],
    subpath: parts.slice(1).join("/"),
  };
}

async function firstExisting(candidates) {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

/**
 * Resolves an npm package installed by Composer Asset Packagist.
 *
 * @param {string} specifier
 * @param {{ composerAssetsDir: string }} config
 */
export async function resolveComposerAsset(specifier, config) {
  if (
    SKIPPED_PREFIXES.some((prefix) => specifier.startsWith(prefix)) ||
    path.isAbsolute(specifier)
  ) {
    return null;
  }
  try {
    return require.resolve(specifier, {
      paths: [config.projectRoot ?? process.cwd()],
    });
  } catch {}

  const parsed = parseSpecifier(specifier);
  const packageRoot = path.join(config.composerAssetsDir, parsed.directory);
  const packageJsonPath = path.join(packageRoot, "package.json");
  let packageJson;
  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new DrupalAssetsError(
      "INVALID_PACKAGE_JSON",
      `Invalid package metadata: ${packageJsonPath}`,
      {
        cause: error,
      },
    );
  }

  let exported;
  if (packageJson.exports) {
    const key = parsed.subpath ? `./${parsed.subpath}` : ".";
    const matches = resolveExports(packageJson, key, {
      conditions: ["import", "browser", "default", "style"],
    });
    exported = matches?.[0];
  }
  const candidates = [];
  if (exported) candidates.push(path.resolve(packageRoot, exported));
  if (parsed.subpath) candidates.push(path.join(packageRoot, parsed.subpath));
  else {
    if (packageJson.style)
      candidates.push(path.join(packageRoot, packageJson.style));
    if (packageJson.module)
      candidates.push(path.join(packageRoot, packageJson.module));
    if (packageJson.main)
      candidates.push(path.join(packageRoot, packageJson.main));
    candidates.push(path.join(packageRoot, "index.js"));
  }
  const expanded = candidates.flatMap((candidate) => [
    candidate,
    `${candidate}.js`,
    `${candidate}.mjs`,
    `${candidate}.css`,
    path.join(candidate, "index.js"),
  ]);
  const resolved = await firstExisting(expanded);
  if (!resolved) {
    throw new DrupalAssetsError(
      "COMPOSER_ASSET_NOT_FOUND",
      `Composer asset "${specifier}" exists at ${packageRoot}, but its requested entry could not be resolved`,
    );
  }
  return resolved;
}

export function composerAssetPlugin(config) {
  return {
    name: "drupal-composer-assets",
    async resolveId(source) {
      return resolveComposerAsset(source, config);
    },
  };
}

export { parseSpecifier };
