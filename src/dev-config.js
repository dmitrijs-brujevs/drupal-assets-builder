import path from "node:path";
import fullReload from "vite-plugin-full-reload";
import { composerAssetAliases } from "./composer-aliases.js";
import { composerAssetPlugin } from "./composer-resolver.js";
import { toPosix } from "./path-utils.js";
import { RELOAD_PATTERNS } from "./vite-config.js";

function createDrupalDevSourcePlugin(extensions, entries) {
  const assetRoots = extensions.map((extension) =>
    path.resolve(extension.assetsRoot),
  );
  const entrySources = entries.map((entry) => path.resolve(entry.source));
  const watchedPaths = [...assetRoots, ...entrySources];

  function isDrupalAsset(file) {
    const resolved = path.resolve(file);
    return assetRoots.some(
      (assetRoot) =>
        resolved === assetRoot ||
        resolved.startsWith(`${assetRoot}${path.sep}`),
    );
  }

  return {
    name: "drupal-assets-dev-source-invalidation",
    configureServer(server) {
      server.watcher.add(watchedPaths);
      server.watcher.on("change", (file) => {
        if (!isDrupalAsset(file)) return;

        for (const environment of Object.values(server.environments)) {
          const { moduleGraph } = environment;
          moduleGraph.onFileChange(file);

          for (const source of entrySources) {
            const modules = moduleGraph.getModulesByFile(source) ?? [];
            for (const module of modules) {
              moduleGraph.invalidateModule(module);
            }
          }
        }

        server.ws.send({ type: "full-reload", path: "*" });
      });
    },
  };
}

export function createDevViteConfig(extensions, config, entries = []) {
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
      createDrupalDevSourcePlugin(extensions, entries),
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
