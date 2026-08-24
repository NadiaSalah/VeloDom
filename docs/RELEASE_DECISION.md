# VeloDom V1 Release Decision

Date: 2026-08-24

## Current Decision

VeloDom is prepared locally as a `1.0.0` release candidate, but it is not
approved for npm publication yet.

`packages/velodom/package.json` must keep `private: true` until the project
owner explicitly approves publication for the exact version, account, access
level, and npm package destination. The root manifest is always private because
it coordinates the development workspace rather than an npm release.

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
- Package dry-run contents: 206 allowlisted entries, 343,666 compressed bytes,
  and 1,520,480 unpacked bytes
- `npm run pack:check`: passed locally
- `npm test`: 224 tests passed locally
- `npm run check`: passed locally
- `npm run build`: passed locally
- `vd doctor`: no issues; `vd health`: 100/100 with SEO config on 5/5 pages
- Targeted Chromium/Chrome/Edge browser E2E: passed locally on 2026-08-24
- `npm run test:browser`: passed locally for Chromium/Chrome/Edge, WebKit, and
  mobile WebKit after installing the missing Playwright browser binaries
- `VELODOM_BROWSER_STRICT=1 npm run test:browser`: still pending because
  Firefox headless startup timed out locally with a graphics/compositor launch
  error and the complete local matrix again stalled before its summary on
  2026-08-24; rerun on a Firefox-capable release or CI machine before public V1
- Deployment/static SEO contract: passed locally for `/`, `/features/`,
  `/blog/posts/html-first/`, and an unknown SPA fallback route
- External `npm audit` advisory lookup: not run during the 2026-08-24 review
  because it sends the locked dependency tree to the npm registry; run it only
  after the owner explicitly authorizes that external metadata transfer

This file is a release governance note. It is not a release automation script.
