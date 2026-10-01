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
- ordinary CSS only in the separate storefront/administration reference consumer

## Run the Workspace

```bash
npm install
npm run dev
npm run dev:store
```

Verification:

```bash
npm test
npm run check
npm run typecheck:strict
npm run build
npm run pack:check
npm run benchmark:compiler
npm run benchmark:rendering
npm run benchmark:check
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

`vd help` includes a large colored VeloDom wordmark for interactive terminals
(a compact title is used below 64 columns).
Use `--no-logo` or `--no-color` in scripts; JSON and version output stay clean.

Choose Minimal, Blog, or Empty, then use Recommended defaults or customize
JavaScript/TypeScript, CSS/Tailwind, ESLint, Prettier, route examples, i18n,
the opt-in PWA build, testing, Git, installation, and server startup. Every entry point delegates to
one Node-only scaffolder; no creation code enters the browser runtime.
Customize mode can also add the optional local VeloDom Lab command without
adding a separate dependency or changing production output.

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
  velodom-store/            storefront/cart/admin/mock-checkout reference consumer
tools/
  scripts/
    package/                artifact audits and installed-consumer checks
    quality/                source comments and documentation contracts
    browser/                production browser verification
    performance/            compiler/render benchmarks and bundle budgets
  tests/                    framework, package, and regression tests
  test-support/             shared test/audit helpers
  test-fixtures/            isolated package consumer input
  type-tests/               compile-time API regression tests
docs/
  README.md                 detailed repository handbook
  TODO.md                   roadmap
  CHANGELOG.md              chronological changes
  NOTES.md                  architecture/release decisions
  RELEASING.md              release gates
```

### GitHub source, npm artifact, and website are different outputs

| Output | What belongs in it | What stays out |
| --- | --- | --- |
| GitHub repository | Source, tests, fixtures, docs, templates, example site, CI, lockfile | Dependencies, generated `lib/types/dist`, browser reports, tarballs, credentials |
| `velodom` npm tarball | Built ESM with source maps, types, binaries, consumer docs, small starter templates, license | Repository tests, full teaching site, development configs, release history |
| Deployed documentation site | `examples/velodom-blog/dist`, produced by the build | Package source, tests, credentials |
| Store/admin reference build | `examples/velodom-store/dist`, produced by `npm run build:store` | Real payments, credentials, server authorization |

Use `npm run package:build` then `npm run pack:report` to inspect **both** npm
artifacts without publishing. Use `npm run pack:check` for installed-consumer
and starter verification too. The workspace root and documentation site are
private; they are not the npm publish target. Do not copy `node_modules` to GitHub
or move repository-only tools into the public package to make the root look smaller.

Source maps are retained intentionally for debugging. Installed package size
includes optional Node tooling, docs, and maps; it is not the JavaScript sent to
a browser. `npm run performance:check` measures that separate concern.

## Current Status

The package source is version `1.0.0`. Its public contract exposes 14 package
entry points, 80 browser/build public values, 43 preferred directive names,
and 25 CLI commands. Release checks cover TypeScript, ESLint, documentation consistency,
the automated test suite, production builds, package boundaries, an installed
tarball consumer, the generated starter, and browser targets.

Registry publication or tag changes remain separate owner-authorized actions;
local checks never publish automatically. Confirm current registry availability
immediately before giving users registry-dependent release instructions.
The normalized changelog currently represents no official release: all
surviving V1 capabilities remain under `Unreleased` until the exact first
release commit is verified, approved, tagged, and published deliberately.

## Completed in the Current Update

- Added `examples/velodom-store` as a separate public-API consumer for catalog,
  direct product routes, URL filters, keyed product components, versioned guest
  cart persistence, authoritative mock quotes, RTL, and a visibly simulated
  checkout. It uses no commerce-specific Core syntax or real transaction.
- Extended the same consumer with a separate administration layout, URL-backed
  server-pagination fixture, detail/edit routes, optimistic revision checks,
  native validation, recoverable failed/conflicting drafts, and confirmed bulk
  publication actions. It reuses the catalog repository rather than copying
  product data or adding a Core data-grid/form abstraction.
- Fixed the optional direction controller so `ctx.direction` reaches component
  lifecycle hooks as documented, with runtime/type regression coverage.
- Extended desktop/mobile browser gates across the store's Back/Forward filters,
  keyboard cart action, refresh and blocked-storage outcomes, mock checkout,
  responsive layout, and RTL direction.
- Aligned the package Quick Start and generated Minimal README around one
  verified beginner journey: edit a page, create/render a component, adjust
  ordinary CSS, then build and preview. Advanced JS/TS, folder/`.vd`, and
  CSS/Tailwind choices remain available after that path.
- Extended the installed-tarball consumer check to execute the documented
  component command and build the taught Minimal JavaScript project; no Core
  runtime, public API, version, dependency, or browser payload changed.
- Simplified the taught list/form recipes around existing `vd-auto-state`,
  native constraints, and progressive form feedback. The displayed snippets
  are now executed as integration fixtures, and the production playground
  visibly covers successful and empty list responses.
- Converted the installed starter check into a real copy-to-project parity
  fixture: it reads the homepage lesson source, adds the documented component,
  builds from the packed package, and rejects source-only asset links while
  verifying public and scoped assets.
- Organized repository checks under `tools/scripts/{package,quality,browser,performance}`
  and kept npm commands stable. CI uses the named browser command.
- Added `npm run pack:report`: audits both real npm file lists, public entry
  targets, accidental private/build files, and compressed/installed size budgets.
  It neither installs nor publishes; run `npm run package:build` first.
- Corrected ESLint's obsolete test/script paths so current maintenance code is
  checked. Generated artifacts remain outside Git.
- Simplified this README into an entry point. Detailed implementation history
  remains in [CHANGELOG](docs/CHANGELOG.md) and [NOTES](docs/NOTES.md), not a
  second rolling changelog here.
- Improved the teaching homepage with a two-file beginner walkthrough and an
  explicit distinction between the documentation site, npm package, and starter.
- No framework APIs, syntax, dependencies, versions, or source maps were removed.

### Verification and limitations

See [maintenance notes](docs/NOTES.md) for this change's checks and measured
artifact sizes. A passing local package check is not npm publication or a
successful remote workflow. The previously observed local Firefox graphics
startup failure still requires verification on the strict Linux CI runner.

## TODO

The local V1 implementation and approved 15/15 maturity milestones are complete.
The separate simplicity/adoption track is **6/8 (75%)**, and the commerce and
large-application track is **8/10 (80%)**. These counters do not mean the first
official release has been published.

The remaining decisions are evidence-led:

- Observe 3–5 independent developers using the existing Minimal path and a
  small catalog/dashboard task. Record setup friction and whether they can find
  request, auth, and RTL guidance. This is needed before closing P1 validation,
  splitting the guide (P2), or promoting a Store/Admin starter (C08).
- Keep C10 local OpenAPI contract generation in future-major research. The
  current `vd types` discovers request names but cannot infer response
  contracts. Fine-grained reactivity and hybrid SSR research were evaluated
  without promotion: no measured tracking bottleneck or tested VeloDom
  server-rendering/hydration contract exists. Islands, streaming/Edge
  transport, and critical-CSS extraction were likewise triaged without
  promotion. The remaining AI, migration, CMS, locale, virtualization and
  realtime research was evaluated against existing generic helpers and actual
  example workloads; none is promoted into Core, a V1 command, or a dependency.
- Select the exact initial-release commit, run the complete package/performance
  and strict cross-browser CI gates on it, verify both registry package states,
  and obtain explicit owner approval before publishing or tagging. Local
  Chromium/WebKit checks have passed; local Firefox graphics startup did not
  reach a test, so the Linux CI result is still required.

The current documentation audit updated this README, [TODO](docs/TODO.md),
[NOTES](docs/NOTES.md), and [CHANGELOG](docs/CHANGELOG.md). It removed stale
progress claims from this entry point and recorded the P1/C08 observation
protocol and C10/reactivity/hybrid-rendering feasibility decisions. It changed
no framework source, public API, CLI, starter, or dependency. The last recorded
implementation gate passed 431 source tests, full build, six JS/TS starter
variants, both installed consumers, desktop/mobile Chromium and WebKit, and
npm dry-run content/size checks; this audit does not claim a new strict CI run.

See [the roadmap](docs/TODO.md) for open checkboxes and the separate research
decisions, and [engineering notes](docs/NOTES.md) for measured limitations and
decision criteria.

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
