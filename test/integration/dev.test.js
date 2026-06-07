import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { dev, loadConfig } from "../../src/index.js";
async function availablePort() {
  const server = createNetServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  assert.ok(address && typeof address === "object");
  return address.port;
}

test("dev serves Vite client and Drupal source entry modules", async () => {
  const projectRoot = process.cwd();
  const config = await loadConfig({
    projectRoot,
    configPath: path.join(projectRoot, "drupal-assets.config.js"),
    overrides: {
      devServer: {
        host: "127.0.0.1",
        port: await availablePort(),
        origin: undefined,
      },
    },
  });
  const server = await dev({ config });
  try {
    const address = server.httpServer.address();
    assert.ok(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;
    for (const url of [
      "/@vite/client",
      "/fixtures/drupal-project/web/modules/custom/catalog/assets/js/main.js",
      "/fixtures/drupal-project/web/modules/custom/catalog/assets/scss/main.scss",
    ]) {
      const response = await fetch(`${origin}${url}`);
      assert.equal(response.status, 200, url);
      assert.ok((await response.text()).length > 0, url);
    }
  } finally {
    await server.close();
  }
});
