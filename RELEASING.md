# VeloDom Release Policy

VeloDom follows Semantic Versioning for the public package entry points:

- `velodom`
- `velodom/compiler`
- `velodom/content`
- `velodom/vite`
- `velodom/vite-plugin`

## Version Rules

Current repository package identity: `1.0.0` local release candidate. This
does not imply npm publication because `private: true` remains enabled until
the publication gates below are approved.

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
public API. Application folders, tests, source configuration, and showcase
assets must never be included in the npm tarball.

## Release Checklist

This checklist is an approval gate, not an automated publication script.
Completing local checks never implies permission to publish.

### 1. Scope and Version

- Confirm the release scope: patch, minor, major, or pre-release.
- Confirm the package version follows the rules above.
- Confirm `CHANGELOG.md` describes all user-visible changes.
- Confirm `README.md`, `RELEASE_DECISION.md`, `todo.md`, and `NOTES.md`
  match the current behavior.
- Confirm `BROWSERS.md` matches the current browser-support and E2E target
  policy.
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
- Keep `private: true` until npm-name ownership, account access, and release
  approval are all decided.

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

- Confirm `packages/velodom/package.json#exports` exposes only:
  - `velodom`
  - `velodom/assets`
  - `velodom/compiler`
  - `velodom/content`
  - `velodom/devtools`
  - `velodom/testing`
  - `velodom/vite`
  - `velodom/vite-plugin`
  - `velodom/package.json`
- Confirm application folders, tests, source config, assets, and local build
  scaffolding are not included in the npm tarball.
- Confirm the package tarball contains its focused `README.md`, `LICENSE`,
  `bin`, `lib`, and `types`, but excludes workspace examples and framework
  TypeScript source.
- Confirm public API freeze tests pass before changing any export names.

### 5. Publication Approval

- Remove `private: true` only after every previous gate is approved.
- Do not run `npm publish` from routine development tasks.
- Publish only after explicit human authorization for that exact version.
- Record the published version and package URL in `CHANGELOG.md`.

## Current Publication Blockers

- The local package version is `1.0.0`, but this repository is still private
  and unpublished.
- npm registry returned 404 for `velodom` on 2026-07-09, so the package name
  appears available, but it has not been reserved by an approved npm account in
  this workspace.
- npm publishing account, organization, access level, and 2FA requirements have
  not been approved yet.
- `private: true` is intentionally still enabled in
  `packages/velodom/package.json`.
