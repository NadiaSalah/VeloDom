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
- Idempotent `vd add i18n|tests|lab` installation with preflight conflict
  checks, explicit dependency installation, and a hashed generated-file /
  controlled-modification manifest at `.velodom/features.json`.
- Read-only Lab ownership hierarchy, recent state diffs, payload-free request
  waterfall, ID-correlated route timeline, directive/source inspection, and
  Clipboard-backed local diagnostic commands.
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

- Synchronized the academic showcase with the source-derived V1 contract: 13
  package exports, 63 public values, 43 preferred directives, and 19 CLI
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
