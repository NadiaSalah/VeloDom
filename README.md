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
npm run typecheck:strict
npm run build
npm run pack:check
npm run benchmark:compiler
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
entry points, 71 browser/build public values, 43 preferred directive names,
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

- Added one Node-only Project Index for CLI intelligence. It caches discovered
  template, script, config, and compiler data once per command; `doctor`,
  generated types/docs, graph, health, security, and build reports now reuse
  that snapshot while `vd inspect --json` keeps its prior public shape.
- Added stable categorized IDs, template source locations, conservative typo
  suggestions, and offline `vd explain <diagnostic-code>` guidance to project
  diagnostics. Existing human messages remain readable and JSON output is now
  suitable for editor/CI consumers without requiring AI or network access.
- Added `vd check` as a transparent read-only composition of compiler,
  accessibility, relationship, security, configuration, generated-type, and
  maintainability checks. Its report explicitly leaves browser testing as
  `not-run`; it neither builds nor writes generated declarations behind the
  user's back.
- Added preview-first `vd fix` for the narrow syntax-preserving migration
  allowlist: legacy `data-vd-*`, event attributes, and `vd-request-state` to the
  preferred forms. `--write` is explicit and guarded against changed files;
  scripts, business logic, unknown syntax, and file deletion are out of scope.
- Extended `vd doctor` through the shared index with invalid `vd-nav` targets,
  protected/impossible request targets, explicit typed-prop mismatches,
  component-ref/expose calls, and conservatively unused exported state. Dynamic
  props, state access, and general control flow are intentionally not guessed.
- Strengthened the existing optional `vd types` output: route params and
  request names now combine with keys from `vd-prop-*`, static object-form
  `vd-props`, and required/optional `ComponentInitContext<Props>` contracts.
  Property values stay honestly `unknown`, and Vanilla projects need nothing.
- Rebuilt `vd build-report` around a compact versioned artifact emitted by the
  Vite plugin. Reports now attribute initial, route, component, shared, and lazy
  feature chunks from Rollup module metadata and measure duplicated dependency
  bytes only when Rollup can prove them; missing metadata is reported plainly.
- Added idempotent `vd add i18n|tests|lab` for existing applications. It
  preflights conflicts, never overwrites user files, records generated hashes
  and controlled config changes in `.velodom/features.json`, and leaves package
  installation explicit.
- Expanded the optional read-only Lab with a true nested ownership tree, recent
  state diffs, a payload-free request waterfall, correlated route transitions,
  directive/source locations, and copyable local `vd explain` commands.
  Request/navigation IDs exist only in bounded development events.
- Added `vd test` as a thin dispatcher over real application-owned package
  scripts. Unit, browser, compiler, route, request, component, and accessibility
  filters fail when their script is absent instead of reporting a placeholder
  pass. `velodom/testing` now also supplies compiler fixtures, route resolution,
  recorded request doubles, DOM event dispatch, and compiler-backed
  accessibility smoke checks without entering production bundles.
- Completed the safe first-party feature lifecycle. `vd features` audits
  ownership and reversibility, `vd remove` refuses user-modified files,
  `vd upgrade` rolls clean features through current generators with rollback,
  and `vd preset export/apply` shares only validated feature choices—not source
  code, credentials, dependency installation, or third-party execution.
- Extended optional localization without a mandatory client service: typed
  explicit plural leaves use native `Intl.PluralRules`, named primitive
  placeholders stay text-only, locale directions are checked, and
  missing/extra/unused/unknown keys receive stable diagnostics. `vd i18n
  extract|check` performs static project analysis, while completion metadata is
  available to optional editors and the starter demonstrates the small API.
- Added build-only `vd inspect css|assets` reports for stylesheet ownership,
  repeated declaration blocks, possibly unused selectors, RTL-safe logical
  properties, intrinsic image dimensions, local asset size/hash usage,
  responsive variants, and possible LCP hints. All findings remain advisory
  and no image transformer or browser runtime was added.
- Completed the monotonic TypeScript `strict` migration. The final CLI,
  project-intelligence, and scaffolder slice was hardened, then the gate was
  extended to all 88 package source files through `src/**/*.ts` so future
  modules enter the strict boundary automatically.
- Tightened resource-map generics, Vite glob contracts, binary image reads,
  frontmatter/Markdown parsing, normalized locale definitions, CSS/SEO source
  extraction, and static CLI captures where indexed values can be absent.
- Aligned runtime behavior with the public `VeloDomApp.navigate()` type: direct
  application navigation and plugin navigation now always return a Promise,
  including invalid-path diagnostics, with a focused regression test.
- Continued the monotonic TypeScript `strict` migration through component
  mounting, page routing, route matching, resource-adapter validation, page
  data, scoped styles, runtime SEO, page events, lifecycle hook dispatch, and
  recoverable error-boundary dependencies. Application JavaScript and
  TypeScript authoring remain equivalent.
- Added a focused missing-`#app` diagnostic so an invalid HTML shell reports
  one actionable router error instead of causing a secondary error-boundary
  failure.
- Continued the staged TypeScript `strict` migration through the directive
  engine and lazy feature modules, the complete safe-expression evaluator, and
  the declarative request dependencies reached by directives: auth,
  middleware, bindings, and request routing. The enforced boundary preserves
  template syntax and the JavaScript/TypeScript application API.
- Consolidated safe inspection of unknown thrown values into one internal Core
  helper, removing duplicate compiler/request error extraction while retaining
  source-aware diagnostics and non-`Error` compatibility.
- Tightened reactive subscription callbacks, dynamic init-result narrowing,
  and DOM ref collection types while preserving existing runtime behavior.
- Added an automatic, plugin-local incremental compiler cache keyed by
  normalized template source and effective compiler options. It invalidates on
  source changes and Vite hot updates, keeps at most 256 least-recently-used
  results, and adds no browser runtime code or user configuration.
- Added a repeatable `npm run benchmark:compiler` report for cold compilation,
  warm cache hits, and an explicitly invalidated rebuild without turning
  machine-specific timing into a release threshold.
- Restored `.vd` page lazy-loading parity with folder pages: Vite now extracts
  only route config eagerly and emits template, script, style, and manifest as
  one lazy page chunk, without a second public authoring format.
- Added a production gate proving the documentation `.vd` page stays outside
  the application entry bundle while direct routing and interaction still work.
- Added stable `vd-key` reconciliation that moves existing DOM/component
  ownership ranges during safe reorders, preserving focus, form edits, event
  listeners, refs, and component-local state while retaining conservative
  rebuilds for unkeyed or ambiguous identity.
- Added DOM, component lifecycle, playground, and browser coverage for keyed
  reorder, insert, removal, duplicate-key fallback, and same-key replacement.
- Added experimental, opt-in VeloDom Lab on top of the existing Vite workflow:
  route/component/state/binding/compiler inspection, a nested ownership tree,
  state diffs, request waterfall, correlated route timeline, safe serialization,
  DOM highlighting, search, themes, responsive UI, and HMR metadata refresh
  through a versioned read-only protocol.
- Added `vd lab`, focused `vd inspect` views, deterministic `vd explain`, Lab
  setup checks in `vd doctor`, and an optional `--lab` project choice shared by
  JavaScript/TypeScript and every starter.
- Split the production-side inspection hook from the full Lab session/UI and
  added an emitted-bundle scan proving Lab bootstrap code is absent from normal
  production builds.
- Verified the Lab against the running Blog in the in-app browser and fixed two
  integration defects found there: Vite now resolves the injected devtools
  entry explicitly, and the router reads plugin-installed inspection sessions
  lazily so the first page mount is captured.
- Rescanned package exports, public values, preferred directives, CLI commands,
  authoring conventions, and optional integrations against implementation and
  tests before changing teaching content.
- Corrected stale Blog starter and generated feature props so dynamic values use
  `vd-props`, then added explicit loop and empty states.
- Corrected the showcase's routing, hash, form, localization, package-map, CLI,
  and source-derived metric examples; removed unused presentation CSS.
- Expanded the documentation audit to verify the live showcase against the
  package manifest/source and reject known obsolete signatures.
- Added concise JSDoc to every named Core function and an AST-backed regression
  gate, while stripping comments only from compiled JavaScript to preserve the
  lightweight runtime budget.
- Verified 284 tests, documentation/type/lint gates, production and package
  builds, the installed tarball consumer, both package dry-runs, performance
  budgets, the compiler benchmark, and Chromium browser E2E. Broader strict
  browser-matrix confirmation remains a final-release workflow responsibility.
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

Primary changed paths are `packages/velodom/src`, the Blog/feature starter
templates, `examples/velodom-blog`, package-local AI references, repository
guides, and documentation/test checks under `tools/`.
Official starter input now lives only in the composable `templates/default`
and `templates/starters` sources inside the VeloDom package.

The incremental-compiler milestone specifically changes
`packages/velodom/src/vite-plugin`, the shared compiler-cache constant, focused
compiler/Vite tests, the repository benchmark command, and synchronized root,
package, AI, roadmap, changelog, decision, and consumer documentation. It does
not change runtime syntax, public exports, generated projects, or starter
configuration.

The strict-typing migration now covers every TypeScript source below
`packages/velodom/src`, including Core/runtime, compiler/Vite integration,
optional public subpaths, adapters, CLI/project intelligence, and scaffolding.
Application code remains free to use Vanilla JavaScript or TypeScript; this
maintenance gate changes neither template syntax nor generated starter choices.

## TODO

Only optional or future work belongs in [docs/TODO.md](docs/TODO.md). Near-term
release work should stay limited to:

- attribute build output to Vite/Rollup chunks where emitted metadata can prove
  ownership, while keeping heuristic claims out of the report;
- run the complete package and browser gates on the final commit;
- inspect both npm dry-run tarballs for unexpected files or size growth;
- publish `velodom` first and `create-velodom` second only after explicit owner
  approval, then verify `npm create velodom@latest` from the registry;
- keep advanced SSR, islands, migrations, and optional AI providers behind
  separate architecture and runtime-budget reviews.
- keep the experimental Lab read-only; evaluate a full playground, flame
  charts, browser extension, or source-writing tools only as separate bounded
  follow-up work.

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
