import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, dev, watch } from "./builder.js";
import { loadConfig } from "./config.js";
import { DrupalAssetsError } from "./errors.js";
import { runQuality } from "./quality-tools.js";

const packageJson = JSON.parse(
  fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    ),
    "utf8",
  ),
);

const HELP = `Usage: drupal-assets <command> [options]

Commands:
  build       Build production assets
  dev         Start the Vite development server
  watch       Build and watch assets
  lint        Run ESLint and Stylelint
  lint:fix    Run linters with fixes
  format      Check formatting with Prettier
  format:fix  Format files with Prettier

Options:
  --root <path>      Drupal project root (default: current directory)
  --web-root <path>  Drupal web root
  --config <path>    Config file path
  --verbose          Enable verbose logging
  --help             Show help
  --version          Show version`;

function parseArguments(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--version" || argument === "-v")
      options.version = true;
    else if (argument === "--verbose") options.verbose = true;
    else if (["--root", "--web-root", "--config"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new DrupalAssetsError(
          "INVALID_ARGUMENT",
          `${argument} requires a value`,
        );
      }
      options[
        argument
          .slice(2)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      ] = value;
      index += 1;
    } else if (argument.startsWith("-")) {
      throw new DrupalAssetsError(
        "INVALID_ARGUMENT",
        `Unknown option: ${argument}`,
      );
    } else positional.push(argument);
  }
  return { command: positional[0], options };
}

function installSignalHandlers(resource) {
  let closing = false;
  const close = async (signal) => {
    if (closing) return;
    closing = true;
    try {
      await resource.close();
      process.exitCode = signal === "SIGINT" ? 130 : 143;
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => close("SIGINT"));
  process.once("SIGTERM", () => close("SIGTERM"));
}

export async function runCli(argv) {
  const { command, options } = parseArguments(argv);
  if (options.version) return console.log(packageJson.version);
  if (options.help || !command) return console.log(HELP);
  const projectRoot = path.resolve(options.root ?? process.cwd());
  const overrides = {
    ...(options.webRoot ? { webRoot: options.webRoot } : {}),
    ...(options.verbose ? { verbose: true } : {}),
  };
  const config = await loadConfig({
    projectRoot,
    configPath: options.config,
    overrides,
  });
  if (command === "build") return build({ config });
  if (command === "dev") {
    const server = await dev({ config });
    installSignalHandlers(server);
    return server;
  }
  if (command === "watch") {
    const watcher = await watch({ config });
    installSignalHandlers(watcher);
    return watcher;
  }
  if (["lint", "lint:fix", "format", "format:fix"].includes(command)) {
    const code = await runQuality(command, config);
    if (code) process.exitCode = code;
    return;
  }
  throw new DrupalAssetsError(
    "UNKNOWN_COMMAND",
    `Unknown command: ${command}\n\n${HELP}`,
  );
}

export { HELP, parseArguments };
