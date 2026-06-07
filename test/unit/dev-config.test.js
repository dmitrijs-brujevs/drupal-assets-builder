import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createDevViteConfig, sourceDevUrl } from "../../src/dev-config.js";

test("creates project-relative Vite URLs and extension Sass load paths", () => {
  const projectRoot = path.resolve("/tmp/project");
  const extension = {
    root: path.join(projectRoot, "web/modules/custom/catalog"),
    assetsRoot: path.join(projectRoot, "web/modules/custom/catalog/assets"),
  };
  const config = {
    projectRoot,
    webRoot: path.join(projectRoot, "web"),
    composerAssetsDir: path.join(projectRoot, "vendor/npm-asset"),
    aliases: {},
    devServer: { host: "localhost", port: 5173 },
    sourcemap: { development: true },
    sass: { loadPaths: [], additionalData: "" },
  };
  const viteConfig = createDevViteConfig([extension], config);
  assert.equal(
    sourceDevUrl(path.join(extension.assetsRoot, "js/main.js"), config),
    "/web/modules/custom/catalog/assets/js/main.js",
  );
  assert.ok(
    viteConfig.css.preprocessorOptions.scss.loadPaths.includes(extension.root),
  );
});
