import path from "node:path";
import { DrupalAssetsError } from "./errors.js";
import { assertInside, classifyAsset, toPosix } from "./path-utils.js";

/**
 * Maps an extension source asset to its deterministic dist path.
 *
 * @param {string} sourcePath
 * @param {{ root: string, assetsRoot?: string, distRoot?: string }} extension
 */
export function mapSourceToOutput(sourcePath, extension) {
  const assetsRoot =
    extension.assetsRoot ?? path.join(extension.root, "assets");
  const distRoot = extension.distRoot ?? path.join(extension.root, "dist");
  const source = path.resolve(sourcePath);
  assertInside(assetsRoot, source, "source asset");
  const relative = path.relative(assetsRoot, source);
  const [directory, ...rest] = relative.split(path.sep);
  const type = classifyAsset(source);
  if (!type || directory !== type) {
    throw new DrupalAssetsError(
      "UNSUPPORTED_ASSET",
      `Unsupported asset path: ${sourcePath}`,
    );
  }
  let outputRelative = path.join(
    directory === "scss" ? "css" : directory,
    ...rest,
  );
  if (type === "scss")
    outputRelative = outputRelative.replace(/\.scss$/i, ".css");
  const output = path.resolve(distRoot, outputRelative);
  assertInside(extension.root, output, "output asset");
  return {
    type,
    source,
    output,
    relative: toPosix(outputRelative),
  };
}

export function detectOutputCollisions(mappings) {
  const outputs = new Map();
  for (const mapping of mappings) {
    const key =
      process.platform === "win32"
        ? mapping.output.toLowerCase()
        : mapping.output;
    const existing = outputs.get(key);
    if (existing && existing.source !== mapping.source) {
      throw new DrupalAssetsError(
        "FILE_NAME_CONFLICT",
        `Multiple sources map to ${mapping.output}: ${existing.source}, ${mapping.source}`,
      );
    }
    outputs.set(key, mapping);
  }
  return mappings;
}
