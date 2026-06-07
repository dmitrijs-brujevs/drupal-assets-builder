# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vite 8-based asset builder for Drupal projects. It discovers all custom modules and themes with assets and builds them in a single pipeline — one `package.json`, one `node_modules`, no per-extension Vite config. Assets are output alongside each extension (not centralized). Output filenames have no content hashes so Drupal library URLs remain stable.

## Commands

```bash
# Development
npm test                  # Run all tests (unit + integration)
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run lint              # ESLint + Stylelint
npm run lint:fix          # Fix lint errors
npm run format            # Check with Prettier
npm run format:fix        # Fix formatting
npm run build             # Build the fixture project
npm run check             # Run all: test, lint, format, build, validate
```

To run a single test file:

```bash
node --test test/unit/discovery.test.js
```

The CLI (used by consumers of this package):

```bash
drupal-assets build       # Production build for all discovered extensions
drupal-assets dev         # Vite dev server with HMR
drupal-assets watch       # Development build with file watching
drupal-assets lint        # Check code quality
drupal-assets format      # Check formatting
```

## Architecture

### Entry Points

- **`bin/drupal-assets.js`** → **`src/cli.js`**: Parses args, loads config, routes to builder or quality tools.
- **`src/index.js`**: Public API for programmatic use.

### Core Pipeline

1. **Discovery** (`src/discovery.js`): Scans `web/{modules,themes}/custom/**/assets/{scss,js,images,fonts}/**/*` to find extensions and their entries. Sass partials (files starting with `_`) and files under `scss/abstracts/` are excluded as entry points — they are dependencies. Symlinked extensions are skipped for safety.

2. **Mapping** (`src/mapping.js`): Maps each source asset to its deterministic output path (e.g., `scss/components/card.scss` → `dist/css/components/card.css`). Detects output collisions before building.

3. **Building** (`src/builder.js` + `src/vite-config.js`): Runs a separate Vite instance per extension. CSS is processed by Sass Embedded and minified by Lightning CSS. JS minification is **off by default** to preserve `Drupal.t()` translation calls.

4. **Static Assets** (`src/static-assets.js`): Images and fonts are copied directly; they are not processed by Vite.

5. **Cleanup** (`src/clean.js`): Before each build, only managed subdirectories (`dist/css`, `dist/js`, `dist/images`, `dist/fonts`) are removed. Includes symlink and path-escape safety checks.

### Configuration (`src/config.js`)

Config file: `drupal-assets.config.js` in project root (optional). Key options:

- `webRoot`: Drupal web root directory (default: `"web"`)
- `composerAssetsDir`: Path to Composer npm-asset packages (default: `"vendor/npm-asset"`)
- `include` / `exclude`: Glob patterns to filter which extensions are built
- `devServer`: Host, port, origin for the Vite dev server
- `minify`: Toggle CSS/JS minification per environment
- `sass.loadPaths` / `sass.additionalData`: Shared Sass configuration
- `aliases`: Additional Vite module resolution aliases

### Composer Asset Resolution (`src/composer-resolver.js`)

Handles npm packages installed via Composer Asset Packagist. Package `@scope/name` maps to directory `vendor/npm-asset/scope--name/`. Node resolution is tried first; Composer resolution is a fallback. Vite aliases are generated via `src/composer-aliases.js`.

### Watch Mode (`src/watch.js`)

Uses chokidar to monitor `web/`. On file change, reconciles the entry list and rebuilds only the affected extension. Changes are debounced at 50ms to batch rapid updates. Handles static asset deletion by removing the corresponding dist file.

### Quality Tools (`src/quality-tools.js`)

Spawns ESLint, Stylelint, and Prettier as child processes using the binaries bundled with this package (not system versions). Discovers files in `web/{modules,themes}/custom/**`, excluding `dist/` directories.

### Testing

Uses Node's built-in test runner. Unit tests are in `test/unit/`. Integration tests in `test/integration/` run against `fixtures/drupal-project/`, a realistic Drupal project with sample modules, themes, and mock `vendor/npm-asset/` packages.
