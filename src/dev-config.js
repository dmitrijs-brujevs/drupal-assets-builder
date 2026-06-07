import path from "node:path";
import fullReload from "vite-plugin-full-reload";
import { composerAssetAliases } from "./composer-aliases.js";
import { composerAssetPlugin } from "./composer-resolver.js";
import { toPosix } from "./path-utils.js";
import { RELOAD_PATTERNS } from "./vite-config.js";

export function createDevViteConfig(extensions, config) {
  return {
    configFile: false,
    root: config.projectRoot,
    base: "/",
    mode: "development",
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
      strictPort: true,
    },
    css: {
      devSourcemap: Boolean(config.sourcemap.development),
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
          loadPaths: [
            ...extensions.flatMap((extension) => [
              extension.root,
              extension.assetsRoot,
            ]),
            ...config.sass.loadPaths,
          ],
          additionalData: config.sass.additionalData,
        },
      },
    },
  };
}

export function sourceDevUrl(source, config) {
  return `/${toPosix(path.relative(config.projectRoot, source))}`;
}
