# Changelog

All important local changes to VeloDom are recorded here. The project is not
published yet, so entries describe development milestones rather than released
package versions.

## 2026-07-06

### SEO

- Added a typed page SEO contract stored in each page's existing `config.js`.
- Added runtime title, language, canonical, meta, Open Graph, Twitter Card,
  and JSON-LD synchronization across client-side navigation.
- Added production static HTML generation with concise visible fallback
  content for concrete routes.
- Added explicit build-time entries for dynamic routes and optional sitemap
  plus robots generation when a production `siteUrl` is configured.
- Excluded `noindex` routes from generated sitemaps.
- Added SEO declarations to the blog showcase, including `noindex` policies
  for private, editing, creation, error, and not-found pages.
- Added runtime/static renderer tests and extended the installed-package
  consumer to verify SEO generation from application-owned config.

### Packaging

- Reset the unpublished package line to `0.1.0` and documented Semantic
  Versioning rules in `RELEASING.md`.
- Added publishable ESM output under `lib/` and focused framework declarations
  under `types/`.
- Pointed all supported package exports to built JavaScript and generated
  declarations instead of raw TypeScript source.
- Added a strict npm file allowlist and automated package-contract audit.
- Added an isolated TypeScript/Vite consumer that installs and builds from the
  generated local tarball without network access.
- Rewrote emitted declaration imports from `.ts` to resolvable `.js`
  specifiers.
- Changed Vite resource discovery to project-root `/src` globs so adapter
  paths do not depend on the installed package location.
- Kept `private: true` as an intentional publication guard until package-name
  ownership and licensing are explicitly decided.

### Type Safety

- Removed the remaining explicit `any` annotations from component mounting,
  page routing, directive expressions, middleware, and request coordination.
- Added focused contracts for component page context, DOM cleanup ownership,
  middleware resolution, request bindings, and request error metadata.
- Expanded `@typescript-eslint/no-explicit-any` enforcement to every
  TypeScript file under `src/core`.
- Removed inferred `any` from generated declarations for the public package
  surface and migrated orchestrators; JSON payloads now resolve as `unknown`.
- Preserved the same runtime API for Vanilla JavaScript and TypeScript
  application authors.

### Documentation

- Added English responsibility headers to all 47 TypeScript files under
  `src/core`.
- Added JSDoc to every exported core function, class, interface, type,
  constant, and re-export group.
- Added focused architecture notes for compiler determinism, adapter injection,
  and lazy directive feature preparation.
- Added a dependency-free `npm run docs:check` audit and included it in the
  standard `npm run check` and production build gates.
- The audit also rejects adjacent duplicate JSDoc blocks to keep refactors from
  accumulating repeated documentation.

### Verification

- Core documentation audit covers 47 files.
- TypeScript, ESLint, all 80 tests, declaration generation, and the production
  build pass after the documentation update.
- TypeScript, ESLint, and all 80 tests pass after the orchestrator typing
  update.
- Package contract, ESM entry imports, all 81 tests, and the production build
  pass after packaging changes.
- `npm pack --dry-run` contains 142 allowlisted files, with no application,
  test, or workspace configuration files.
- The installed-package consumer passes strict TypeScript checking and a Vite
  production build using the packaged plugin and adapter.
- Runtime and static SEO tests bring the suite to 87 passing tests; the
  installed-package consumer and production build also verify generated SEO.

## 2026-07-05

### Changed

- Consolidated all framework-owned source under `src/core`.
- Moved resource adapters to `src/core/adapters`.
- Moved compiler, shared contracts, and the Vite plugin from `packages` into
  dedicated `src/core` subfolders.
- Added supported `velodom/compiler`, `velodom/vite`, and
  `velodom/vite-plugin` package entry points.
- Kept application-owned `pages`, `components`, `api`, and bootstrap files
  outside the framework folder.
- Declaration generation now removes stale output before running TypeScript.
- Consolidated repeated plain-object, folder-path, and protected-state helpers
  into tested modules under `src/core/shared`.
- Standardized application pages and components on preferred `script.js` or
  `script.ts` filenames, kebab-case component folders, and `vd-*` templates.
- Renamed the legacy `eventCard` component to `event-card`.
- Extracted expression scope and state-path operations from `directives.ts`.
- Extracted request target resolution, automatic status bindings, and
  cross-page write policy from `request-router.ts`.
- Updated runtime diagnostics to recommend preferred `vd-*` syntax.
- Replaced dynamic template execution with a tokenizer, parser, expression AST,
  and safe evaluator.
- Added compiler-time expression validation with source-aware diagnostics.
- Component props now use the same safe expression engine as directives.
- Replaced broad `any` contracts with `unknown`, generics, and focused
  interfaces across compiler, public records, adapters, router, auth, reactive
  state, lifecycle, plugins, HTTP, expressions, and errors.
- Corrected the public `navigate(path, pagePath?)` declaration to match its
  existing runtime implementation.
- Added scoped ESLint `no-explicit-any` enforcement to migrated framework
  boundaries.
- Page and component resource maps now carry compiled runtime manifests.
- Initial directive setup is asynchronous internally so feature chunks can load
  before lifecycle `mounted`; reactive updates remain synchronous.

### Added

- Safe expression support for literals, arrays, objects, operators, ternaries,
  optional chaining, trusted calls, and an allowlist of standard globals.
- Compile-time and runtime protection against prototype and constructor member
  access.
- Security regression coverage for computed constructor access, host-global
  traversal, dynamic function construction, and timer entry points.
- Added happy-dom integration coverage for reactive directives, model and event
  behavior, loop rerendering, component props/slots/refs/expose, grouped refs,
  state inheritance, page navigation, persistence, requests, and teardown.
- Added direct event-hub coverage for `on`, `off`, `once`, `emit`, and `clear`.
- Completed request-directive integration coverage for request config, request
  state automation, explicit bindings, cross-page allowlists, blocked writes,
  invalid configuration, success/error events, and cancellation.
- Completed error-system integration coverage for structured reports,
  fallback and parsed source locations, directive context, warning output,
  safe fatal-screen rendering, and duplicate-fatal suppression.
- Added typed, synchronous compiler optimizer extension points with validated
  output and named failure reporting.
- Added deterministic directive/runtime feature manifests for future
  feature-module tree-shaking.
- Added a visible completed/total progress counter to `todo.md`.
- Exported `UnknownRecord`, `ApiErrorOptions`, and `JsonRequestOptions` for
  TypeScript consumers.
- Split conditionals, text, visibility, bindings, model, events, requests, and
  loops into manifest-selected runtime modules.
- Added compiler discovery for custom component and slot tags.

### Optimized

- Production Vite template modules now omit development metadata by default.
- Compiler optimizers receive full metadata before production-only metadata
  fields are stripped.
- Showcase main entry decreased from 78.49 kB to 54.08 kB, and gzip size from
  25.86 kB to 17.88 kB, after lazy directive feature splitting.

### Fixed

- Loop rerenders and directive cleanup now dispose detached loop nodes and
  their event/subscription cleanups.
- Explicit local request loading/error bindings now remain on the current
  state instead of treating the local result target as an external page name.

### Security

- Upgraded Vite from the vulnerable 8.0.x range to 8.1.3 after npm reported
  Windows development-server advisories.

### Removed

- Removed the redundant private `packages` source layer.
- Removed empty `packages` directories left behind after consolidation.
- Removed all runtime usage of `new Function`.

### Verification

- TypeScript and ESLint checks pass.
- `npm test`: 80 tests passing.
- `npm run build`: production build successful.
- `npm audit`: zero known vulnerabilities.

## 2026-07-04

### Added

- TypeScript 6 and ESLint 10 development quality gates.
- Public framework contracts and generated declaration files.
- A TypeScript application example at `/features/typescript` while the blog
  remains Vanilla JavaScript.
- Standalone HTML template compiler under `packages/compiler`.
- Shared directive contracts under `packages/shared`.
- VeloDom Vite plugin under `packages/vite-plugin`.
- Generic route matcher with nested routes, dynamic params, query strings,
  metadata, guards, redirects, and configurable 404 handling.
- Formal page and component lifecycle with `mounted`, `destroy`,
  `onCleanup`, and `AbortSignal`.
- Configurable auth-provider runtime and optional server-session/localStorage
  provider helpers.
- Minimal plugin setup/cleanup contract.
- Structured resource-adapter validation.
- Blog showcase pages and reusable post-card, modal, and demo-panel
  components.
- Compiler, adapter, router, lifecycle, plugin, auth, middleware, and HTTP
  Node tests.

### Changed

- Migrated framework core, adapters, compiler, shared contracts, and Vite
  plugin source from JavaScript to TypeScript.
- Production builds now require type checking, ESLint, and declaration
  generation before Vite bundling.
- Application imports use the public `velodom` package boundary.
- Moved Vite-specific `import.meta.glob` discovery out of `src/core`.
- Application routes, middleware, resources, auth providers, and plugins are
  injected through `createApp`.
- Added one public framework entry at `src/core/index.ts`.
- Preferred page/component filenames are now `script.js` or `script.ts` and
  `config.js`; legacy filenames remain compatible.
- Preferred template syntax is `vd-*`; legacy `data-vd-*` remains compatible.
- Request cancellation now follows superseding requests and owner unmount.
- Core error hints no longer assume a particular application directory.

### Fixed

- Prevented bindings and nested directives inside inactive `vd-if` branches
  from evaluating unavailable data. Directives resume reactively when their
  branch becomes active.
- Made component `expose` members available to the component's own template as
  well as parent refs, fixing undefined handlers such as `announce()` and
  `close()`.

### Removed

- Legacy demo pages and components that duplicated the blog showcase.
- Application-owned middleware from the old core request location.

### Verification

- `npm test`: 35 tests passing.
- `npm run build`: production build successful.
