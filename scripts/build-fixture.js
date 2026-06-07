import path from "node:path";
import { build } from "../src/index.js";

await build({
  projectRoot: process.cwd(),
  configPath: path.join(process.cwd(), "drupal-assets.config.js"),
});
