# VeloDom Release Policy

VeloDom follows Semantic Versioning for the public package entry points:

- `velodom`
- `velodom/compiler`
- `velodom/assets`
- `velodom/content`
- `velodom/devtools`
- `velodom/localization`
- `velodom/node`
- `velodom/testing`
- `velodom/vite`
- `velodom/vite-plugin`

## Version Rules

Current repository package identity: published `1.0.0`. The package is
available at [npmjs.com/package/velodom](https://www.npmjs.com/package/velodom)
with the `latest` dist-tag.

While VeloDom is below `1.0.0`:

- patch releases fix bugs without intentionally changing public behavior;
- minor releases may add features or make documented breaking changes;
- every breaking change must be called out in `CHANGELOG.md`.

After `1.0.0`:

- patch releases contain backward-compatible fixes;
- minor releases add backward-compatible features;
- major releases may change public exports, directives, lifecycle contracts, or
  generated application behavior incompatibly.

Internal files that are not reachable through
`packages/velodom/package.json#exports` are not
public API. Tests, source configuration, and showcase assets must never be
included in the npm tarball. The source-controlled `velodomProj/` beginner
starter is the only intentional application-source exception and must remain
explicitly allowlisted and package-tested.

## Release Checklist

This checklist is an approval gate, not an automated publication script.
Completing local checks never implies permission to publish.

### 1. Scope and Version

- Confirm the release scope: patch, minor, major, or pre-release.
- Confirm the package version follows the rules above.
- Confirm `CHANGELOG.md` describes all user-visible changes.
- Confirm `README.md`, `TODO.md`, and `NOTES.md` match the current behavior.
- Confirm the Browser Policy and Current Release Decision sections in this
  file match the current browser-support, E2E, and publication state.
- Confirm public API changes, if any, were intentional and are reflected in the
  package-boundary tests.

### 2. Legal and Ownership Gates

- Confirm the MIT License and the existing `LICENSE` file are still intended
  for this release.
- Confirm the license is compatible with all runtime and package
  dependencies.
- Re-confirm ownership or availability of the intended npm package name.
- Confirm the npm publishing account, organization, access level, and 2FA
  requirements.
- For a future version, keep the package publication guard enabled until
  npm-name ownership, account access, and release approval are all decided.

### 3. Local Verification

Run these commands from a clean working tree:

```bash
npm test
npm run check
npm run package:check
npm run build
npm run pack:check
npm run test:browser
```

With owner approval for sending lockfile dependency metadata to the npm
registry, also run `npm audit`. This is a workspace-tooling supply-chain check;
the published VeloDom package currently has no direct runtime dependencies.

The checks must confirm:

- the core documentation audit passes;
- TypeScript and ESLint pass;
- all automated tests pass;
- browser support policy is documented and the local real-browser smoke suite
  passes on an approved Chrome/Edge target;
- ESM output and declaration files build successfully;
- package exports point only to allowlisted built artifacts;
- the installed-package consumer builds from the local tarball;
- `npm pack --dry-run` contains only intended package files.

### 4. Package Boundary Review

- Confirm npm discovery metadata includes the intended author, keywords,
  repository URL and `repository.directory`, license, bugs URL, homepage,
  engines, and public access intent.
- Confirm the registry-facing package README documents installation, beginner
  setup, public subpaths, and the boundary between framework and application
  files.
- Confirm `packages/velodom/package.json#exports` exposes only:
  - `velodom`
  - `velodom/assets`
  - `velodom/compiler`
  - `velodom/content`
  - `velodom/devtools`
  - `velodom/localization`
  - `velodom/node`
  - `velodom/testing`
  - `velodom/vite`
  - `velodom/vite-plugin`
  - `velodom/package.json`
- Confirm workspace applications, tests, source config, and local build
  scaffolding are not included in the npm tarball; only the explicit
  `velodomProj/` starter exception may contain application files.
- Confirm the package tarball contains its focused `README.md`, `LICENSE`,
  `bin`, `lib`, `types`, and verified `velodomProj`, but excludes workspace
  examples and framework TypeScript source.
- Record the final dry-run tarball file count and compressed/unpacked sizes so
  unexpected growth is visible during release review.
- Confirm public API freeze tests pass before changing any export names.

## Browser Policy

The V1 target is the latest two stable versions of Chrome, Edge, Firefox,
macOS Safari, iOS Safari, and Android Chrome. Internet Explorer, EdgeHTML,
Opera Mini, and browsers without native ES modules, `Proxy`, `AbortController`,
`URL`, `fetch`, history, or DOM events are outside the default policy.

Run the local smoke matrix with:

```bash
npm run test:browser
VELODOM_BROWSER_STRICT=1 npm run test:browser
VELODOM_BROWSER_TARGETS=chromium,firefox,webkit,mobile-webkit npm run test:browser
```

Browser launch is bounded to 20 seconds by default so a missing or unhealthy
local browser produces a clear failed target instead of an indefinitely stuck
release process. Set `VELODOM_BROWSER_LAUNCH_TIMEOUT_MS` only when a known CI
environment needs a longer startup window.

The repository includes
`.github/workflows/release-browser-matrix.yml`. It provisions Chromium,
Firefox, and WebKit on Ubuntu, builds the package, and runs this strict matrix
on pull requests, pushes to `main`/`master`, or manual dispatch. Its successful run is
the required replacement for an unavailable local Firefox compositor.

Chromium is the required local target. Firefox, WebKit, and mobile WebKit are
attempted when their Playwright binaries exist; release CI should use strict
mode. `happy-dom` tests are fast checks, not a replacement for real browsers.
VeloDom does not ship browser polyfills by default.

## Current Release Decision

VeloDom `1.0.0` is published and verified in the npm registry. The package
manifest, public exports, CLI binaries, tarball allowlist, consumer fixture,
production build, and GitHub Actions browser matrix were checked before and
after publication.

### Publication Policy

- Do not republish or change the `latest` tag without explicit approval for
  the exact version and registry operation.
- Record every published version and package URL in `CHANGELOG.md`.
- Run the complete package and browser gates before every future release.

## Current Publication Blockers

- None for V1 `1.0.0`. Additional starter variants and future capabilities
  remain roadmap work; the default starter is maintained by `create-velodom`.
