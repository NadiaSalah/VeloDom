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

### Fixed

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
  package exports, 63 public values, 43 preferred directives, and 16 CLI
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
