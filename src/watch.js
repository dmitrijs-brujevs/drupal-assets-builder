import path from "node:path";
import chokidar from "chokidar";
import { build as viteBuild } from "vite";
import { cleanManagedOutput } from "./clean.js";
import {
  discoverEntries,
  discoverExtensions,
  extensionFromAsset,
} from "./discovery.js";
import { classifyAsset } from "./path-utils.js";
import { copyStaticAssets, deleteStaticOutput } from "./static-assets.js";
import { createViteConfig } from "./vite-config.js";

async function buildExtension(extension, config, directories) {
  const entries = await discoverEntries(extension);
  if (directories) {
    await cleanManagedOutput(extension, { ...config, directories });
  }
  if (entries.scss.length || entries.js.length) {
    await viteBuild(
      createViteConfig(extension, entries, config, { mode: "development" }),
    );
  }
  await copyStaticAssets(extension, entries, config);
}

export async function startWatch(config) {
  const initialExtensions = await discoverExtensions(config);
  for (const extension of initialExtensions) {
    await buildExtension(extension, config, ["css", "js", "images", "fonts"]);
  }

  const roots = [config.webRoot];
  const pending = new Map();
  const watcher = chokidar.watch(roots, {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: (candidate) => {
      const relative = path.relative(config.webRoot, candidate);
      const segments = relative.split(path.sep).filter(Boolean);
      if (segments.includes("dist") || segments.includes("node_modules"))
        return true;
      if (segments[0] && !["modules", "themes"].includes(segments[0]))
        return true;
      return Boolean(segments[1] && segments[1] !== "custom");
    },
  });

  function schedule(source, event) {
    if (config.verbose) console.log(`watch ${event} ${source}`);
    const extension = extensionFromAsset(config.webRoot, source);
    const type = classifyAsset(source);
    if (!extension || !type) return;
    const isCode = type === "scss" || type === "js";
    const key = isCode
      ? `${extension.root}:code`
      : `${extension.root}:${source}`;
    clearTimeout(pending.get(key));
    pending.set(
      key,
      setTimeout(() => {
        pending.delete(key);
        reconcile(extension, source, type, event).catch((error) => {
          console.error(error instanceof Error ? error.message : error);
        });
      }, 50),
    );
  }
  async function reconcile(extension, source, type, event) {
    if ((type === "images" || type === "fonts") && event === "unlink") {
      await deleteStaticOutput(source, extension);
      return;
    }
    const extensions = await discoverExtensions(config);
    const current = extensions.find((item) => item.root === extension.root);
    if (!current) {
      if (event === "unlink") {
        await deleteStaticOutput(source, extension);
      }
      return;
    }
    if (type === "images" || type === "fonts") {
      const entries = await discoverEntries(current);
      await copyStaticAssets(current, entries, config);
      return;
    }
    await buildExtension(current, config, ["css", "js"]);
  }

  watcher
    .on("add", (source) => schedule(source, "add"))
    .on("change", (source) => schedule(source, "change"))
    .on("unlink", (source) => schedule(source, "unlink"));

  await new Promise((resolve) => watcher.once("ready", resolve));

  return {
    async close() {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      await watcher.close();
    },
  };
}
