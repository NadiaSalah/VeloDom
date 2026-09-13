# VeloDom Roadmap

This roadmap preserves VeloDom V1 as the completed source baseline and keeps
post-launch work intentionally small, optional, and evidence-driven. It
separates the remaining V1 release gates, the approved next-release maturity
scope, later-release opportunities, research-only work, and rejected
directions.
Discarded pre-public milestones are not product generations; only their
surviving user-visible outcomes are summarized in `CHANGELOG.md`.

## V1 Status Summary

| Area | Status | Evidence / next action |
| --- | --- | --- |
| Core compiler and lightweight runtime | V1 — Implemented | TypeScript source, declarations, compiler/runtime tests |
| Authoring and application conventions | V1 — Implemented | Folder mode, optional `.vd`, JS/TS parity, layouts, CLI scaffolding |
| Production features | V1 — Implemented | Routing, requests, forms, SEO, content, localization, package subpaths |
| Developer intelligence | V1 — Implemented | `vd` inspection commands, compiler language helpers, testing utilities |
| VeloDom Lab | V1 — Experimental / Implemented slice | Optional Vite UI, safe protocol, runtime/compiler inspectors, production-leak test |
| Public package source | V1 — Implemented | Local `1.0.0` manifests, exports, package docs, starters, and consumer checks |
| Browser release gate | V1 — Current | Strict CI workflow exists; rerun it on the exact initial-release commit |
| npm registry state | External verification | No official release is represented; verify name/version state before first publication |
| Next-release authoring and rendering maturity | Next release — Planned | Resolve looped components, keyed updates, `.vd` lazy parity, and compiler development speed |
| Next-release developer intelligence | Next release — Planned | One project index, diagnostic quality, safe fixes, generated types, and thin CLI composition |
| Later-release extensions | Later release — Deferred | Optional integrations and tooling only after next-release contracts are proven |
| Hybrid rendering, AI, migration, CMS, and Edge | Research / Experimental | External or high-risk capabilities; never required by Core |

### Progress counter

**V1 implementation: complete. Local scaffolder/package gates: complete.**

`[####################] 100%`

**Next-release approved scope: 15 of 15 milestones complete.**

`[####################] 100%`

The repository is the local V1 source baseline. Registry availability,
authentication, tags, and releases are external state and are deliberately not
recorded as completed here. Repository tests never publish or prove registry
state.

### Status vocabulary

- **V1 — Implemented:** supported by source, tests, and public documentation.
- **V1 — Current:** part of the current release candidate or an active release
  gate; it is not a new product generation.
- **Next release — Planned:** approved, bounded follow-up work that must retain
  the V1 public model and pass its focused regression/performance gates.
- **Later release — Deferred:** useful work intentionally postponed until the
  next release creates the required contracts or release evidence.
- **Research / Experimental:** investigation or opt-in prototype only; it is
  not a runtime promise.
- **Rejected:** conflicts with VeloDom's identity or adds mandatory complexity.

## V1 Core — Implemented

- [x] TypeScript framework source with generated public declarations and ESLint.
- [x] HTML parser, source-aware diagnostics, safe expression AST/evaluator, and
  compiler-selected runtime feature manifests.
- [x] Preferred `vd-*` directives with backward-compatible `data-vd-*` names.
- [x] Text interpolation, escaped interpolation, and `vd-pre` literal regions.
- [x] Pages, nested routes, dynamic params, query values, guards, hashes,
  scroll restoration, focus management, and opt-in prefetch.
- [x] Router guards validate Vanilla JavaScript configuration and redirect
  targets, preserve global-before-page order, ignore stale async completions,
  and keep the address bar aligned when popstate navigation is blocked.
- [x] Reactive state, derived state helpers, lifecycle cleanup, abort signals,
  events, DOM refs, component refs, grouped/keyed refs, and `expose`.
- [x] Components, slots, scoped CSS, layouts, folder mode, and optional `.vd`
  pages/components/layouts using the same compiler and runtime contracts.
- [x] Requests, file routes, middleware, auth providers, request bindings,
  automatic result/loading/error state, cancellation, hooks, debounce,
  throttle, retry, and optional cache helpers.
- [x] Recoverable page/component boundaries, fatal error reporting, security
  diagnostics, and compiler accessibility warnings.

## V1 Authoring — Implemented

- [x] One-call `mountVeloDom()` bootstrap and explicit `createViteApp()` /
  `createApp()` escape hatches.
- [x] Folder conventions for `src/pages`, `src/components`, `src/layouts`, and
  `src/api`, with adapter-owned discovery and no filesystem logic in Core.
- [x] Convention discovery for API route and middleware modules, with explicit
  registries available when an application needs them.
- [x] Exported shallow `state` seeds plus optional `init()` lifecycle hooks.
- [x] JavaScript or TypeScript application files without an API difference;
  typed config is optional and TypeScript remains an optional peer dependency.
- [x] Focused `vd create` page demos, feature scaffolding, generated project
  declarations, aliases, route listing, and package-consumer setup.
- [x] Beginner-safe HTML examples that do not require JSX, TSX, render
  functions, or a global store.
- [x] Added root AI/contributor guidance plus `packages/velodom/AI_CONTEXT.md`, a concise
  generation contract that explains Core/application ownership, supported
  syntax, boundaries, and verification.
- [x] Added `examples/velodom-blog/README.md` so the showcase is an explicit consumer
  example rather than an accidental source of framework conventions.

## V1 Production — Implemented

- [x] Static SEO metadata, canonical/Open Graph/Twitter cards, JSON-LD,
  sitemap, robots, route entries, and visible no-JavaScript fallback content.
- [x] Explicit build-time `seo.renderPage` and `config.prerender` output with
  client takeover; this is not request-time SSR or DOM hydration.
- [x] `velodom/content` Markdown/frontmatter collections, SEO records, RSS,
  sitemap records, search-index records, and typed content metadata.
- [x] `velodom/localization` typed keys, native `Intl`, locale paths, canonical
  and `hreflang` records, and build-time dictionary diagnostics.
- [x] RTL direction management, logical CSS diagnostics, and optional RTL flip
  style generation.
- [x] Native progressive forms, optional validation plugin, request integration,
  server-owned redirects, CSRF, authentication, and validation policy.
- [x] Build-time asset inspection and responsive image attribute helpers.
- [x] Optional `velodom/node` Fetch-style Node HTTP adapter. It is a boundary
  for application-owned server behavior, not automatic SSR, sessions, cookies,
  auth policy, hydration, template rendering, or streaming.
- [x] Public package exports, strict tarball allowlist, package consumer checks,
  testing utilities, performance budgets, and production build verification.

## V1 Developer Experience — Implemented

The following intelligence stays in build/development tooling and does not add
application browser runtime weight:

- [x] `vd inspect`, `vd stats`, and `vd routes` for static project discovery.
- [x] `vd doctor` for compiler, route, component, refs, events, state,
  middleware, security, and maintainability diagnostics.
- [x] `vd graph` for JSON and Mermaid page/component/request/state relationships.
- [x] `vd health` for advisory performance, accessibility, SEO, security,
  bundle, dead-code, and maintainability signals.
- [x] `vd benchmark` and `vd build-report` for repeatable rendering and build
  composition reports without automatic optimization changes.
- [x] `vd docs` for generated route/component/API/state/event/ref documentation.
- [x] `vd types` for readable application-owned route/component declarations.
- [x] `vd init`, `vd create`, and `create-velodom` for convention-first project,
  page, component, API, middleware, plugin, and focused demo scaffolding.
- [x] Unified feature-based project creation with Minimal, Blog, and Empty;
  Recommended/Customize; JS/TS; CSS/Tailwind; optional ESLint, Prettier,
  route examples, i18n, tests, Git, install, server start, and scriptable flags.
- [x] Added a separate Node-only `create-velodom` npm-create wrapper while
  keeping `vd create`, `vd init`, and package binaries on one scaffolder core.
- [x] Verified a real Recommended dependency install and its ESLint, Prettier,
  TypeScript, and production-build commands; added isolated package cases for
  all three starters and the combined TS/Tailwind/i18n/Unit/E2E configuration.
- [x] Compiler-backed editor analysis/completion and the optional private
  `packages/velodom-vscode` workspace consumer.
- [x] `velodom/testing`, devtools bridge/inspector, and real-browser Playwright
  smoke coverage.
- [x] Experimental opt-in VeloDom Lab with route, mounted scope/component,
  state, binding, timeline, request/event, and compiler views over a versioned,
  bounded, read-only protocol.
- [x] `vd lab`, `vd explain`, focused `vd inspect` views, Lab setup diagnostics,
  optional scaffolder selection, package-manager-aware startup, HMR compiler
  refresh, and a production-artifact leakage gate.
- [x] Documentation checks for public exports, documented CLI commands, private
  imports, legacy roadmap labels, and removed-guide links.
- [x] Named-function JSDoc across all Core TypeScript modules, enforced by an
  AST-based documentation gate while emitted runtime JavaScript stays free of
  comment weight.
- [x] Source-derived documentation coverage for all public runtime/build values,
  preferred directive names, and CLI commands in the canonical one-file guide.
- [x] Source-derived showcase coverage for package entry points, public-value /
  directive / CLI totals, and obsolete syntax signatures that previously
  allowed teaching examples to drift from Core.
- [x] Project-intelligence literal-region handling so code shown inside
  `vd-pre` is compiled as documentation but excluded from static usage,
  reference, and event-handler reports.
- [x] Project-intelligence state discovery deduplicates repeated assignments and
  reads the recommended exported shallow state seed, including nested values.
- [x] Build/health output distinguishes optional lazy feature availability from
  application dead code and avoids optimization warnings for unused syntax
  families alone.
- [x] A polished application-owned academic reference that dogfoods public
  VeloDom APIs, shows literal HTML/JavaScript examples in `<pre><code>` blocks,
  and pairs key directives with live lessons without adding documentation UI to
  the framework runtime.
- [x] Showcase same-page hash links use full app-relative URLs so the router
  can preserve the route and scroll directly to the requested lesson section.
- [x] The showcase documents the remaining V1 data and presentation capabilities
  as dedicated lessons: API routes, middleware, auth, public cache/retry, RTL,
  native lazy images, and build-time asset helpers.
- [x] A separate `/reference` showcase route catalogs the complete public
  package surface and template vocabulary while `/features` remains the
  beginner-friendly guided course.
- [x] The feature-reference sidebar keeps its active tab synchronized with the
  URL hash, click navigation, viewport scrolling, and accessible focus state.
- [x] The `/reference` public API catalog reuses the same active-sidebar
  behavior and browser regression coverage.
- [x] The compact site navigation keeps a high-contrast icon and a distinct
  open state at tablet and small-desktop widths.
- [x] The shared primary navigation highlights the current route consistently
  in wide and compact menus and exposes the state to assistive technology.
- [x] The showcase now has a dedicated quality lesson for public page data,
  recoverable error boundaries, opt-in prefetch, and compiler safety signals.
- [x] Split interactive exercises into `/playground`, keeping `/features`
  readable and below the CLI large-template warning while dogfooding state,
  component props, slots, refs, expose, and declarative requests.
- [x] Project intelligence now detects object-form `expose` APIs, including
  JavaScript shorthand properties and method syntax.
- [x] Cross-browser documentation sidebars consume the router-restored
  `hashchange` contract and hold the selected tab until smooth scrolling is
  idle; the complete routing, single-file, requests, article, sidebar, and
  compact-navigation journeys pass in Chromium, desktop WebKit, and Mobile
  WebKit on the current refactor commit.

## V1 Ecosystem — Current

The verified public subpath list is generated from
`packages/velodom/package.json#exports` and currently contains:

```text
velodom
velodom/compiler
velodom/content
velodom/localization
velodom/node
velodom/assets
velodom/devtools
velodom/vite
velodom/vite-plugin
velodom/testing
velodom/cli
velodom/scaffolder
velodom/package.json
```

Current release work is governance rather than a new framework feature:

- [x] Prepare local `1.0.0` manifests, public exports, package-local docs,
  composable starters, installed-consumer checks, and dry-run tarball audits.
- [x] Keep the npm 10 clean-install compatibility entries required by the CI
  lockfile while preserving successful npm 11 local development.
- [x] Provide a strict Chromium, Firefox, WebKit, and Mobile WebKit workflow;
  local graphics limitations do not weaken the required release CI run.
- [ ] Choose the exact initial-release commit and run every package, build,
  performance, and strict browser gate on that commit.
- [ ] Verify the `velodom` and `create-velodom` registry names and versions at
  release time; local documentation must not guess their current availability.
- [ ] Obtain explicit owner approval, publish `velodom` first, then publish the
  matching `create-velodom`, and smoke-test `npm create velodom@latest` from a
  clean directory.
- [ ] Create the first official Git tag/GitHub release and move verified notes
  from `Unreleased` into the dated `1.0.0` changelog section.

## Next Stable Release — Approved Maturity Scope

The next stable release is a maturity release, not a redefinition of VeloDom. Every item below
must preserve HTML-first authoring, JavaScript/TypeScript parity, folder mode,
and zero browser cost for unused capabilities. A proposal moves to a later
section if it requires a new mandatory runtime abstraction, a compatibility
layer, or unproven analysis.

### P0 — Authoring, rendering, and Core quality

- [x] Make `vd-component` inside `vd-for` reliable: evaluate `vd-props` in the
  loop scope, preserve the current component contract, and add nested-loop,
  async-update, and browser regression coverage. This resolves the documented
  V1 authoring constraint instead of adding a second component syntax.
- [x] Improve keyed `vd-for` reconciliation for stable `vd-key` values so list
  reorders move, insert, and remove existing DOM/component instances where
  safe; preserve focus, form values, and component state. Keep conservative
  rebuild behavior for unkeyed or ambiguous lists.
- [x] Restore `.vd` lazy-loading parity with folder pages by extracting route
  configuration at build time without duplicate Vite imports or a different
  public page format.
- [x] Add an incremental compiler/HMR cache keyed by normalized source and
  compiler options, with invalidation and cold/warm-build benchmarks. It is a
  development/build optimization, never an application runtime cache.
- [x] Migrate Core typing to TypeScript `strict` in small verified slices:
  shared contracts and leaf modules first, then compiler, directives,
  mount/router, requests, CLI, and scaffolder. Do not change the JavaScript
  authoring API merely to satisfy the checker.
  - [x] Enforce the first strict slice for public/shared contracts,
    compiler/devtools protocol types, the build-time compiler cache, authoring,
    lifecycle, plugins, reactive state, refs, and shared leaf utilities.
  - [x] Migrate the compiler implementation and optimizer pipeline, including
    the safe expression parser and `.vd` source-position helpers reached by the
    public compiler entry.
  - [x] Migrate directive features and expression/runtime integration,
    including the auth, middleware, binding, and request-router dependencies
    reached by the declarative request feature.
  - [x] Migrate mount, page routing/matching, resource adapters, page data, and
    the directly reached event, style, SEO, lifecycle-hook, and error-boundary
    runtime dependencies.
  - [x] Migrate CLI/project intelligence and scaffolder modules, then enforce
    `strict` over every `packages/velodom/src/**/*.ts` source so future public,
    optional, adapter, and build modules cannot bypass the completed boundary.
    Request runtime dependencies are covered by the directive integration
    slice above.
- [x] Create one internal, build-time Project Index with source locations and
  compiler metadata. Existing CLI, language tools, generated declarations,
  documentation, graph, health, and Lab views must consume it incrementally
  rather than each gaining a separate project parser. The first completed slice
  centralizes discovery, source/config/script loading, `vd-pre` masking, and
  compiler results for CLI diagnostics, generated declarations, docs, graph,
  health, security, and build reports; editor/Lab consumers can adopt the same
  internal snapshot contract as their project-wide views expand.

### P1 — Diagnostics, typing, and focused developer workflows

- [x] Add stable diagnostic IDs, documented categories, source locations, and
  typo suggestions for compiler/route/component/request findings; extend
  `vd explain <code>` without changing deterministic offline behavior. Project
  diagnostics now use compiler, accessibility, component, configuration,
  maintainability, request, routing, security, state, or tooling categories;
  statically located template findings report line/column data and conservative
  nearest-name suggestions.
- [x] Add `vd check` as a non-destructive composition of compiler diagnostics,
  generated-type validation, `doctor`, route/reference checks, accessibility,
  security, and build sanity. It must report which checks actually ran and
  never silently substitute a production build for a browser test. Text and
  JSON reports enumerate compiler, references, security, build sanity,
  maintainability, and an explicit `browser: not-run` step; no source or build
  artifact is written.
- [x] Add `vd fix` only for reviewed, syntax-preserving fixes such as preferred
  `vd-*` aliases and deprecated request-state names. It must preview changes,
  leave business logic untouched, and never delete files automatically. The
  default is a line/column preview; `--write` is explicit, verifies that source
  still matches the Project Index snapshot, edits only HTML/`.vd` template
  regions, and supports only legacy `data-vd-*`, event, and request-state aliases.
- [x] Extend `vd doctor` through the Project Index with source-provable checks:
  invalid app-relative `vd-nav` links, impossible request targets, component
  prop/ref/expose mismatches, unused shallow state, and unreachable template
  handlers. Control-flow inference remains out of scope until it is reliable.
  Prop checks require an explicit `ComponentInitContext<Props>` interface/type;
  dynamic `vd-props` and dynamic state access remain deliberately unguessed.
- [x] Extend generated application declarations for TypeScript consumers with
  typed route parameters, request route names, and component-prop facts that
  can be proven statically. JavaScript users keep the same zero-configuration
  workflow and unprovable values remain `unknown`. `vd types` now combines
  route params and request names with individual/static-object prop usage plus
  required/optional facts from explicit `ComponentInitContext<Props>` contracts.
- [x] Expand `vd build-report` using Vite/Rollup metadata to attribute initial,
  route, shared, component, and lazy-feature chunks, including duplicated
  dependency cost when it can be measured accurately. The Vite plugin now emits
  a versioned, source-free `dist/velodom-build-meta.json`; the report derives
  chunk ownership and Rollup rendered-module duplication from that artifact and
  states when metadata is unavailable instead of guessing from minified text.
- [x] Add a narrowly scoped `vd add <feature>` installer for existing optional
  first-party capabilities (for example i18n, tests, or Lab). Start with an
  idempotent feature-installer contract and a generated-file manifest before
  considering removal or third-party packages. `vd add i18n|tests|lab` now
  preflights every write, refuses user-file/script conflicts, records created
  file hashes and controlled modifications in `.velodom/features.json`, and is
  idempotent without installing packages or creating a plugin marketplace.
- [x] Improve the optional, read-only Lab with a component ownership tree,
  state diffs, request waterfall, route-transition timeline, directive/source
  inspection, and copyable diagnostic commands. Keep source writes, mutable
  runtime state, payload capture, and secret collection out of the next release.
  The Lab now derives those views from bounded snapshots, correlates concurrent
  requests/navigation with internal development IDs, and copies only local
  `vd explain` commands through the browser Clipboard API.
- [x] Add `vd test` as a thin command for existing project tests plus compiler
  fixture, route, request-mock, component-interaction, and accessibility-smoke
  helpers. Browser, unit, component, and route filters must run real selected
  tests, not report a green placeholder. The command now selects an existing
  package script (`test`, `test:unit`, `test:browser`/`test:e2e`, or focused
  compiler/route/request/component/accessibility scripts), rejects missing or
  recursive scripts, and `velodom/testing` exposes deterministic helpers over
  the real compiler, router, DOM event, request-double, and accessibility paths.

## Later Releases — Deferred Extensions

These ideas fit VeloDom only as optional build/development integrations. They
need a bounded design, a public compatibility story, and tests after the
next-release Project Index and installer contracts are proven.

**Executable later-release scope: 2 of 7 milestones complete.**

`[######..............] 29%`

- [x] Expand the feature installer lifecycle with safe `vd remove`, `vd
  upgrade`, compatibility reporting, and shareable project presets. Removal
  must use generated-file manifests and refuse to delete user-owned changes.
  `vd features` now audits chained ownership hashes; `vd remove` restores
  reversible controlled files and deletes only unchanged generated files;
  `vd upgrade` transactionally reruns current first-party generators; and
  versioned JSON presets contain only allowlisted feature names/options.
- [x] Extend localization with pluralization, parameter interpolation, nested
  key groups, missing/unused-key reports, extraction/check commands, editor
  completion, and per-locale RTL validation while retaining build-time,
  application-owned dictionaries. Explicit `definePluralMessage()` leaves use
  native `Intl.PluralRules`; `{name}` interpolation stays text-only; static
  `vd i18n extract|check` never imports project code; diagnostics cover
  missing/extra/unused/unknown/direction facts; and dictionary completions are
  exposed for optional editor integrations.
- [ ] Add build-only CSS and asset intelligence: unused-selector and scoped-CSS
  duplication reports, route CSS attribution, logical-property suggestions,
  missing dimensions, oversized/duplicate/unused assets, responsive-variant
  checks, and LCP/preload advice. Do not add a CSS framework or automatic image
  transformation service.
- [ ] Evaluate an optional PWA build plugin with manifest validation, offline
  fallback, installability diagnostics, and explicit cache-strategy templates.
  It must not register a service worker or add runtime code unless enabled.
- [ ] Improve error diagnosis with hierarchical ownership reporting, error IDs,
  richer source stacks, grouped compiler/router/request errors, and a
  development-only overlay. Preserve the existing application-owned recovery
  boundary rather than imposing an error UI.
- [ ] Formalize plugin manifests with compatibility ranges, declared build,
  browser, and Node capabilities, conflict diagnostics, and conformance tests.
  Do not create an official marketplace or execute third-party plugins while
  validating their manifests.
- [ ] Expand browser/performance regression benchmarks and starter compatibility
  coverage as the new contracts land; checks remain release gates rather than
  browser runtime behavior.

## Research / Experimental Boundaries

Research items are deliberately not promises and must not become Core runtime
dependencies. A written design, runtime-budget comparison, and an opt-in proof
of concept are required before promoting any item to a later release.

- [ ] Investigate fine-grained dependency tracking as an internal optimization
  only. Shallow state remains the default; do not introduce a required signals
  API or wake unrelated subscriptions without proving semantics, cleanup, and
  runtime-size benefits.
- [ ] Evaluate an opt-in hybrid server-rendering boundary and route rendering
  modes that keep static output the default for applications that explicitly
  need request-time HTML.
- [ ] Evaluate compiler-generated islands or partial hydration only if ordinary
  HTML remains the authoring surface, no mandatory virtual DOM is introduced,
  and pages that do not opt in pay no hydration cost.
- [ ] Evaluate streaming and Edge adapters as separate contracts, not hidden
  behavior in the browser package.
- [ ] Evaluate critical-CSS extraction only as a deterministic build plugin;
  never make it a framework styling system or require a particular CSS tool.
- [ ] Evaluate an optional AI-provider interface and separate CLI review,
  explain, generate, or migration helpers. Support local/custom providers and
  never require API keys, network access, telemetry, or AI to use VeloDom.
- [ ] Evaluate HTML-to-VeloDom, React-to-VeloDom, and Vue-to-VeloDom migration
  helpers that output ordinary reviewable folders, never a compatibility
  runtime or an automatic source rewrite without review.
- [ ] Evaluate external CMS/deployment adapters that map typed records through
  `velodom/content` without credentials or remote browser fetching in Core.
- [ ] Evaluate locale negotiation, cookie/domain locale policy, full ICU
  parsing, and request-time translation providers outside the build-time
  localization helpers.

## V1 Explicit Non-Goals — Rejected

- Mandatory JSX or TSX, render-function UI, or a JavaScript-only template model.
- Mandatory virtual DOM, reconciliation layer, global store, or provider
  marketplace.
- Mandatory SSR server, hydration protocol, streaming runtime, or Edge policy.
- Built-in CSS framework, mandatory Tailwind/daisyUI, or opinionated design
  system.
- Required AI, CMS runtime, hosted service, telemetry, or network dependency.
- React/Vue/Angular compatibility layers that hide VeloDom's HTML contracts.
- Importing `packages/velodom/src` internals from application code.

## Verification Contract

Run from the workspace root before important commits:

```bash
npm test
npm run docs:check
npm run typecheck
npm run lint
npm run check
npm run package:check
npm run build
npm run pack:check
```

Run `npm run test:browser` for the real-browser matrix. For future versions,
do not publish, change package access, or run registry-dependent audit commands
without explicit owner approval.

## Historical Implementation Record

Earlier multi-phase checklists recorded useful implementation decisions. Their
implementation history remains traceable through `CHANGELOG.md` and `NOTES.md`;
the current roadmap groups the decisions by V1 capability instead of legacy
version labels. The important decisions retained are:

- compiler and Core ownership were separated from adapter filesystem discovery;
- the safe expression engine replaced `eval`/`new Function`;
- middleware, auth, request routes, layouts, localization, content, Node, and
  devtools were kept behind explicit contracts;
- folder mode and optional `.vd` files were kept as equivalent authoring
  layouts, while JavaScript and TypeScript remain equal application choices;
- request UX additions—automatic state, debounce, throttle, retry, cache,
  callbacks, and validation—were designed as explicit declarative helpers;
- page data and build-time static content were kept application-owned and safe
  to serialize instead of becoming an implicit server data layer;
- SEO/prerender and progressive forms were bounded as build/native enhancements,
  not mislabeled SSR or hydration;
- localization, RTL, content, and asset helpers were kept build-time or opt-in
  so sites without them do not carry their runtime cost;
- project intelligence, graphs, health, build reports, docs, and editor support
  were kept outside browser runtime weight;
- accessibility, security, route focus, hash navigation, and error boundaries
  were treated as release-quality behavior with regression coverage;
- package exports, documentation headers, public API names, and release gates
  were frozen through tests and human approval rules.

When a new feature is proposed, classify it under the status vocabulary first,
verify its implementation or tests, and update this roadmap before changing
Core. The guiding question is: does it make ordinary HTML applications easier,
safer, and more maintainable without adding unnecessary mandatory runtime
complexity?
