import path from "node:path";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { DrupalAssetsError, wrapError } from "./errors.js";

export const DEFAULT_CONFIG = Object.freeze({
  webRoot: "web",
  composerAssetsDir: "vendor/npm-asset",
  include: [],
  exclude: [],
  devServer: {
    host: "localhost",
    port: 5173,
    origin: undefined,
  },
  sourcemap: {
    development: true,
    production: false,
  },
  minify: {
    css: true,
    js: false,
  },
  sass: {
    loadPaths: [],
    additionalData: "",
  },
  aliases: {},
  images: {
    optimize: false,
  },
  quality: {
    eslintConfig: null,
    prettierConfig: null,
    stylelintConfig: null,
  },
  verbose: false,
});

function mergeConfig(base, override) {
  return {
    ...base,
    ...override,
    devServer: { ...base.devServer, ...override.devServer },
    sourcemap: { ...base.sourcemap, ...override.sourcemap },
    minify: { ...base.minify, ...override.minify },
    sass: { ...base.sass, ...override.sass },
    aliases: { ...base.aliases, ...override.aliases },
    images: { ...base.images, ...override.images },
    quality: { ...base.quality, ...override.quality },
  };
}

/**
 * Loads and normalizes drupal-assets.config.js.
 *
 * @param {{ projectRoot?: string, configPath?: string, overrides?: object }} [options]
 */
export async function loadConfig(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const configPath = path.resolve(
    projectRoot,
    options.configPath ?? "drupal-assets.config.js",
  );
  let fileConfig = {};
  try {
    await access(configPath);
    const imported = await import(
      `${pathToFileURL(configPath).href}?t=${Date.now()}`
    );
    if (
      !imported.default ||
      typeof imported.default !== "object" ||
      Array.isArray(imported.default)
    ) {
      throw new DrupalAssetsError(
        "INVALID_CONFIG",
        `Config must export a default object: ${configPath}`,
      );
    }
    fileConfig = imported.default;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw wrapError(
        "CONFIG_LOAD_FAILED",
        `Unable to load config ${configPath}`,
        error,
      );
    }
  }

  const config = mergeConfig(
    mergeConfig(DEFAULT_CONFIG, fileConfig),
    options.overrides ?? {},
  );
  return {
    ...config,
    projectRoot,
    configPath,
    webRoot: path.resolve(projectRoot, config.webRoot),
    composerAssetsDir: path.resolve(projectRoot, config.composerAssetsDir),
    sass: {
      ...config.sass,
      loadPaths: config.sass.loadPaths.map((entry) =>
        path.resolve(projectRoot, entry),
      ),
    },
    quality: {
      ...config.quality,
      eslintConfig: config.quality.eslintConfig
        ? path.resolve(projectRoot, config.quality.eslintConfig)
        : null,
      prettierConfig: config.quality.prettierConfig
        ? path.resolve(projectRoot, config.quality.prettierConfig)
        : null,
      stylelintConfig: config.quality.stylelintConfig
        ? path.resolve(projectRoot, config.quality.stylelintConfig)
        : null,
    },
  };
}

export { mergeConfig };
