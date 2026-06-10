import { build as viteBuild, createServer } from "vite";
import { cleanManagedOutput } from "./clean.js";
import { loadConfig } from "./config.js";
import { createDevViteConfig, sourceDevUrl } from "./dev-config.js";
import { discoverEntries, discoverExtensions } from "./discovery.js";
import { DrupalAssetsError } from "./errors.js";
import { copyStaticAssets } from "./static-assets.js";
import { createViteConfig } from "./vite-config.js";
import { startWatch } from "./watch.js";

async function prepare(options = {}) {
  const config = options.config ?? (await loadConfig(options));
  const extensions = await discoverExtensions(config);
  return { config, extensions };
}

/**
 * Runs a production build for every discovered Drupal extension.
 *
 * @param {object} [options]
 */
export async function build(options = {}) {
  const { config, extensions } = await prepare(options);
  for (const extension of extensions) {
    const entries = await discoverEntries(extension);
    await cleanManagedOutput(extension, config);
    if (entries.scss.length || entries.js.length) {
      await viteBuild(
        createViteConfig(extension, entries, config, { mode: "production" }),
      );
    }
    await copyStaticAssets(extension, entries, config);
  }
  return { config, extensions };
}

/**
 * Runs development builds and reconciles newly added or deleted entries.
 *
 * @param {object} [options]
 */
export async function watch(options = {}) {
  const { config } = await prepare(options);
  return startWatch(config);
}

/**
 * Starts a Vite server for Drupal libraries configured with external module URLs.
 *
 * @param {object} [options]
 */
export async function dev(options = {}) {
  const { config, extensions } = await prepare(options);
  const entries = [];
  for (const extension of extensions) {
    const discovered = await discoverEntries(extension);
    entries.push(...discovered.scss, ...discovered.js);
  }
  if (!entries.length) {
    throw new DrupalAssetsError(
      "NO_ENTRIES",
      "No SCSS or JavaScript entries were discovered",
    );
  }
  const server = await createServer(
    createDevViteConfig(extensions, config, entries),
  );
  await server.listen();
  server.printUrls();
  if (config.verbose) {
    for (const entry of entries) {
      console.log(`dev entry ${sourceDevUrl(entry.source, config)}`);
    }
  }
  return server;
}
