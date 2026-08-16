# VeloDom V1 Release Decision

Date: 2026-08-16

## Current Decision

VeloDom is prepared locally as a `1.0.0` release candidate, but it is not
approved for npm publication yet.

`package.json` must keep `private: true` until the project owner explicitly
approves publication for the exact version, account, access level, and npm
package destination.

## Approved Now

- Keep the local package identity at `1.0.0`.
- Keep package boundary, tarball, consumer, browser, build, lint, type, and test
  checks in the release workflow.
- Use `npm run pack:check` to verify the package contents before any release
  decision.
- Continue improving documentation, examples, templates, and build-time tooling.

## Not Approved Yet

- Removing `private: true`.
- Running `npm publish`.
- Pushing release tags.
- Claiming the package is available from npm.
- Publishing from an unapproved npm account or organization.

## Required Human Decisions

Before publication, the owner must confirm:

1. npm package ownership or reservation for `velodom`.
2. npm account or organization that will publish the package.
3. public access level.
4. two-factor authentication requirements.
5. final package version.
6. final release notes.
7. whether the GitHub repository state should be tagged.

## Latest Local Evidence

- Package version: `1.0.0`
- Publication guard: `private: true`
- Package dry-run artifact: `velodom-1.0.0.tgz`
- `npm run pack:check`: passed locally
- `npm test`: 201 tests passed locally
- `npm run check`: passed locally
- `npm run build`: passed locally
- `npm run test:browser`: passed locally for Chromium/Chrome/Edge; Firefox,
  WebKit, and mobile WebKit were skipped because their Playwright binaries are
  not installed in this local environment

This file is a release governance note. It is not a release automation script.
