import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { glob } from "glob";
import { discoverExtensions } from "./discovery.js";

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

const PROJECT_STYLELINT_CONFIGS = [
  "stylelint.config.js",
  "stylelint.config.mjs",
  "stylelint.config.cjs",
  ".stylelintrc",
  ".stylelintrc.json",
  ".stylelintrc.yml",
  ".stylelintrc.yaml",
  ".stylelintrc.js",
  ".stylelintrc.cjs",
  ".stylelintrc.mjs",
];

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

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function firstExisting(projectRoot, candidates) {
  for (const candidate of candidates) {
    const filePath = path.resolve(projectRoot, candidate);
    if (await fileExists(filePath)) return filePath;
  }
  return null;
}

async function stylelintConfig(config) {
  return (
    config.quality.stylelintConfig ??
    (await firstExisting(config.projectRoot, PROJECT_STYLELINT_CONFIGS)) ??
    path.join(packageRoot, "stylelint.config.js")
  );
}

async function qualityFiles(config) {
  const extensions = await discoverExtensions(config);
  const javascriptPatterns = extensions.map((extension) =>
    path.join(extension.root, "**/*.js"),
  );
  const scssPatterns = extensions.map((extension) =>
    path.join(extension.root, "**/*.scss"),
  );
  const formatPatterns = extensions.map((extension) =>
    path.join(extension.root, "**/*.{js,scss,json,yml,yaml,md}"),
  );
  const globOptions = {
    absolute: true,
    nodir: true,
    follow: false,
    ignore: path.join(config.webRoot, "**/dist/**"),
  };

  return Promise.all([
    glob(javascriptPatterns, globOptions),
    glob(scssPatterns, globOptions),
    glob(formatPatterns, globOptions),
  ]);
}

export async function runQuality(command, config) {
  const [javascript, scss, formatFiles] = await qualityFiles(config);

  if (command === "lint" || command === "lint:fix") {
    const fix = command.endsWith(":fix") ? ["--fix"] : [];
    if (javascript.length) {
      const eslintCode = await runTool(
        "eslint",
        [
          "--config",
          config.quality.eslintConfig ??
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
        ["--config", await stylelintConfig(config), ...fix, ...scss],
        config.projectRoot,
      );
    }
    return 0;
  }

  if (!formatFiles.length) return 0;
  return runTool(
    "prettier",
    [
      ...(config.quality.prettierConfig
        ? ["--config", config.quality.prettierConfig]
        : []),
      command === "format:fix" ? "--write" : "--check",
      ...formatFiles,
    ],
    config.projectRoot,
  );
}
