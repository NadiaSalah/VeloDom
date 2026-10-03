# VeloDom Release Policy

VeloDom follows Semantic Versioning for the public package entry points:

- `velodom`
- `velodom/compiler`
- `velodom/assets`
- `velodom/content`
- `velodom/devtools`
- `velodom/localization`
- `velodom/node`
- `velodom/pwa`
- `velodom/testing`
- `velodom/cli`
- `velodom/scaffolder`
- `velodom/vite`
- `velodom/vite-plugin`

## Version Rules

Current repository package identity: `1.0.0`. The manifest declares
`publishConfig.access = public`, but repository state does not prove registry
availability. Verify the [npm package page](https://www.npmjs.com/package/velodom)
and dist-tags immediately before and after any approved publication.
The public registry currently records `velodom` as unpublished. Because npm
never permits reuse of an unpublished name/version pair, `velodom@1.0.0`
cannot be the next publishable artifact. Keep the V1 product identity, but
select a new version with the owner before changing either package manifest.
On 2026-10-01 the owner chose to retain both local `1.0.0` manifests and defer
publication. Do not infer permission to bump, publish, or tag from passing CI.

Before the first official public V1 release:

- patch releases fix bugs without intentionally changing public behavior;
- minor releases may add features or make documented breaking changes;
- every breaking change must be called out in `CHANGELOG.md`.

After the first official public V1 release:

- patch releases contain backward-compatible fixes;
- minor releases add backward-compatible features;
- major releases may change public exports, directives, lifecycle contracts, or
  generated application behavior incompatibly.

Internal files that are not reachable through
`packages/velodom/package.json#exports` are not
public API. Tests, source configuration, and showcase assets must never be
included in the npm tarball. The source-controlled `templates/default/` common
files and `templates/starters/` overlays are intentional application-source
exceptions and must remain explicitly allowlisted and package-tested. Consumer-facing AI
references under `docs/` and `AI_CONTEXT.md` are also intentional package
content; repository audits and release history remain excluded.

## Release Checklist

Before packaging, build with `npm run package:build`, then inspect
`npm run pack:report`. The report validates both actual npm file lists and size
budgets (VeloDom: 800 KiB compressed / 3500 KiB unpacked / 400 files;
create-velodom: 8 KiB / 24 KiB / 10 files). A budget change needs a measured reason,
not an automatic increase. Maps are retained for debugging and measured separately
from browser runtime bytes. The artifact audit rejects known private/generated
paths, but does not replace reviewing content for secrets.

GitHub receives tracked source, docs, tests, fixtures, lockfile, and workflows.
Never commit dependencies, generated output, local account recovery material,
`.env` values, or tarballs. Inspect `git status` and the staged diff before any
owner-approved push. Package publication remains a separate approved action.

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
npm run create-package:check
npm run build
npm run pack:check
npm run benchmark:check
npm run test:browser
```

With owner approval for sending lockfile dependency metadata to the npm
registry, also run `npm audit`. This is a workspace-tooling supply-chain check;
the publishable VeloDom artifact currently has no direct runtime dependencies.

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
  - `velodom/cli`
  - `velodom/devtools`
  - `velodom/localization`
  - `velodom/node`
  - `velodom/pwa`
  - `velodom/scaffolder`
  - `velodom/testing`
  - `velodom/vite`
  - `velodom/vite-plugin`
  - `velodom/package.json`
- Confirm workspace applications, tests, source config, and local build
  scaffolding are not included in the npm tarball; only the explicit
  composable `templates/` inputs may contain application files.
- Confirm the package tarball contains its focused `README.md`, `LICENSE`,
  `AI_CONTEXT.md`, consumer `docs`, `bin`, `lib`, `types`, and verified
  `templates/default` plus `templates/starters`, but excludes workspace examples, internal audits, and
  framework TypeScript source.
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
VELODOM_BROWSER_TARGETS=chromium,mobile-chromium,firefox,webkit,mobile-webkit npm run test:browser
```

Browser launch is bounded to 20 seconds by default so a missing or unhealthy
local browser produces a clear failed target instead of an indefinitely stuck
release process. Set `VELODOM_BROWSER_LAUNCH_TIMEOUT_MS` only when a known CI
environment needs a longer startup window.

The repository includes
`.github/workflows/release-browser-matrix.yml`. It provisions Chromium,
Firefox, and WebKit on Ubuntu, builds the package, and runs the strict five-target
desktop/mobile matrix on pull requests, pushes to `main`, or manual dispatch.
Desktop WebKit currently runs three times per workflow to investigate an
intermittent Store administration form submission; this is a temporary test
stress measure, not a wider browser-support promise.
Its successful run is the required replacement for an unavailable local
Firefox compositor.

Desktop and mobile Chromium are the default required local targets. Firefox,
WebKit, and mobile WebKit run when selected through
`VELODOM_BROWSER_TARGETS`; release CI explicitly selects all five targets in
strict mode and fails on unexpected page/console errors. `happy-dom` tests are
fast checks, not a replacement for real browsers.
VeloDom does not ship browser polyfills by default.

## Current Release Decision

VeloDom source is prepared for the first official public V1 release. The
current local package manifests still say `1.0.0`, which cannot be republished
for `velodom`. The package manifest, public exports, CLI binaries, tarball
allowlist, consumer fixture, generated starter, production build, and GitHub
Actions browser matrix are release gates. Passing them prepares a release; it
does not prove or perform registry publication.

### Publication Policy

- Do not publish or change the `latest` tag without explicit approval for
  the exact version and registry operation.
- Record every published version and package URL in `CHANGELOG.md`.
- Run the complete package and browser gates before every future release.

## Initial Publication Gates

- Select an unused version for both packages, complete the final
  package/tarball/browser gates for that exact release commit, and verify
  registry name/version ownership and availability.
- Obtain explicit owner approval for the exact publish/tag command.
- Publish and verify `velodom` before `create-velodom`, because the wrapper's
  dependency must already resolve. Then smoke-test `npm create velodom@latest`
  from a clean directory. Never infer success from workspace linking.
