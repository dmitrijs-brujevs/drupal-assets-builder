import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function packageBinary(packageName, relativePath) {
  return path.join(
    path.dirname(require.resolve(`${packageName}/package.json`)),
    relativePath,
  );
}

const BINARIES = {
  eslint: packageBinary("eslint", "bin/eslint.js"),
  stylelint: packageBinary("stylelint", "bin/stylelint.mjs"),
  prettier: packageBinary("prettier", "bin/prettier.cjs"),
};

function runTool(tool, args, projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BINARIES[tool], ...args], {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${tool} terminated by ${signal}`));
      else resolve(code ?? 1);
    });
  });
}

export async function runQuality(command, config) {
  const javascriptPatterns = [
    path.join(config.webRoot, "modules/custom/**/*.js"),
    path.join(config.webRoot, "themes/custom/**/*.js"),
  ];
  const scssPatterns = [
    path.join(config.webRoot, "modules/custom/**/*.scss"),
    path.join(config.webRoot, "themes/custom/**/*.scss"),
  ];
  const formatPatterns = [
    path.join(config.webRoot, "modules/custom/**/*.{js,scss,json,yml,yaml,md}"),
    path.join(config.webRoot, "themes/custom/**/*.{js,scss,json,yml,yaml,md}"),
  ];
  const globOptions = {
    absolute: true,
    nodir: true,
    follow: false,
    ignore: path.join(config.webRoot, "**/dist/**"),
  };
  const [javascript, scss, formatFiles] = await Promise.all([
    glob(javascriptPatterns, globOptions),
    glob(scssPatterns, globOptions),
    glob(formatPatterns, globOptions),
  ]);

  if (command === "lint" || command === "lint:fix") {
    const fix = command.endsWith(":fix") ? ["--fix"] : [];
    if (javascript.length) {
      const eslintCode = await runTool(
        "eslint",
        [
          "--config",
          path.join(packageRoot, "eslint.config.js"),
          ...fix,
          ...javascript,
        ],
        config.projectRoot,
      );
      if (eslintCode) return eslintCode;
    }
    if (scss.length) {
      return runTool(
        "stylelint",
        [
          "--config",
          path.join(packageRoot, "stylelint.config.js"),
          ...fix,
          ...scss,
        ],
        config.projectRoot,
      );
    }
    return 0;
  }

  if (!formatFiles.length) return 0;
  return runTool(
    "prettier",
    [command === "format:fix" ? "--write" : "--check", ...formatFiles],
    config.projectRoot,
  );
}
