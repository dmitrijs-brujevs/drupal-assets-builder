# Security Policy

Supported releases receive security fixes while they remain in the latest major release line.

Report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/dmitrijs-brujevs/drupal-assets-builder/security/advisories/new).
Do not open a public issue for a suspected vulnerability. Include affected versions, impact,
reproduction details, and any suggested mitigation. Maintainers will acknowledge a valid report and
coordinate disclosure and release timing through the private advisory.

`drupal-assets.config.js` is an executable JavaScript module and has the same Node.js privileges as
the builder process. Only use configuration from a trusted project; it is not sandboxed. The
builder itself does not invoke PHP, Composer, Drush, Drupal bootstrap, or configured shell commands,
and restricts cleanup to managed extension `dist` subdirectories.
