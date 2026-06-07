import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function composerAssetAliases(config) {
  let directories;
  try {
    directories = readdirSync(config.composerAssetsDir, {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  const aliases = [];
  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const packageRoot = path.join(config.composerAssetsDir, directory.name);
    try {
      const packageJson = JSON.parse(
        readFileSync(path.join(packageRoot, "package.json"), "utf8"),
      );
      if (!packageJson.name) continue;
      try {
        require.resolve(packageJson.name, { paths: [config.projectRoot] });
        continue;
      } catch {}
      aliases.push({ find: packageJson.name, replacement: packageRoot });
    } catch {}
  }
  return aliases;
}
