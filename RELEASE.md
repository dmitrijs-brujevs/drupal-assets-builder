# Release Process

1. Confirm that all CI checks are green.
2. Update the version in `package.json` and `package-lock.json`.
3. Update `CHANGELOG.md`.
4. Commit the release changes.
5. Create a signed or annotated tag named `vX.Y.Z`.
6. Push the tag.
7. Create and publish a GitHub Release from that tag.
8. The publish workflow verifies that the tag matches `package.json`.
9. npm Trusted Publishing publishes the package.
10. Verify the npm package page and provenance attestation.

## First Publication Bootstrap

Trusted Publishing can only be configured after the package exists in the npm registry. For the
first release only, an owner must publish `0.1.0` interactively with 2FA after explicit approval:

```sh
npm ci
npm run check
npm publish --access public
```

Do not store the resulting npm credentials in this repository. After this bootstrap publication,
configure the Trusted Publisher below. All later versions use the GitHub Release workflow.

## npm Trusted Publisher

Configure the package on npmjs.com with:

- Provider: GitHub Actions
- GitHub owner: `dmitrijs-brujevs`
- Repository: `drupal-assets-builder`
- Workflow filename: `publish.yml`
- Environment: `npm`
- Permission: publish

After the first successful trusted publication, disable legacy publish tokens for the package and
enable two-factor authentication on the npm account. The workflow intentionally contains no
`NPM_TOKEN`; GitHub OIDC supplies short-lived credentials and npm creates provenance automatically.
