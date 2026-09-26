# Changelog

All notable public changes to VeloDom will be documented in this file.

VeloDom follows Semantic Versioning for the public `velodom` package. The
authoritative local package version is defined in
`packages/velodom/package.json`.

## Unreleased

The current repository is the V1 source baseline. Its package manifests use
`1.0.0`, but this changelog does not yet represent an official public release
or claim that a matching package is available from a registry.

### Added

- Unified retry cancellation across declarative requests and the optional
  retry wrapper. Aborted contexts and AbortError never retry; middleware stops
  before another operation, preserves cancellation, and rejects ignored-abort
  completions. Disposed/replaced bindings suppress late completion effects
  after async success callbacks. Added twelve regressions and removed the
  duplicate/uncancellable waits; running backend writes are never claimed to
  be rolled back. C05 remains open for page-data/router/refetch work.
- Hardened the existing optional request cache with bounded LRU/in-flight
  retention, GET coalescing with independent cancellation, header/credential
  identity, explicit private-scope fencing and pending-write invalidation.
  Moved cache coordination to one Core module and removed its superseded
  helpers while retaining public imports, custom keys and zero-TTL behavior.
  Added ten regression tests and installed-consumer option checks; C05 remains
  open for page-data/router/retry auditing rather than claiming full completion.
- Completed C04 with a large-application organization recipe, optional
  app-owned store wire contracts/JSDoc, explicit browser/server/deployment
  boundaries, and matching educational/AI guidance. The installed-package gate
  now inspects and builds both real reference consumers outside the workspace
  and strictly checks the JS HTTP wrapper plus the handbook's JS/TS snippets.
  Fixed two documentation links' explicit noopener attributes exposed by that
  gate. No Core API, discovery rule, starter, dependency or version changed.
- Completed the store backend/session boundary with a replaceable local HTTP
  fixture, server-session auth provider, guarded administration routes,
  authoritative cart tax/totals, CSRF-protected optimistic writes, idempotent
  no-charge mock orders, owner/role/tenant denial, expiry/logout/account-change
  behavior, private-cache headers, and abortable reads. Browser output is
  checked for server-only secrets; focused contract and production browser
  coverage close commerce milestones C02 and C03 without changing Core APIs.
- Extended `examples/velodom-store` with a separate administration layout and
  shared catalog repository: URL-backed server pagination, detail/edit routes,
  native validation, optimistic revision conflict recovery, focus-restored
  request feedback, readable statuses, and confirmed bulk publication actions.
  Deterministic unit/browser coverage proves failed/conflicting drafts remain
  intact. The completed C03 fixture now supplies actual session/role denial.
- Added the separate `examples/velodom-store` public-package consumer with
  deterministic catalog/product/cart/quote data, URL-backed filtering,
  versioned id/quantity-only persistence, direct product SEO entries, RTL, and
  an explicitly non-transactional checkout. Unit and desktop/mobile browser
  gates cover its critical state and navigation outcomes.
- Added one ordered Minimal + JavaScript + plain-CSS beginner journey to the
  shipped Quick Start and generated Minimal README. The installed-tarball gate
  now creates its documented component, applies the lesson, and builds it before
  the existing six-starter compatibility and size checks complete.
- Added source-tested list and progressive-form recipes that demonstrate
  loading, success, empty, request-error, native-invalid, and server-field-error
  states using existing directives and optional plugins.
- Added installed-tarball copy-to-project verification for the literal beginner
  lesson, generated component/scoped style, public favicon, and production asset
  URLs while retaining the existing Vite and browser parity coverage.
- Repository-only `pack:report` checks both real npm artifacts for allowed files,
  declared entry points, known private/generated paths, and download/install/file
  budgets while retaining debugging source maps. No new framework API or dependency.
- Tested two-file first-feature lesson on the teaching homepage, with an explicit
  distinction between the source repository, educational site, and generated starter.
- Organized repository checks into package/quality/browser/performance folders;
  npm entry commands remain stable and CI uses `browser:check`. ESLint now covers
  the current tools/tests/scripts paths instead of obsolete root folders.
- Consolidated repetitive root README history into links to the existing changelog
  and notes; added a separately counted V1 simplicity/adoption follow-up roadmap.

- HTML-first pages and components with compiler-validated `vd-*` directives,
  safe expressions, text interpolation, reactive state, lifecycle cleanup,
  refs, events, slots, scoped styles, and optional `.vd` single-file modules.
- Folder-first routing with nested and dynamic routes, params, query values,
  hash navigation, layouts, navigation guards, prefetch, focus management, and
  scroll restoration.
- Declarative requests with application-owned API routes and middleware,
  authentication providers, role checks, status state, cancellation, hooks,
  debounce, throttle, retry, optional caching, and progressive native forms.
- Build-time static SEO output, visible fallback content, canonical and social
  metadata, structured data, sitemap/robots helpers, content collections,
  localization, native `Intl` helpers, RTL direction support, and asset checks.
- Optional public package entry points for compiler, Vite, content,
  localization, assets, Node integration, devtools, testing, CLI, and project
  scaffolding without adding unused capabilities to the browser runtime.
- Local project intelligence through `vd inspect`, `doctor`, `stats`, `routes`,
  `graph`, `health`, `benchmark`, `build-report`, `docs`, and `types`.
- Experimental optional VeloDom Lab with a versioned read-only protocol,
  bounded safe serialization, mounted route/component/state/binding views,
  request/event timeline, compiler metadata, highlighting, search, themes,
  responsive UI, and Vite hot-update refresh.
- `vd lab`, deterministic `vd explain`, focused `vd inspect` views, Lab setup
  diagnostics, and an optional Lab choice in the shared project scaffolder.
- A shared project scaffolder used by `vd create`, `vd init`, package binaries,
  and the separate `create-velodom` wrapper. It composes Minimal, Blog, and
  Empty starters with optional JavaScript/TypeScript, CSS/Tailwind, ESLint,
  Prettier, route examples, localization, tests, Git, install, and startup.
- Package-local quick start, syntax reference, feature inventory, and AI
  guidance that ship with the package artifact.
- A repeatable compiler-cache benchmark that reports cold compilation, warm
  reuse, and an invalidated rebuild without imposing machine-specific timing
  as a release threshold.
- An internal build-time Project Index that discovers source resources once and
  shares cached template, companion script, page config, and compiler metadata
  across CLI inspection, diagnostics, types, docs, graph, health, security, and
  build reporting without becoming a browser API.
- Stable project diagnostic IDs and categories, source locations for statically
  located template findings, conservative component/request/directive typo
  suggestions, and deterministic `vd explain <diagnostic-code>` guidance.
- A read-only `vd check` composition that reports compiler, accessibility,
  relationship, security, build/configuration, generated-type, and
  maintainability steps while explicitly marking real browser tests as not run.
- Preview-first `vd fix` support for a reviewed syntax-only allowlist covering
  legacy directive/event attributes and the request-state alias, with an
  explicit guarded `--write` mode that never edits application scripts or
  deletes files.
- Project-Index doctor checks for invalid app-relative navigation, unwritable
  request targets, explicit TypeScript prop-contract mismatches, missing child
  expose members, and conservatively unused shallow state.
- Richer optional application declarations that preserve route parameters,
  request names, static `vd-props` keys, and required/optional facts from an
  explicit `ComponentInitContext<Props>` contract while retaining `unknown`
  value types.
- Versioned, source-free Rollup build metadata emitted by the Vite plugin and
  consumed by `vd build-report` for initial/route/component/shared/lazy-feature
  attribution plus measured rendered-module dependency duplication.
- Idempotent `vd add i18n|pwa|tests|lab` installation with preflight conflict
  checks, explicit dependency installation, and a hashed generated-file /
  controlled-modification manifest at `.velodom/features.json`.
- Read-only Lab ownership hierarchy, recent state diffs, payload-free request
  waterfall, ID-correlated route timeline, directive/source inspection, and
  Clipboard-backed local diagnostic commands.
- A thin `vd test` command that runs existing application package scripts for
  all, unit, browser, compiler, route, request, component, or accessibility
  layers and fails honestly when the selected layer is not configured.
- A dependency-free VeloDom CLI wordmark for interactive help and scaffolding,
  with ANSI colors only when requested/safe and explicit `--no-logo` and
  `--no-color` controls that keep JSON, version, CI, and piped output stable.
- Public `velodom/testing` compiler-fixture, route-resolution, recorded request
  mock, DOM-event, and compiler-backed accessibility-smoke helpers alongside
  the existing page and component mounts.
- Safe first-party feature lifecycle commands: `vd features`, hash-guarded
  `vd remove`, transactional `vd upgrade`, and versioned data-only
  `vd preset export/apply`. Controlled files carry reversible source snapshots;
  legacy or user-modified ownership entries are reported and never deleted.
- Optional localization plurals through `Intl.PluralRules`, named primitive
  interpolation, inferred/validated locale direction, typed key completions,
  stable missing/extra/unused/unknown/direction diagnostics, and static
  `vd i18n extract|check` project commands that never execute app modules.
- Build-only `vd inspect css|assets` intelligence with route/resource CSS
  attribution, cross-resource declaration duplication, conservative unused
  selectors, logical-property guidance, local asset hashes and references,
  intrinsic-dimension checks, responsive-image advice, and possible LCP hints.
- Optional `velodom/pwa` build integration with static manifest diagnostics,
  bounded declarative cache strategies, an explicit offline fallback and
  external registration asset, plus reversible `--pwa`/`vd add pwa`
  scaffolding. Projects that do not enable it receive no service worker or
  registration runtime.
- Structured runtime diagnostics with stable error IDs, bounded normalized
  source frames, compiler/router/request/component/runtime grouping, and
  hierarchical application ownership. Recoverable error hooks receive the
  structured report, while the opt-in `velodom/devtools` overlay observes and
  groups reports without taking over application fallback or retry behavior.
- Optional plugin manifests with exact plugin versions, documented VeloDom
  compatibility ranges, browser/build/Node capability declarations, duplicate
  and named-conflict diagnostics, plus a pure `inspectPluginConformance()`
  report that never executes third-party setup or cleanup code.
- Expanded release gates with mobile Chromium, unexpected browser-error
  detection, a six-case Minimal/Blog/Empty JavaScript/TypeScript starter matrix,
  generated-starter bundle ceilings, compiler/render benchmark execution, and
  browser-runtime size measurement derived from real public import reachability
  rather than unrelated optional package modules. Local browser checks now
  default to required desktop/mobile Chromium, while strict CI explicitly owns
  the complete five-target matrix; the static test server is force-closed after
  the gate so failed optional launches cannot retain it.
- An enforced first TypeScript `strict` slice for stable/shared contracts and
  low-dependency Core utilities, wired into normal checks and package builds.

### Changed

- Consolidated reusable framework behavior under `packages/velodom/src` and
  kept the documentation blog under `examples/velodom-blog` as an ordinary
  application consuming public package entry points.
- Replaced the obsolete standalone starter copy with composable shared files
  under `packages/velodom/templates/default` and starter-specific overlays
  under `packages/velodom/templates/starters`.
- Kept Vanilla JavaScript and TypeScript as equivalent application authoring
  choices while framework implementation and generated declarations remain
  typed.
- Kept static rendering, Node integration, editor intelligence, devtools, and
  project analysis optional and outside the default browser runtime.
- Split the tiny production inspection hook from the full development session
  and Lab UI so normal builds can remove all Lab bootstrap code.
- Added a plugin-instance incremental compiler cache keyed by normalized source
  and effective compiler options, with exact-source diagnostic safety,
  automatic source/HMR invalidation, and a bounded 256-entry LRU policy. The
  standalone compiler remains deterministic and uncached.
- Tightened reactive callback, dynamic init-result, and DOM-ref typing without
  changing emitted behavior or the Vanilla/TypeScript application contract.
- Expanded the enforced TypeScript `strict` boundary through the compiler and
  optimizer implementation, safe expression parser, language-service compiler
  path, and `.vd` source-position helpers. Internal AST, attribute, diagnostic,
  and optimizer-error contracts are now explicit without changing public
  template syntax or generated output.
- Expanded the same monotonic strict boundary through directive registration
  and lazy feature modules, safe-expression evaluation, and the auth,
  middleware, binding, and request-router dependencies used by declarative
  requests. Unknown thrown-value inspection is now shared instead of duplicated
  across compiler and request paths; public syntax and exports are unchanged.
- Expanded the strict boundary through component mounting, page routing and
  matching, resource-adapter validation, page data, scoped styles, runtime SEO,
  page events, lifecycle-hook dispatch, and recoverable error boundaries. The
  runtime contracts now narrow DOM roots, route state, component refs, lazy
  modules, and cleanup ownership without changing application authoring.
- Completed the staged TypeScript `strict` migration through CLI/project
  intelligence and scaffolding, then replaced the transitional file allowlist
  with `src/**/*.ts`. All package sources, including optional public subpaths,
  adapters, and Vite build modules, now enter the same strict gate automatically.
- Replaced repeated CLI template reads and compiler passes with the internal
  Project Index while preserving the existing `vd inspect --json` report shape.

### Fixed

- Forwarded the optional direction controller from the current page context to
  component lifecycle hooks and synchronized the public TypeScript context, so
  documented `ctx.direction` behavior now matches pages and components.
- Fixed production blog logos by importing assets through Vite rather than
  referencing `/src` from runtime templates; constrained playground grid cards
  and single-file lesson grids so wide code samples scroll internally on phones.

- Unified CLI parse and asynchronous error handling; made command help
  side-effect free; accepted branding flags during scaffolding and added
  narrow-terminal fallback. Git completion output now reflects actual setup.
- Removed false navigation errors for bound href expressions by reusing the
  compiler AST instead of a second regular-expression attribute parser.
- Corrected ARIA boolean tokens, case-sensitive CSS variables, and stale
  string-to-object style bindings. Existing generic HTML booleans are unchanged.
- Preserved readable diagnostics for unusual thrown values and excluded form
  values from diagnostic markup snapshots without touching the live DOM.
- Improved starter keyboard focus/responsive styles and documentation sidebar
  reachability/reduced motion. Corrected stale roadmap and SSR/hydration labels.

- Made the public application and plugin `navigate()` implementation honor its
  declared Promise contract even when an invalid or empty target is rejected.
- Reported a missing `#app` HTML-shell mount element as one actionable router
  diagnostic instead of allowing the optional error boundary to receive a null
  target and trigger a secondary failure.
- Restored `.vd` page lazy-loading parity by extracting only `<config>` as
  eager route metadata and reusing one lazy module loader for template, script,
  style, and manifest exports; production verification now rejects leakage of
  the showcase single-file page into the entry chunk.
- Reconciled stable keyed `vd-for` updates by moving existing DOM/component
  ownership ranges, preserving focus, form edits, listeners, refs, and local
  component state across reorder/insert/remove operations, with conservative
  rebuilding for unkeyed, ambiguous, or same-key/new-object items.
- Made components that own `vd-for` receive current and nested loop-scope
  values through `vd-props`, resolve dynamic component keys, remount after
  asynchronous list replacement, and dispose lifecycle/ref ownership safely.
- Corrected the Blog starter and `vd create feature --blog` output to pass
  expression-derived component values through `vd-props` instead of the
  static-string `vd-prop-*` family, and added empty/list rendering states.
- Corrected stale showcase examples for the root page convention, full-path
  hash navigation, progressive `vd-form`, and the localization formatter API.
- Hardened navigation guards against invalid handlers and unsafe redirects,
  prevented stale asynchronous navigation from winning races, and restored
  the active URL when history navigation is blocked.
- Supported same-route hash scrolling without remounting and kept navigation
  focus and sidebar state aligned with route/hash changes.
- Improved expression diagnostics, optional access handling, recoverable page
  and component boundaries, request-state validation, and source-aware errors.
- Made generated projects reject unsafe paths, non-empty destinations, unknown
  or contradictory flags, and Windows-reserved names.
- Made Windows package-manager execution reliable and ensured generated
  Prettier projects pass their format check immediately.
- Added a production output scan that rejects Lab globals, endpoints, or UI
  bootstrap imports in emitted application JavaScript.
- Made the development-only Lab bootstrap use a Vite-resolvable module URL and
  made the router discover plugin-installed inspection sessions at navigation
  time, so the initial route, page, components, state, and events are visible.

### Documentation

- Synchronized the academic showcase with the source-derived V1 contract: 14
  package exports, 80 public values, 43 preferred directives, and 25 CLI
  commands, including every supported package entry point.
- Added named-function JSDoc coverage across all framework TypeScript modules
  and made the documentation gate reject undocumented function declarations.
- Consolidated the repository handbook, roadmap, engineering decisions, and
  release policy under `docs/` while keeping consumer and AI references beside
  the publishable package.
- Documented the HTML-first authoring model, folder and `.vd` conventions,
  public imports, routing, requests, middleware, auth, SEO, localization, RTL,
  testing, scaffolding, and explicit non-goals.
- Standardized the showcase documentation path as `examples/velodom-blog` and
  added an audit that rejects the obsolete pre-rename path in maintained
  current-state guides.

### Tooling

- Made the documentation consistency audit validate the live showcase counts,
  package map, CLI list, and known obsolete syntax patterns.
- Removed comments from compiled JavaScript while preserving documented source
  and declaration output, keeping documentation quality out of runtime weight.
- Added package-boundary, installed-tarball, generated-starter, documentation,
  TypeScript, ESLint, production-build, performance-budget, and real-browser
  verification gates.
- Added isolated checks for both `velodom` and `create-velodom`, including
  representative JavaScript/TypeScript, Tailwind, localization, and test
  combinations.

## Pre-public development

VeloDom went through private repository and registry experiments before the
current public-source baseline was established. Those discarded experiments,
temporary package uploads, and internal development milestones are
intentionally not part of the official public release history.

No official public release is represented above yet. When V1 is deliberately
released, move the verified user-visible entries from `Unreleased` into a
dated `1.0.0` section and record only that official release onward.
