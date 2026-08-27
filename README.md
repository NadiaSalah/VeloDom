# VeloDom

<p align="center">
  <img src="docs/assets/VeloDom-logo.svg" alt="VeloDom logo" width="260">
</p>

VeloDom is an HTML-first, compiler-first frontend framework for lightweight,
folder-first web applications. Framework internals are TypeScript; application
authors can use Vanilla JavaScript or TypeScript without JSX, TSX, a virtual
DOM, or a required global store.

Repository: [github.com/NadiaSalah/VeloDom](https://github.com/NadiaSalah/VeloDom)

## Documentation

Documentation has one responsibility per location:

- [Repository handbook](docs/README.md): detailed architecture, examples,
  deployment, and framework-development guidance.
- [Package quick start](packages/velodom/docs/QUICK_START.md): smallest verified
  consumer path.
- [Canonical syntax](packages/velodom/docs/SYNTAX_REFERENCE.md): implemented
  public authoring syntax.
- [Feature inventory](packages/velodom/docs/FEATURE_INVENTORY.md): stable,
  supported, partial, and legacy status.
- [AI context](packages/velodom/AI_CONTEXT.md) and
  [AI guide](packages/velodom/docs/AI_GUIDE.md): compact local context shipped
  with npm.
- [Roadmap](docs/TODO.md), [changelog](docs/CHANGELOG.md),
  [decisions](docs/NOTES.md), and [release policy](docs/RELEASING.md):
  repository-only maintenance records.

The old root `docs/AI_CONTEXT.md` was removed. Its authoritative replacement is
inside the publishable package, so humans, generated projects, and AI coding
assistants all resolve to the same installed documentation.

## Technology

- TypeScript framework source and generated ESM declarations
- Vite compiler/build integration
- ESLint and Node.js test runner
- Playwright browser verification
- Tailwind CSS and daisyUI only in the documentation blog consumer

## Run the Workspace

```bash
npm install
npm run dev
```

Verification:

```bash
npm test
npm run check
npm run build
npm run pack:check
```

The root development command builds the package and starts
`examples/velodom-blog`. Generated `lib`, `types`, `dist`, and `node_modules`
content is recreated by npm scripts and is not hand-edited.

## Create a User Project

The repository contains the dedicated `create-velodom` package required by
npm's `create` naming convention. After the first official V1 release makes
both packages available, the primary interactive command will be:

```bash
npm create velodom@latest
```

After release, the `velodom` package also exposes the explicit generator form:

```bash
npx --yes --package velodom create-velodom my-app --no-install
cd my-app
npm install
npm run dev
```

From this source checkout, build the package and invoke the same generator
without relying on registry state:

```bash
npm run package:build
node packages/velodom/bin/create-velodom.js my-app --no-install
```

From a globally/locally available VeloDom CLI, the same engine is used by:

```bash
vd create my-app
```

Choose Minimal, Blog, or Empty, then use Recommended defaults or customize
JavaScript/TypeScript, CSS/Tailwind, ESLint, Prettier, route examples, i18n,
testing, Git, installation, and server startup. Every entry point delegates to
one Node-only scaffolder; no creation code enters the browser runtime.

## Repository Structure

```text
packages/
  create-velodom/           npm-create wrapper; no duplicate generator logic
  velodom/                  publishable framework, CLI, types, docs, starter
    src/                    framework TypeScript source
      scaffolder/           Node-only composable project creation engine
    docs/                   consumer and AI-readable package references
    templates/default/      common safe files shared by all starters
    templates/starters/     minimal, blog, and empty application layers
  velodom-vscode/           optional private editor tooling
examples/
  velodom-blog/             full documentation application and real consumer
tools/
  scripts/                  repository checks, packaging, browser verification
  tests/                    framework, package, and regression tests
docs/
  README.md                 detailed repository handbook
  TODO.md                   roadmap
  CHANGELOG.md              chronological changes
  NOTES.md                  architecture/release decisions
  RELEASING.md              release gates
```

## Current Status

The package source is version `1.0.0`. Its public contract exposes 13 package
entry points, 61 browser/build public values, 43 preferred directive names, and 14 CLI
commands. Release checks cover TypeScript, ESLint, documentation consistency,
the automated test suite, production builds, package boundaries, an installed
tarball consumer, the generated starter, and browser targets.

Registry publication or tag changes remain separate owner-authorized actions;
local checks never publish automatically. Confirm current registry availability
immediately before giving users registry-dependent release instructions.
The normalized changelog currently represents no official release: all
surviving V1 capabilities remain under `Unreleased` until the exact first
release commit is verified, approved, tagged, and published deliberately.

## Completed in the Current Update

- Normalized release history around one planned first official `1.0.0` release;
  discarded private repository and registry experiments are now represented by
  one concise pre-public note instead of false version chronology.
- Removed stale current-state claims about npm publication, account history,
  dated workflow runs, and a nonexistent publishable-package `private` guard.
- Added a documentation consistency rule that rejects known stale pre-release
  publication claims in maintained current-state guides.
- Audited Markdown references after the showcase rename and standardized the
  consumer path as `examples/velodom-blog`; the documentation audit now rejects
  the obsolete pre-rename path.
- Replaced the one-size starter copier with a shared, feature-based scaffolder
  used by `create-velodom`, `velodom`, `vd init`, and `vd create`.
- Added Minimal, Blog, and Empty starter layers without creating a template
  matrix for every language and feature combination.
- Added genuine JavaScript/TypeScript generation plus optional Tailwind,
  ESLint, Prettier, official route examples, English/Arabic localization,
  unit/E2E tests, Git, package-manager installation, and server startup.
- Added safe path/name validation, non-empty directory protection, conflict
  diagnostics, dotfile handling, package-manager detection, and clean
  cancellation/next-step output.
- Added the dedicated Node-only `packages/create-velodom` npm-create wrapper;
  it imports the same `velodom/cli` engine and adds no browser dependency.
- Kept `examples/velodom-blog` as the full academic showcase while deriving a
  much smaller, production-editable Blog starter.
- Added package `AI_CONTEXT.md`, `QUICK_START.md`, `SYNTAX_REFERENCE.md`,
  `FEATURE_INVENTORY.md`, and `AI_GUIDE.md` to the npm allowlist.
- Reworked package README content into a focused consumer overview instead of
  duplicating the repository handbook.
- Extended package/consumer and CLI tests to verify the composable starters,
  packed-artifact generation, public-only imports, and representative builds.
- Removed the duplicated root AI context and updated repository links to the
  package-owned source of truth.
- Verified the automated suite, documentation/type/lint gates, installed
  tarball builds, a real Recommended install/lint/format/type/build smoke, and
  both packed packages. Exact counts and artifact sizes belong to the release
  run for the selected commit rather than permanent current-state prose.
- Fixed Windows package-manager execution by invoking npm through its Node CLI,
  and made every Prettier-enabled generated file formatted at creation time.

Primary changed paths are `docs/CHANGELOG.md`, the maintained release/status
guides, `tools/scripts/check-doc-consistency.mjs`,
`packages/velodom/src/scaffolder/`, `packages/velodom/templates/`,
`packages/create-velodom/`, the VeloDom CLI, and package/consumer checks under
`tools/`.
Official starter input now lives only in the composable `templates/default`
and `templates/starters` sources inside the VeloDom package.

## TODO

Only optional or future work belongs in [docs/TODO.md](docs/TODO.md). Near-term
release work should stay limited to:

- run the complete package and browser gates on the final commit;
- inspect both npm dry-run tarballs for unexpected files or size growth;
- publish `velodom` first and `create-velodom` second only after explicit owner
  approval, then verify `npm create velodom@latest` from the registry;
- keep advanced SSR, islands, migrations, and optional AI providers behind
  separate architecture and runtime-budget reviews.

## Handoff Notes

- Keep generic reusable framework behavior in `packages/velodom/src`.
- Keep business pages, components, layouts, APIs, assets, and auth policy in
  user applications or examples.
- Import only documented package entry points; never `velodom/lib/*` or
  repository source internals.
- Folder mode remains the default; `.vd` is optional and additive.
- JavaScript and TypeScript must remain independent authoring choices.
- Update this README, TODO, CHANGELOG, NOTES, tests, and package docs when the
  public contract changes.
- Do not push, publish, retag, or change package access without explicit user
  authorization for that external action.
