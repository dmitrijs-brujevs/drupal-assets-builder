import { execFileSync } from "node:child_process";

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
  shell: false,
});
const [manifest] = JSON.parse(output);
const files = manifest.files.map((file) => file.path);
const forbidden = files.filter(
  (file) =>
    file.startsWith("fixtures/") ||
    file.startsWith("node_modules/") ||
    file.includes(".env") ||
    file.includes("/dist/"),
);
if (forbidden.length) {
  throw new Error(`Forbidden files in npm package: ${forbidden.join(", ")}`);
}
for (const required of [
  "bin/drupal-assets.js",
  "src/index.js",
  "README.md",
  "LICENSE",
]) {
  if (!files.includes(required))
    throw new Error(`Required package file is missing: ${required}`);
}
console.log(`Package contains ${files.length} validated files.`);
