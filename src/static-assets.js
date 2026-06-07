import path from "node:path";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { DrupalAssetsError } from "./errors.js";
import { detectOutputCollisions, mapSourceToOutput } from "./mapping.js";

async function sameContents(left, right) {
  try {
    const [leftBuffer, rightBuffer] = await Promise.all([
      readFile(left),
      readFile(right),
    ]);
    return leftBuffer.equals(rightBuffer);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function copyStaticAssets(extension, entries, options = {}) {
  const mappings = detectOutputCollisions(
    [...entries.images, ...entries.fonts].map((entry) =>
      mapSourceToOutput(entry.source, extension),
    ),
  );
  for (const mapping of mappings) {
    await mkdir(path.dirname(mapping.output), { recursive: true });
    if (await sameContents(mapping.source, mapping.output)) continue;
    if (options.claimedOutputs?.has(mapping.output)) {
      throw new DrupalAssetsError(
        "FILE_NAME_CONFLICT",
        `Static asset conflicts with generated output: ${mapping.output}`,
      );
    }
    await copyFile(mapping.source, mapping.output);
    if (options.verbose)
      (options.logger ?? console).log(
        `copy ${mapping.source} -> ${mapping.output}`,
      );
  }
  return mappings;
}

export async function deleteStaticOutput(sourcePath, extension) {
  const mapping = mapSourceToOutput(sourcePath, extension);
  await rm(mapping.output, { force: true });
  return mapping;
}
