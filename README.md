# Drupal Assets Builder

[![CI](https://github.com/dmitrijs-brujevs/drupal-assets-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/dmitrijs-brujevs/drupal-assets-builder/actions/workflows/ci.yml)
[![CodeQL](https://github.com/dmitrijs-brujevs/drupal-assets-builder/actions/workflows/codeql.yml/badge.svg)](https://github.com/dmitrijs-brujevs/drupal-assets-builder/actions/workflows/codeql.yml)
[![npm](https://img.shields.io/npm/v/drupal-assets-builder.svg)](https://www.npmjs.com/package/drupal-assets-builder)
[![Node](https://img.shields.io/node/v/drupal-assets-builder.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A single Vite 8 builder for all custom modules and themes in a Drupal project. Source files and
generated files remain beside each extension. The project has one `package.json`, one
`node_modules`, and no per-extension Vite configuration.

## Requirements

- Node.js 22.14 or newer
- npm 11.5.1 or newer
- A Drupal project whose web root is `web` by default

## Installation

Install from the public npm registry:

```sh
npm install --save-dev drupal-assets-builder
```

Installation directly from GitHub is also possible for testing unreleased commits:

```sh
npm install --save-dev github:dmitrijs-brujevs/drupal-assets-builder
```

Add project scripts:

```json
{
  "scripts": {
    "build": "drupal-assets build",
    "dev": "drupal-assets dev",
    "watch": "drupal-assets watch",
    "lint": "drupal-assets lint",
    "lint:fix": "drupal-assets lint:fix",
    "format": "drupal-assets format",
    "format:fix": "drupal-assets format:fix"
  }
}
```

## Extension Structure

The builder discovers supported files below both `web/modules/custom` and `web/themes/custom`,
including nested extensions:

```text
web/modules/custom/catalog/
  assets/
    scss/main.scss
    scss/components/card.scss
    js/main.js
    images/icons/search.svg
    fonts/inter/Inter-Regular.woff2
  dist/
    css/main.css
    css/components/card.css
    js/main.js
    images/icons/search.svg
    fonts/inter/Inter-Regular.woff2
```

Sass files beginning with `_` and files below `assets/scss/abstracts` are dependencies, not entry
points. Nested source paths are preserved. Output names never contain content hashes.

## CLI

```text
drupal-assets build
drupal-assets dev
drupal-assets watch
drupal-assets lint
drupal-assets lint:fix
drupal-assets format
drupal-assets format:fix
drupal-assets --help
drupal-assets --version
```

All commands accept `--root <path>`, `--web-root <path>`, `--config <path>`, and `--verbose`.

- `build` safely cleans only managed `dist/css`, `dist/js`, `dist/images`, and `dist/fonts`
  directories, then runs production builds.
- `dev` starts Vite for projects that explicitly load `@vite/client` and source entry URLs from a
  Drupal development library. That integration enables HMR and full reload.
- `watch` writes development builds to `dist`, discovers new entries and extensions, and removes
  outputs when source files are deleted.

JavaScript minification is disabled by default so Drupal's locale scanner can see calls such as
`Drupal.t('Message')` and `Drupal.formatPlural(...)`. CSS is minified with Lightning CSS in
production.

## Configuration

Configuration is optional. Create `drupal-assets.config.js` in the project root:

```js
export default {
  webRoot: "web",
  composerAssetsDir: "vendor/npm-asset",
  include: [],
  exclude: [],
  devServer: {
    host: "0.0.0.0",
    port: 5175,
    origin: "http://localhost:5175",
  },
  sourcemap: {
    development: true,
    production: false,
  },
  minify: {
    css: true,
    js: false,
  },
  sass: {
    loadPaths: [],
    additionalData: "",
  },
  aliases: {},
  images: {
    optimize: false,
  },
  quality: {
    eslintConfig: null,
    prettierConfig: null,
    stylelintConfig: null,
  },
  verbose: false,
};
```

Paths are resolved from the project root. The config is an executable JavaScript module and must be
treated as trusted project code. The builder does not provide a sandbox for config evaluation.
Image optimization is reserved for an opt-in implementation and is disabled by default.

`include` and `exclude` match extension roots relative to `webRoot`, such as
`modules/custom/catalog` or `themes/custom/example`. They apply consistently to asset builds,
watch mode, linting, and formatting.

Quality config paths are optional and project-relative. ESLint uses the builder config by default.
Stylelint uses the first project config it finds, falling back to the builder config. Prettier uses
its normal config discovery unless `quality.prettierConfig` is set explicitly.

## Sass, JavaScript, Images, and Fonts

Sass Embedded uses its modern compiler API and supports `@use`, `@forward`, partials, mixins,
functions, extension-relative imports, additional load paths, and global `additionalData`.

Each JavaScript file is an independent ES module entry. Drupal behaviors remain supported because
generated modules do not introduce shared global variables. Shared dependencies can produce ESM
imports between emitted files, so every production JavaScript entry must use `type: module`.

Imported and standalone images and fonts are emitted without hashes or inlining. Standalone files
used only by Twig are copied as well. Supported image extensions are PNG, JPEG, GIF, SVG, WebP,
AVIF, and ICO. Supported font extensions are WOFF, WOFF2, TTF, OTF, and EOT. CSS `url()` references
are rewritten to the deterministic output. Conflicting output names fail the build.

Twig can reference a standalone image directly:

```twig
<img src="/modules/custom/catalog/dist/images/icons/search.svg" alt="">
```

## Asset Packagist

Frontend packages installed through Composer are resolved from `vendor/npm-asset` after normal
Node resolution:

```sh
composer require npm-asset/swiper npm-asset/photoswipe npm-asset/tom-select
```

```js
import Swiper from "swiper";
import library from "@scope/package";
```

`swiper` resolves from `vendor/npm-asset/swiper`. A scoped package resolves from
`vendor/npm-asset/scope--package`. Package `exports`, `module`, `main`, subpaths, CSS, and asset
imports are supported. Override `composerAssetsDir` when Composer uses another installer path.

## Drupal Libraries

Generated files are connected manually. The builder never edits `libraries.yml`:

```yaml
catalog:
  css:
    component:
      dist/css/catalog.css: {}
  js:
    dist/js/catalog.js:
      attributes:
        type: module
  dependencies:
    - core/drupal
    - core/once
```

It does not run Drush, PHP, Composer, Drupal bootstrap, or cache rebuilds.

### Vite Development Server

`dev` does not rewrite Drupal library URLs and does not proxy Drupal. Create a development-only
library or local library override that loads Vite's client and source entries as external ES
modules:

```yaml
catalog.dev:
  js:
    http://localhost:5175/@vite/client:
      type: external
      attributes:
        type: module
    http://localhost:5175/web/modules/custom/catalog/assets/scss/main.scss:
      type: external
      attributes:
        type: module
    http://localhost:5175/web/modules/custom/catalog/assets/js/main.js:
      type: external
      attributes:
        type: module
  dependencies:
    - core/drupal
    - core/once
```

The URL path is the source path relative to `projectRoot`. Set `devServer.origin` to the browser
visible Vite origin. Without `@vite/client` and these external source URLs, Drupal continues to use
`dist` and HMR/full reload is not active; use `watch` for that workflow.

## Composer Proxy Scripts

A Drupal project may expose npm tasks through Composer:

```json
{
  "scripts": {
    "assets:install": "npm install",
    "assets:build": "npm run build",
    "assets:dev": "npm run dev",
    "assets:watch": "npm run watch",
    "assets:lint": "npm run lint",
    "assets:lint:fix": "npm run lint:fix",
    "assets:format": "npm run format",
    "assets:format:fix": "npm run format:fix"
  }
}
```

Do not put asset builds in `post-install-cmd` or `post-update-cmd`.

## Git Ignore

```gitignore
/node_modules/
/web/modules/custom/**/dist/
/web/themes/custom/**/dist/
```

## Programmatic API

The ESM package exports:

```js
import {
  build,
  cleanManagedOutput,
  createViteConfig,
  discoverEntries,
  discoverExtensions,
  loadConfig,
  mapSourceToOutput,
  resolveComposerAsset,
  watch,
} from "drupal-assets-builder";
```

Public functions include JSDoc and return structured extension, entry, and mapping objects.

## Security and Releases

npm requires a package to exist before Trusted Publishing can be configured. The first version is
therefore an explicitly approved, interactive 2FA bootstrap publish; later releases use OIDC.

Cleanup resolves and validates paths, refuses managed-directory symlinks, and never removes the
project, web, extension, or assets roots. See [SECURITY.md](SECURITY.md) for private vulnerability
reporting and [RELEASE.md](RELEASE.md) for npm Trusted Publishing through GitHub OIDC. No npm token
is stored in this repository.

## Troubleshooting

- **No entries found:** confirm the web root and the `assets/scss` or `assets/js` path.
- **Composer package not found:** confirm its directory under `vendor/npm-asset` and inspect its
  `package.json`.
- **Output conflict:** two sources map to the same extension-local path; rename one source.
- **Sass import fails:** use extension-relative paths or add a project-relative `sass.loadPaths`
  entry.
- **Port is occupied:** change `devServer.port`.
- **Drupal translations disappear:** leave `minify.js` disabled or verify locale extraction before
  enabling it.
