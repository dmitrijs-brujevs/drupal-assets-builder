import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
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

async function waitForText(url, pattern, timeout = 2000) {
  const deadline = Date.now() + timeout;
  let text = "";
  while (Date.now() < deadline) {
    text = await (await fetch(url)).text();
    if (pattern.test(text)) return text;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return text;
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

test("dev invalidates source entry modules when files change", async () => {
  const projectRoot = process.cwd();
  const source = path.join(
    projectRoot,
    "fixtures/drupal-project/web/modules/custom/catalog/assets/scss/main.scss",
  );
  const original = await readFile(source, "utf8");
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
    const url =
      "/fixtures/drupal-project/web/modules/custom/catalog/assets/scss/main.scss";

    const before = await (await fetch(`${origin}${url}`)).text();
    assert.match(before, /color: #175cd3/);

    await writeFile(
      source,
      original.replace("color: $catalog-color;", "color: red;"),
    );
    const after = await waitForText(`${origin}${url}`, /color: red/);
    assert.match(after, /color: red/);
  } finally {
    await writeFile(source, original);
    await server.close();
  }
});
