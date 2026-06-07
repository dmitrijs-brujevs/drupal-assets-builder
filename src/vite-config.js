import path from "node:path";
import fullReload from "vite-plugin-full-reload";
import { composerAssetAliases } from "./composer-aliases.js";
import { composerAssetPlugin } from "./composer-resolver.js";
import { mapSourceToOutput } from "./mapping.js";
import { classifyAsset, toPosix } from "./path-utils.js";

const RELOAD_PATTERNS = [
  "web/modules/custom/**/*.{twig,libraries.yml,info.yml,theme}",
  "web/themes/custom/**/*.{twig,libraries.yml,info.yml,theme}",
];

function inputName(entry, extension) {
  const mapping = mapSourceToOutput(entry.source, extension);
  return mapping.relative.replace(/\.(css|js)$/, "");
}

function assetFileName(assetInfo, extension, config) {
  const projectRoot = config.projectRoot ?? process.cwd();
  const original = assetInfo.originalFileNames?.[0];
  const originalPath = original
    ? path.isAbsolute(original)
      ? original
      : path.resolve(projectRoot, original)
    : null;
  if (originalPath) {
    try {
      return mapSourceToOutput(originalPath, extension).relative;
    } catch {}
    // Asset is outside the extension (e.g., imported from a Composer vendor package).
    // Use the path relative to composerAssetsDir to keep output names stable and
    // unique across packages — basename alone causes silent Vite deduplication.
    const type = classifyAsset(originalPath);
    if (type === "images" || type === "fonts") {
      const rel = path.relative(config.composerAssetsDir, originalPath);
      if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
        return toPosix(path.join(type, rel));
      }
      return `${type}/${path.basename(originalPath)}`;
    }
  }
  const name = assetInfo.name ?? "asset";
  const type = originalPath ? classifyAsset(originalPath) : classifyAsset(name);
  if (type === "images" || type === "fonts") {
    return `${type}/${path.basename(name)}`;
  }
  throw new Error(`Unsupported generated asset output: ${original ?? name}`);
}

/**
 * Creates a deterministic Vite configuration for one Drupal extension.
 *
 * @param {{ root: string, distRoot: string }} extension
 * @param {{ scss: object[], js: object[] }} entries
 * @param {object} config
 * @param {{ command?: 'build'|'serve', mode?: 'development'|'production' }} [options]
 */
export function createViteConfig(extension, entries, config, options = {}) {
  const mode = options.mode ?? "production";
  const input = {};
  for (const entry of [...entries.scss, ...entries.js]) {
    input[inputName(entry, extension)] = entry.source;
  }
  return {
    configFile: false,
    root: config.projectRoot,
    base: "./",
    mode,
    resolve: {
      alias: [
        ...Object.entries(config.aliases).map(([find, replacement]) => ({
          find,
          replacement,
        })),
        ...composerAssetAliases(config),
      ],
    },
    plugins: [
      composerAssetPlugin(config),
      fullReload(
        RELOAD_PATTERNS.map((pattern) =>
          path.join(config.webRoot, pattern.replace(/^web\//, "")),
        ),
        { root: config.projectRoot, always: false },
      ),
    ],
    server: {
      host: config.devServer.host,
      port: config.devServer.port,
      origin: config.devServer.origin,
    },
    css: {
      devSourcemap: Boolean(config.sourcemap.development),
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
          loadPaths: [
            extension.root,
            extension.assetsRoot,
            ...config.sass.loadPaths,
          ],
          additionalData: config.sass.additionalData,
        },
      },
    },
    build: {
      outDir: extension.distRoot,
      emptyOutDir: false,
      assetsInlineLimit: 0,
      cssCodeSplit: true,
      sourcemap:
        mode === "production"
          ? config.sourcemap.production
          : config.sourcemap.development,
      cssMinify: config.minify.css ? "lightningcss" : false,
      minify: config.minify.js ? "esbuild" : false,
      rollupOptions: {
        input,
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "js/chunks/[name].js",
          assetFileNames: (assetInfo) =>
            assetFileName(assetInfo, extension, config),
        },
        onLog(level, log, handler) {
          handler(level, log);
        },
      },
    },
    customLogger: config.verbose
      ? undefined
      : {
          info() {},
          warn(message) {
            console.warn(message);
          },
          warnOnce(message) {
            console.warn(message);
          },
          error(message) {
            console.error(message);
          },
          clearScreen() {},
          hasErrorLogged() {
            return false;
          },
          hasWarned: false,
        },
  };
}

export { RELOAD_PATTERNS, assetFileName, inputName };
