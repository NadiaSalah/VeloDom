# VeloDom Release Policy

VeloDom follows Semantic Versioning for the public package entry points:

- `velodom`
- `velodom/compiler`
- `velodom/vite`
- `velodom/vite-plugin`

## Version Rules

While VeloDom is below `1.0.0`:

- patch releases fix bugs without intentionally changing public behavior;
- minor releases may add features or make documented breaking changes;
- every breaking change must be called out in `CHANGELOG.md`.

After `1.0.0`:

- patch releases contain backward-compatible fixes;
- minor releases add backward-compatible features;
- major releases may change public exports, directives, lifecycle contracts, or
  generated application behavior incompatibly.

Internal files that are not reachable through `package.json#exports` are not
public API. Application folders, tests, source configuration, and showcase
assets must never be included in the npm tarball.

## Release Checklist

This checklist is an approval gate, not an automated publication script.
Completing local checks never implies permission to publish.

### 1. Scope and Version

- Confirm the release scope: patch, minor, major, or pre-release.
- Confirm the package version follows the rules above.
- Confirm `CHANGELOG.md` describes all user-visible changes.
- Confirm `README.md`, `todo.md`, and `NOTES.md` match the current behavior.
- Confirm public API changes, if any, were intentional and are reflected in the
  package-boundary tests.

### 2. Legal and Ownership Gates

- Choose an explicit public license and add the corresponding `LICENSE` file.
- Confirm the license is compatible with all runtime and package
  dependencies.
- Confirm ownership or availability of the intended npm package name.
- Confirm the npm publishing account, organization, access level, and 2FA
  requirements.
- Keep `private: true` until license and npm-name ownership are both decided.

### 3. Local Verification

Run these commands from a clean working tree:

```bash
npm test
npm run check
npm run package:check
npm run build
npm run pack:check
```

The checks must confirm:

- the core documentation audit passes;
- TypeScript and ESLint pass;
- all automated tests pass;
- ESM output and declaration files build successfully;
- package exports point only to allowlisted built artifacts;
- the installed-package consumer builds from the local tarball;
- `npm pack --dry-run` contains only intended package files.

### 4. Package Boundary Review

- Confirm `package.json#exports` exposes only:
  - `velodom`
  - `velodom/compiler`
  - `velodom/vite`
  - `velodom/vite-plugin`
  - `velodom/package.json`
- Confirm application folders, tests, source config, assets, and local build
  scaffolding are not included in the npm tarball.
- Confirm public API freeze tests pass before changing any export names.

### 5. Publication Approval

- Remove `private: true` only after every previous gate is approved.
- Do not run `npm publish` from routine development tasks.
- Publish only after explicit human authorization for that exact version.
- Record the published version and package URL in `CHANGELOG.md`.

## Current Publication Blockers

- No public license has been selected yet.
- No `LICENSE` file exists yet.
- npm package-name ownership has not been confirmed in this workspace.
- `private: true` is intentionally still enabled in `package.json`.
