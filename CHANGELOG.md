# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-07

### Added

- Initial public package structure.
- Vite-based Drupal module and theme asset discovery and builds.
- Composer Asset Packagist fallback resolution.
- CLI, programmatic API, tests, CI, CodeQL, Dependabot, and trusted publishing workflow.

### Fixed

- Composer vendor package assets with identical filenames no longer silently collide. Each asset is
  now emitted under a package-relative path (e.g. `images/example-package/icon.svg`) so output
  names are stable and unique across packages.

[Unreleased]: https://github.com/dmitrijs-brujevs/drupal-assets-builder/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/dmitrijs-brujevs/drupal-assets-builder/releases/tag/v1.0.0
