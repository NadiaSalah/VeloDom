# VeloDom TODO

## Goal

This file turns the current framework review into a practical roadmap.

The current priority is not adding random features.  
The priority is to make the existing core stable, clear, documented, and release-ready.

---

## Progress Counter

**396 of 408 tasks completed — 97%**

`[###################-]`

Remaining tasks: **12**

Update this counter whenever checklist items are added or completed.

Checked research/design items mean the analysis or architecture decision is
complete; they do not imply that every researched future feature is shipped.

---

## Priority Gap Map

This is the practical answer to "what VeloDom still lacks" after comparing its
current capabilities with mature frontend frameworks. The order protects the
HTML-first identity: reliability and developer clarity come before adding more
runtime concepts.

### P0 — Required Before a Public V1

1. Freeze the public API and package naming.
2. Finish task-oriented documentation and recipes.
3. Add real-browser E2E coverage for the defined browser support policy.
4. Establish an accessibility baseline for compiler output and navigation.
5. Add recoverable page/component error boundaries instead of relying only on
   the fatal application screen.
6. Complete licensing, package ownership, and release approval checks.

### P1 — Important for Everyday Applications

1. Provide simple optional form validation integrated with requests.
2. Add declarative request debounce, throttle, retry, caching, and hooks.
3. Add router scroll restoration, focus management, hash navigation, and
   opt-in prefetch.
4. Provide project scaffolding, testing utilities, and route/manifest
   inspection commands.
5. Add explicit performance budgets for runtime and generated chunks.

### P2 — Powerful but Intentionally Deferred

1. Improve optional build-time static content/client-takeover workflows without
   changing normal HTML authoring.
2. Keep shared state, validation extensions, cache providers, and devtools as
   optional plugins.
3. Consider broader SSR/hydration only after a proven design protects the
   HTML-first model and lightweight runtime.

---

## Phase Z: V1 Release Polish and Documentation Truth

This phase keeps VeloDom V1 truthful and publish-ready without adding large
runtime features.

- [x] Remove the stale README limitation that described the local public V1 API
  freeze as missing.
- [x] Clarify static SEO/content terminology so `seo.renderPage` client
  takeover is not confused with SSR or hydration.
- [x] Fix the README Verification and Release Decision section ordering.
- [x] Remove duplicated Content Mode wording from README.
- [x] Replace stale Phase H constraints in NOTES with the current showcase
  status.
- [x] Clarify that checked research roadmap items are completed decisions, not
  shipped future features.
- [x] Reconcile `docs/CONTENT_MODE_DESIGN.md` with the implemented
  `velodom/content` package subpath.
- [x] Update `docs/DX_RUBRIC.md` so graph, health, build-report, docs, and
  maintainability analysis are no longer mislabeled as V2-only work.
- [x] Keep Future Research items clearly research-only and outside the browser
  runtime.
- [x] Audit README positioning against `docs/FRAMEWORK_IDENTITY.md`.
- [x] Synchronize current release-verification results after running the local
  release-gate commands.
- [ ] Run strict full browser matrix with all intended Playwright browsers
  installed.
- [x] Verify deployment/static-SEO behavior against the documented generic
  hosting contract.
- [ ] Confirm npm package ownership/reservation and publication account.
- [ ] Confirm npm access level, 2FA policy, final release notes, and tag
  decision before removing `private: true`.
- [ ] Review locked workspace dependency advisories through the npm registry
  after the owner explicitly approves sending dependency metadata; the
  published `velodom` runtime itself currently has no direct dependencies.

Strict browser note: Firefox and WebKit Playwright binaries were installed
locally on 2026-08-16. Strict WebKit and mobile WebKit passed, but Firefox
headless timed out with a local graphics/compositor launch error. A strict
retry on 2026-08-17 again stalled during Firefox startup after Chromium and all
build/package gates passed, so the full matrix remains pending for CI or a
Firefox-capable release machine. A further strict attempt on 2026-08-24
stalled before the browser summary and was stopped after a safe timeout.

---

## Phase Y: Beginner-First V1 Authoring

This phase reduces application boilerplate through visible folder conventions
while preserving the explicit `createApp()` path for advanced integrations.

- [x] Add `mountVeloDom()` as the recommended one-call Vite bootstrap.
- [x] Add `createViteApp()` for applications that need an app handle before
  mounting without wiring the resource adapter manually.
- [x] Discover optional `src/api/routes.js|ts` and
  `src/api/middleware.js|ts` registries by convention, with explicit options
  taking precedence.
- [x] Reject ambiguous JavaScript/TypeScript registry pairs and malformed
  default exports with actionable startup errors.
- [x] Update `create-velodom` output to generate a complete accessible HTML
  shell and the beginner bootstrap instead of the obsolete `mount("#app")`
  call.
- [x] Remove stale hard-coded framework line numbers from global error reports
  so stack-derived locations survive refactors.
- [x] Replace the showcase's full daisyUI stylesheet import with its Tailwind
  plugin, reducing production CSS from about 1.16 MB to about 70 KB.
- [x] Split the large CLI implementation into analyzer, reporter, and scaffold
  modules without changing commands or output contracts — Target: V1.x.
- [x] Design build-time support for typed page config without breaking static
  SEO loading or requiring TypeScript from Vanilla projects — Target: V1.x.
- [x] Separate the publishable `velodom` npm package from the application
  showcase, make the blog a real workspace consumer, and generate optional
  `@` plus `#app/*` client import aliases — Target: V1.x.
- [x] Consolidate repository-level Markdown documentation under `docs/` while
  keeping concise root and npm-package README entry points — Target: V1.x.
- [x] Add an optional CSS budget to build intelligence with no framework
  default: projects may opt in through `VELODOM_CSS_BUDGET_KB`, so a chosen
  design system is never punished — Target: V1.x.
- [ ] Add tested minimal/blog starter presets only after the npm installation
  path is publicly available — Target: V1.x.

---

## Phase 0: Compiler Foundation

The compiler is the long-term architectural center of VeloDom. New template
features should be evaluated for compile-time implementation before adding
runtime work.

### 0.1 Template Frontend

- [x] Create a standalone compiler module with no DOM dependency
- [x] Parse HTML start tags and attributes into a small template AST
- [x] Preserve source offsets for compiler diagnostics
- [x] Recognize preferred `vd-*` directives
- [x] Keep `data-vd-*` directives backward compatible
- [x] Transform `vd-on:event.modifier` into runtime event metadata
- [x] Transform `vd-bind:name` into runtime binding metadata
- [x] Validate unknown or malformed directives at compile time

### 0.2 Compiler Output

- [x] Generate normalized HTML for the current runtime
- [x] Generate serializable directive metadata
- [x] Add development diagnostics with file and source locations
- [x] Add production mode with diagnostics stripped
- [x] Define optimizer and tree-shaking extension points
- [x] Add compiler tests for directives, nested HTML, comments, scripts, and quoted attributes

### 0.3 Vite Integration

- [x] Create a VeloDom Vite plugin
- [x] Compile page and component HTML during Vite load/build
- [x] Keep the runtime free from preferred-syntax normalization
- [x] Surface compiler diagnostics through Vite
- [x] Preserve lazy page and component chunks
- [x] Support optional `.vd` single-file pages and components without replacing folder mode

### 0.4 TypeScript Migration

- [x] Add TypeScript as a framework development dependency
- [x] Migrate shared/compiler contracts first
- [x] Migrate core runtime and adapters to TypeScript
- [x] Generate declaration files for the public API
- [x] Clear stale declaration output before each generation
- [x] Keep JavaScript and TypeScript identical for application authors
- [x] Add a typed application page using the same page lifecycle API
- [x] Tighten permissive internal compatibility types incrementally
- [x] Remove explicit `any` annotations from dynamic core orchestrators
- [x] Enforce `no-explicit-any` across every TypeScript file in `packages/velodom/src`

### 0.5 Code Quality

- [x] Add ESLint with TypeScript support
- [x] Lint framework TypeScript and application JavaScript/TypeScript
- [x] Make typecheck and lint required by the production build
- [x] Keep tests runnable directly against TypeScript source

### 0.6 Safe Expression Engine

- [x] Add a standalone tokenizer and expression parser
- [x] Generate an expression AST without browser globals
- [x] Replace runtime `new Function` usage with a safe evaluator
- [x] Preserve method receivers and reactive state function calls
- [x] Support literals, collections, operators, calls, and optional chaining
- [x] Restrict globals to an explicit safe allowlist
- [x] Block prototype and function-constructor member access
- [x] Validate directive expressions during compilation
- [x] Report expression diagnostics with source offsets
- [x] Document intentionally unsupported JavaScript syntax

### 0.7 Code Documentation Standards

- [x] Add an English responsibility header to every TypeScript file in `packages/velodom/src`
- [x] Add JSDoc to every exported core function, class, interface, type, and constant
- [x] Enforce core headers and exported JSDoc through `npm run docs:check`

### Phase 0 Acceptance Criteria

- [x] Preferred `vd-*` syntax works in page and component HTML
- [x] Text interpolation `{{ expression }}` compiles to safe reactive text bindings
- [x] Interpolation escape `\{{ expression }}` and raw `vd-pre` sections preserve literal examples
- [x] Existing `data-vd-*` templates continue working unchanged
- [x] Malformed directives fail during development build
- [x] Compiler modules run under Node without browser globals
- [x] Production build uses compiler output and passes all framework tests
- [x] Framework TypeScript, declarations, and ESLint checks pass
- [x] Runtime and component props contain no `eval` or `new Function`

---

## General Framework Roadmap

The goal of this roadmap is to make the VeloDom core reusable for building
different kinds of websites, while keeping application code outside `packages/velodom/src`.

### Phase A: Core Boundaries

- [x] Isolate all `import.meta.glob(...)` usage in the Vite adapter
- [x] Inject page and component resources into `createApp(...)`
- [x] Inject optional layout resources into `createApp(...)` for shared page shells
- [x] Keep filesystem folder conventions inside the adapter, not the router
- [x] Inject application routes and middleware into `createApp(...)`
- [x] Provide one public request API through `packages/velodom/src/requests/index.ts`
- [x] Keep named framework constants inside `packages/velodom/src/constants.ts`
- [x] Add tests for the Vite adapter resource maps
- [x] Consolidate all framework-owned source under `packages/velodom/src`
- [x] Expose build integrations through supported package subpaths

### Phase A Acceptance Criteria

- [x] Runtime modules outside `packages/velodom/src/adapters` contain no `import.meta.glob(...)`
- [x] Nested page and component folders are indexed by adapter paths
- [x] Core router and component mounting work from injected resource maps
- [x] Missing or invalid adapters fail with structured startup errors

### Phase B: Configurable Auth

- [x] Replace fixed auth modes with an auth provider interface
- [x] Support a configurable default auth provider
- [x] Move demo localStorage auth configuration outside core
- [x] Keep server-session and localStorage providers as optional core helpers
- [x] Pass request context and `AbortSignal` to auth providers
- [x] Add tests for custom auth providers
- [x] Add direct tests for role checks

### Phase C: Public Framework API

- [x] Support `createApp({ routes, middleware })`
- [x] Export the complete supported public API from one entry file
- [x] Prevent application code from importing internal core files
- [x] Document public APIs separately from internal APIs
- [x] Freeze public names before publishing the package

### Phase D: Lifecycle

- [x] Add a formal `mounted(context)` hook
- [x] Add a formal `destroy(context)` hook
- [x] Add `context.onCleanup(callback)`
- [x] Expose a lifecycle `AbortSignal`
- [x] Run page cleanup before navigation
- [x] Run component cleanup before unmount
- [x] Add lifecycle ordering and cleanup tests

### Phase E: Generic Router

- [x] Add route params such as `/posts/:id`
- [x] Add parsed query-string access
- [x] Add navigation guards
- [x] Add route metadata
- [x] Preserve lazy page loading through adapters
- [x] Keep 404 behavior configurable
- [x] Add tests for params, query strings, guards, and route matching
- [x] Add scroll restoration and hash-fragment navigation
- [x] Move focus predictably after navigation for keyboard and screen-reader users
- [x] Add opt-in route prefetch without forcing eager page loading

### Phase F: Optional Plugins

- [x] Define the smallest useful plugin contract
- [x] Support `createApp({ plugins: [] })`
- [x] Add plugin setup and cleanup
- [x] Keep validation optional
- [x] Keep shared state optional
- [x] Keep cache, retry, and devtools optional
- [x] Avoid adding SSR until the browser framework core is stable

### Phase G: Release Hardening

- [x] Remove remaining application assumptions from core errors and hints
- [x] Add source-aware errors for adapters and user files
- [x] Complete router, component, directive, request, and lifecycle tests
- [x] Add package exports and semantic versioning rules
- [x] Build publishable ESM and declaration artifacts from `packages/velodom/src`
- [x] Validate package entry points and the npm file allowlist before packing
- [x] Add a minimal package-consumer example
- [x] Type-check a consumer against the installed package declarations
- [x] Build a consumer through Vite from an installed local tarball
- [x] Benchmark common page and loop rendering cases
- [x] Choose a project license and confirm npm package-name ownership
- [x] Define the supported browser matrix and automated browser targets
- [x] Add real-browser E2E tests for routing, forms, requests, and no-JavaScript SEO
- [x] Expand real-browser E2E automation to Firefox, WebKit, and a mobile WebKit viewport profile
- [x] Document a release approval checklist without automating publication

### Phase H: Blog Showcase Application

After the generic core is stable, replace the current demo application with a
complete blog project whose files remain under `src/pages`, `src/components`,
and `src/api`.

- [x] Create a blog home page with reactive post lists and loops
- [x] Create a post details page using route params and requests
- [x] Create a CRUD studio page using forms and `vd-model`
- [x] Create an auth/login page demonstrating auth providers and request state
- [x] Create reusable nav, post card, loader, form, modal, and error components
- [x] Demonstrate props, slots, refs, grouped refs, `expose`, and page events
- [x] Demonstrate every conditional, binding, model, loop, and event directive
- [x] Demonstrate request result/loading/error state and cancellation
- [x] Demonstrate application middleware and advanced pipeline middleware
- [x] Demonstrate safe cross-page writes through `config.js`
- [x] Add a framework features page linking to every working example
- [x] Add intentional error examples with structured framework reporting
- [x] Remove legacy demo pages that duplicate or contradict the final API
- [x] Verify the complete blog with tests and a production build

### Phase I: Server-Delivered SEO

- [x] Add a typed `seo` contract to the existing page `config.js`
- [x] Validate and normalize page SEO at the resource-adapter boundary
- [x] Synchronize document head metadata during client-side navigation
- [x] Restore the base title and language when a page has no SEO declaration
- [x] Emit route-specific HTML after a Vite production build
- [x] Include a concise visible page summary in server-delivered HTML
- [x] Support concrete build-time entries for parameterized routes
- [x] Support `noindex` for private, action, and development pages
- [x] Support canonical, Open Graph, Twitter Card, and JSON-LD metadata
- [x] Generate sitemap and robots artifacts when `siteUrl` is configured
- [x] Exclude `noindex` routes from generated sitemaps
- [x] Test runtime, static rendering, and installed-package consumption
- [x] Add an application-defined API/CMS data hook for dynamic SEO entries
- [x] Add optional app-provided static route content with explicit client
  takeover
- [x] Add structured-data validation fixtures for common content types

---

## MVP Complete

### 1. Core Stability

- [x] Add tests for page routing
- [x] Add tests for component mounting and unmount cleanup
- [x] Add tests for refs collection
- [x] Add tests for grouped component refs with `data-vd-key`
- [x] Add tests for event bus behavior: `on`, `off`, `once`, `emit`
- [x] Add tests for page state persistence
- [x] Add tests for child state inheritance and local override behavior

### 2. Directives Coverage

- [x] Add tests for `data-vd-if`
- [x] Add tests for `data-vd-elseif`
- [x] Add tests for `data-vd-else`
- [x] Add tests for `data-vd-show`
- [x] Add tests for `data-vd-text`
- [x] Add tests for `data-vd-model`
- [x] Add tests for `data-vd-class`
- [x] Add tests for `data-vd-style`
- [x] Add tests for `data-vd-attr`
- [x] Add tests for `data-vd-value`
- [x] Add tests for `data-vd-src`
- [x] Add tests for `data-vd-href`
- [x] Add tests for `data-vd-alt`
- [x] Add tests for `data-vd-disabled`
- [x] Add tests for `data-vd-checked`
- [x] Add tests for `data-vd-for`
- [x] Add tests for event directives and modifiers

### 3. Request System Stability

- [x] Add tests for `data-vd-request`
- [x] Add tests for `data-vd-request-config`
- [x] Add tests for `data-vd-request-state`
- [x] Add tests for explicit `state` together with `params`, `target`, `loading`, and `error`
- [x] Add tests for explicit `params`, `target`, `loading`, and `error`
- [x] Add tests for current-page request writes
- [x] Add tests for cross-page request writes
- [x] Add tests for blocked external writes
- [x] Add tests for page config `allowExternalWrite`
- [x] Add tests for request auth modes
- [x] Add tests for application middleware resolution
- [x] Add tests for middleware params transforms
- [x] Add tests for advanced middleware using `next()`
- [x] Add tests for request error events
- [x] Add tests for request success events

### 4. Error System

- [x] Add tests for structured runtime error formatting
- [x] Add tests for file/line/column reporting
- [x] Add tests for directive-specific error messages
- [x] Add tests for fatal error screen behavior
- [x] Add tests for invalid request config reporting
- [x] Add tests for invalid external write reporting

### 5. Naming and API Freeze

- [x] Freeze naming for `page-router` and `request-router`
- [x] Decide whether `data-vd-request-state` keeps its current name or becomes a clearer alias
- [x] Freeze request naming convention: `Result`, `Loading`, `Error`
- [x] Freeze component public API pattern: `expose`
- [x] Freeze page opt-in external write pattern: `page.config.js`

---

## V1 Release

### 6. Documentation

- [x] Split docs into clear sections:
- [x] Getting Started
- [x] Pages
- [x] Components
- [x] Refs
- [x] Emit vs Ref vs Request
- [x] Directives
- [x] Request Router
- [x] Auth and Middleware
- [x] Error Handling
- [x] Best Practices
- [x] Recipes
- [x] Deployment and SPA/static-host rewrite configuration
- [x] SEO, static route generation, and dynamic-entry recipes

### 7. Practical Recipes

- [x] Add recipe: simple page state
- [x] Add recipe: component with `expose`
- [x] Add recipe: `ref` group with `key`
- [x] Add recipe: component emits event to page
- [x] Add recipe: simple request in same page
- [x] Add recipe: request using `data-vd-request-config`
- [x] Add recipe: request using `data-vd-request-state`
- [x] Add recipe: request writing to another page
- [x] Add recipe: allowing external page writes safely
- [x] Add recipe: auth-protected request
- [x] Add recipe: request with application middleware
- [x] Add recipe: form create/update/delete
- [x] Add recipe: common framework error examples

### 8. Lifecycle

- [x] Formalize `destroy` hook
- [x] Document `init` object signature as the preferred style
- [x] Add and document the `mounted` hook
- [x] Expose `onCleanup` and lifecycle `AbortSignal`

### 9. Project Polish

- [x] Review folder naming consistency inside `packages/velodom/src`
- [x] Consolidate duplicate object and path helpers under `packages/velodom/src/shared`
- [x] Extract expression/state-path logic from the directive orchestrator
- [x] Extract target and cross-page policy from the request router
- [x] Review internal naming consistency across `pages`, `components`, and `api`
- [x] Review demo pages for consistency with final API style
- [x] Remove legacy application examples that no longer represent the preferred API

---

## V1.5 Improvements

### 10. Request UX

- [x] Add automatic request cancellation on supersede and unmount
- [x] Add request debounce support
- [x] Add request throttle support
- [x] Add request retry option
- [x] Add redirect behavior on auth failure
- [x] Add global before-request hook
- [x] Add global after-request hook
- [x] Add request success callback pattern if needed

### 11. Forms and Validation

- [x] Design a simple validation API
- [x] Add built-in required validation
- [x] Add built-in min/max validation
- [x] Add built-in pattern validation
- [x] Add validation error state conventions
- [x] Integrate form validation with request flow

### 11.1 Accessibility and Recovery

- [x] Add compiler accessibility diagnostics for images, controls, labels, and headings
- [x] Define an application error-boundary hook with a recoverable fallback
- [x] Define an optional component-level error boundary
- [x] Support retry or safe navigation from recoverable runtime failures
- [x] Add keyboard, focus-order, and semantic-output integration tests

### 11.2 RTL and Multilingual CSS

- [x] Add optional direction plugin for document `lang` and `dir`
- [x] Add explicit `vd-rtl-flip` marker and manifest feature
- [x] Add advisory logical-property diagnostics for folder CSS and `.vd` style blocks
- [x] Add UTF-8 application-shell diagnostics
- [x] Add scoped CSS `:global(...)` escape for ancestor direction selectors
- [x] Add optional project-owned RTL icon flip stylesheet helper
- [x] Add full `.vd` style-block RTL diagnostics coverage
- [x] Research a future i18n translation plugin separately from RTL presentation

### 12. Performance

- [x] Review re-render behavior in loops
- [x] Reduce unnecessary full-block updates where possible
- [x] Improve granular updates for large pages
- [x] Benchmark common UI cases
- [x] Enforce agreed runtime and generated-chunk performance budgets
- [x] Split runtime directive features into manifest-selectable modules
- [x] Type remaining dynamic mount, directive, and request orchestrator boundaries

---

## V2 Ideas

### 13. Shared State

- [x] Decide if the framework truly needs a global store
- [x] If needed, design the smallest useful shared state API
- [x] Keep shared state optional, not mandatory

### 14. Developer Tooling

- [x] Create a `create-velodom` project scaffolding command
- [x] Create CLI for page scaffolding
- [x] Create CLI for component scaffolding
- [x] Create CLI for API file scaffolding
- [x] Create CLI for demo scaffolding
- [x] Add public test utilities for mounting pages and components
- [x] Add a development command to inspect discovered routes and feature manifests

### 14.1 Future DX Acceptance Rules

Modern developer experience work is allowed only when it strengthens VeloDom's
identity instead of copying larger frameworks. DX tooling should prefer static
analysis, compiler metadata, build reports, and optional providers. It must not
add mandatory runtime state, JSX/TSX authoring, virtual-DOM concepts, or hidden
configuration-heavy behavior.

- [x] Define a DX feature rubric before implementation — Fit: protects HTML-first/compiler-first decisions; Value: prevents feature bloat; Complexity: low; Target: V1.x
- [x] Keep every DX feature usable without AI or cloud services — Fit: preserves Vanilla Friendly and offline workflows; Value: predictable local development; Complexity: low; Target: V1.x
- [x] Keep DX analysis outside the browser runtime by default — Fit: preserves Runtime Lightweight; Value: safer diagnostics without app-size cost; Complexity: medium; Target: V1.x

### 14.2 Project Intelligence

Static project intelligence fits VeloDom because folders, templates,
directives, route configs, and compiler metadata already describe most project
relationships. The first version should be static, local, and deterministic.

- [x] Design a project analyzer manifest that reads pages, components, API routes, middleware, CSS, refs, events, and SEO configs — Fit: compiler/folder-first; Value: one source of project truth; Complexity: medium; Target: V1.x
- [x] Add `vd inspect` to list discovered pages, components, routes, request routes, middleware, and compiler features — Fit: convention over configuration; Value: explains automatic discovery; Complexity: medium; Target: V1.x
- [x] Add `vd doctor` to detect missing components, broken component paths, invalid `vd-*` usage, invalid config shapes, and broken request references — Fit: compile-time validation; Value: catches common mistakes early; Complexity: medium; Target: V1.x
- [x] Detect broken refs, duplicate state names used across one template scope, unknown event handlers, and unsafe directive expressions before runtime — Fit: compiler-first; Value: fewer runtime surprises; Complexity: medium; Target: V1.x
- [x] Detect unused components, unused routes, unused middleware, dead API handlers, and unreachable showcase files without deleting anything automatically — Fit: static analysis; Value: reduces project clutter; Complexity: medium; Target: V2
- [x] Detect circular component dependencies and large page/component folders with actionable warnings — Fit: folder-first maintainability; Value: prevents slow builds and confusing composition; Complexity: medium; Target: V2
- [x] Generate `vd stats` project statistics for route count, component count, directive usage, request usage, SEO coverage, and test coverage signals — Fit: build-time metadata; Value: clear project health snapshot; Complexity: low; Target: V1.x

### 14.3 CLI Experience

CLI work should reduce boilerplate around VeloDom's conventions. It should
scaffold normal `index.html`, `script.js`/`script.ts`, `style.css`, and
`config.js` files, not introduce a new component authoring model.

- [x] Extend CLI planning to include `vd middleware` and `vd plugin` scaffolding — Fit: keeps custom code outside core; Value: faster setup for advanced users; Complexity: low; Target: V1.x
- [x] Add `vd health` as a summarized wrapper over doctor, stats, SEO, accessibility, and build checks — Fit: local static tooling; Value: one command before release; Complexity: medium; Target: V2
- [x] Add `vd graph` to export project relationships as JSON and Mermaid without requiring a browser devtool — Fit: compiler/build-time output; Value: easier onboarding and audits; Complexity: medium; Target: V2
- [x] Add `vd benchmark` for repeatable page, loop, request, and component rendering benchmarks — Fit: performance-budget roadmap; Value: prevents anecdotal optimization; Complexity: medium; Target: V2
- [x] Add a route explorer command that prints route paths, params, guards, metadata, SEO, and generated static entries — Fit: folder-first router transparency; Value: easier deployment/debugging; Complexity: low; Target: V1.x
- [x] Add a build report command or Vite output section for bundle, directive, route, component, and SEO summaries — Fit: build intelligence without runtime cost; Value: clear production feedback; Complexity: medium; Target: V1.x

### 14.4 Visual Project Graph

Visual graphs are useful when generated from source metadata. They should be
exported artifacts, not a mandatory browser devtools runtime.

- [x] Generate a pages-to-routes graph — Fit: folder-first; Value: shows navigation surface; Complexity: low; Target: V2
- [x] Generate a pages-to-components graph with nested component dependencies — Fit: HTML component discovery; Value: finds coupling and circular usage; Complexity: medium; Target: V2
- [x] Generate request and middleware graphs from `src/api` registrations — Fit: request-layer transparency; Value: safer API refactors; Complexity: medium; Target: V2
- [x] Generate event, ref, state, and expose relationship graphs where static analysis can prove the connection — Fit: compiler-first where possible; Value: debugs communication patterns; Complexity: high; Target: Future Research

### 14.5 Framework Health Report

A health report fits VeloDom when it is advisory and generated from existing
compiler/build/test signals. It must not block builds until thresholds are
explicitly configured by the project.

- [x] Define a non-blocking health score model covering performance, accessibility, SEO, security, bundle size, dead code, and maintainability — Fit: convention-guided quality; Value: one release-readiness signal; Complexity: medium; Target: V2
- [x] Add configurable project thresholds for health checks without hard-coded framework opinions — Fit: convention over configuration with opt-in strictness; Value: adapts to different site types; Complexity: medium; Target: V2
- [x] Report security concerns such as unsafe links, risky HTML injection patterns, weak auth demos in production, and external-write policy gaps — Fit: existing structured diagnostics; Value: safer apps; Complexity: medium; Target: V2
- [x] Report SEO and accessibility coverage from page configs and compiled templates — Fit: compile-time HTML analysis; Value: fewer missed metadata and semantic issues; Complexity: medium; Target: V1.x

### 14.6 Build Intelligence

Build intelligence should reuse compiler manifests and Vite output. It should
suggest optimizations rather than silently changing application behavior.

- [x] Report largest pages, largest components, largest route chunks, and repeated heavy dependencies after production build — Fit: build-time only; Value: practical performance work; Complexity: medium; Target: V1.x
- [x] Report unused directives and unused runtime feature modules based on compiler manifests — Fit: compiler-first tree-shaking; Value: keeps runtime small; Complexity: medium; Target: V1.x
- [x] Suggest route-level prefetch, component splitting, or template simplification without enabling them automatically — Fit: runtime-lightweight; Value: informed optimization; Complexity: medium; Target: V2
- [x] Emit machine-readable build reports for CI dashboards and future tooling — Fit: package/tooling boundary; Value: automation without runtime cost; Complexity: low; Target: V1.x

### 14.7 Documentation Generator

Generated docs fit VeloDom when they document discovered conventions and public
contracts. They should not replace human-written tutorials in `README.md`.

- [x] Generate route documentation from folders and `config.js` metadata — Fit: folder-first; Value: always-current route map; Complexity: low; Target: V1.x
- [x] Generate component documentation from props, slots, refs, exposed methods, and examples found in templates — Fit: HTML-first components; Value: easier reuse; Complexity: medium; Target: V2
- [x] Generate request/API documentation from route handlers, middleware, auth, params, and result conventions — Fit: request-layer clarity; Value: safer backend/frontend coordination; Complexity: medium; Target: V2
- [x] Generate event, ref, state, plugin, and SEO documentation where static analysis is reliable — Fit: compiler metadata; Value: searchable project reference; Complexity: high; Target: Future Research

### 14.8 Optional AI-Native Tooling

AI can be valuable, but it must be optional and provider-based like auth. The
framework should work fully without AI, internet access, API keys, or hosted
services.

- [x] Research an optional AI provider interface with OpenAI, OpenRouter, Ollama, Gemini, and custom providers — Fit: provider pattern without mandatory dependency; Value: user choice and local-first options; Complexity: medium; Target: Future Research
- [x] Keep AI CLI commands such as `vd ai review`, `vd ai explain`, `vd ai generate`, and `vd ai optimize` outside the runtime package — Fit: runtime-lightweight; Value: assistance without app bloat; Complexity: medium; Target: Future Research
- [x] Require AI tools to read compiler/project manifests instead of guessing project structure — Fit: compiler-first; Value: more accurate suggestions; Complexity: medium; Target: Future Research
- [x] Treat `vd-ai`, `vd-ai-prompt`, and `vd-ai-target` directives as research-only until security, privacy, offline behavior, and runtime cost are proven acceptable — Fit: protects HTML-first simplicity; Value: prevents premature directive bloat; Complexity: high; Target: Future Research
- [x] Add clear privacy controls for files, prompts, secrets, and provider telemetry before any AI integration is considered usable — Fit: safe developer tooling; Value: trust and compliance; Complexity: high; Target: Future Research

### 14.9 Migration Tools

Migration helpers are acceptable only as optional project-conversion assistants.
They should produce normal VeloDom folders and HTML, not compatibility layers
that emulate React or Vue at runtime.

- [x] Research `HTML -> VeloDom` migration helpers that add folder structure, `vd-*` directives, and `script.js` state incrementally — Fit: HTML-first adoption; Value: easiest migration path; Complexity: medium; Target: V2
- [x] Research limited `React -> VeloDom` and `Vue -> VeloDom` codemods that generate reviewable VeloDom folders for simple components only — Fit: optional conversion tooling; Value: helps teams experiment; Complexity: high; Target: Future Research

### 15. Framework Identity

- [x] Write a one-paragraph positioning statement
- [x] Define who VeloDom is for
- [x] Define what VeloDom does better than plain JS
- [x] Define when to choose VeloDom over heavier frameworks
- [x] Define what problems VeloDom intentionally does not solve

---

## Post-V1 Competitive Priorities

These tasks are ordered by launch value and fit with VeloDom's identity:
HTML-first, Compiler-first, Folder-first, Convention over Configuration,
Runtime Lightweight, and Vanilla Friendly.

### 16. V1 Launch Readiness

- [x] Mark the local package identity as V1 while keeping `private: true`
- [x] Run `npm run pack:check` after the V1 identity update
- [x] Create a final release decision note covering npm ownership, access,
      2FA, and publication approval

### 17. Content and SEO Mode

- [x] Design a compiler/build-time content collection system for Markdown and
      local content files without adding browser runtime weight
- [x] Generate routes, SEO entries, sitemap data, RSS/search-index data, and
      typed content metadata from content collections

### 18. Deployment Story

- [x] Add deployment recipes for static hosting, Vercel, Netlify, Cloudflare
      Pages, and Node preview without adding provider lock-in

### 19. Focused Competitive Evolution

This backlog is deliberately selective. It is based on the V1 project review,
not a commitment to copy React, Vue, Angular, or full-stack frameworks. Each
item must preserve normal HTML as the primary authoring surface, keep the
browser runtime small, and remain optional where a project does not need it.

#### 19.1 Adapter Stability and Authoring Types — V1.x

- [x] Publish an adapter capability contract and compatibility guarantees for
      discovery, compilation, static output, and development diagnostics — Fit:
      preserves a generic Core; Value: future adapters can evolve without
      coupling applications to Vite; Complexity: medium; Target: V1.x
- [x] Add an adapter conformance fixture suite instead of promising adapters
      that are not tested — Fit: compiler-first verification; Value: reliable
      ecosystem extension; Complexity: medium; Target: V1.x
- [x] Provide optional `definePageConfig`, request, and plugin declaration
      helpers that are type-only at runtime — Fit: Vanilla Friendly; Value:
      autocomplete and safer configuration without forcing TypeScript;
      Complexity: low; Target: V1.x
- [x] Publish equivalent JSDoc types and JavaScript examples for all new
      declaration helpers — Fit: JavaScript remains first-class; Value: editor
      assistance for Vanilla projects; Complexity: low; Target: V1.x
- [x] Add installed-package type fixtures covering both JavaScript and
      TypeScript consumers — Fit: public-contract testing; Value: avoids
      framework-only type regressions; Complexity: low; Target: V1.x

#### 19.2 Build-Time Asset Quality — V1.x

- [x] Design an optional `velodom/assets` build helper for responsive image
      metadata and generated image variants without a new browser directive —
      Fit: HTML-first and runtime-lightweight; Value: better LCP and easier
      image authoring; Complexity: medium; Target: V1.x
- [x] Add compiler/build diagnostics for missing image dimensions, oversized
      local assets, and absent useful alt text while preserving intentional
      decorative-image patterns — Fit: compiler-first guidance; Value: fewer
      layout shifts and accessibility mistakes; Complexity: medium; Target:
      V1.x
- [x] Prove generated image markup and assets add no mandatory runtime code in
      package and performance checks — Fit: runtime-lightweight; Value:
      protects VeloDom's performance identity; Complexity: low; Target: V1.x

#### 19.3 Editor Intelligence — V2

- [x] Research a language-service layer that reuses compiler diagnostics for
      `.html`, `.vd`, `config.js`, and folder conventions — Fit:
      compiler-first; Value: errors appear while authors write code;
      Complexity: high; Target: V2
- [x] Prototype an optional VS Code extension with directive completion,
      hover documentation, and go-to component/route support before designing
      a general editor protocol — Fit: convention over configuration; Value:
      a gentler beginner workflow; Complexity: high; Target: V2
- [x] Carry resource/block line information through diagnostics so editor
      highlights remain accurate for `.vd` template, script, style, and config
      blocks — Fit: source-aware compiler; Value: actionable errors;
      Complexity: high; Target: V2

#### 19.4 Static Rendering and HTML Forms — V2 Research

- [x] Write a build-time prerender design that can emit complete route HTML
      from explicit application data while retaining client takeover as an
      option — Fit: HTML-first/content sites; Value: stronger SEO and fast
      first render without mandatory SSR; Complexity: high; Target: V2
- [x] Define clear boundaries between static prerendering, the existing
      `seo.renderPage` fallback, and future SSR/hydration; reject ambiguous
      `renderToString` public APIs until proven — Fit: protects the simple
      model; Value: prevents an accidental server runtime; Complexity: medium;
      Target: V2
- [x] Validate any prerender proposal with no-JavaScript, direct-route,
      dynamic-entry, and client-takeover browser fixtures — Fit: compiler/build
      verification; Value: reliable deployment behavior; Complexity: high;
      Target: V2
- [x] Design progressive-form enhancement around native HTML `action` and
      `method`, with VeloDom enhancing rather than replacing normal submission
      — Fit: HTML-first; Value: resilient forms for beginners and production
      sites; Complexity: high; Target: V2
- [x] Define an optional adapter contract for serialized form data, field
      errors, redirects, CSRF ownership, and no-JavaScript behavior; keep
      server authorization application-owned — Fit: flexible adapters; Value:
      clearer full-stack integration without a backend framework;
      Complexity: high; Target: V2
- [x] Add progressive-form test fixtures only after the contract is approved,
      covering enhanced and native submissions — Fit: convention-first safety;
      Value: avoids fragile request abstractions; Complexity: medium; Target:
      V2

#### 19.5 Optional Localization and Development Inspection — V2

- [x] Research a build-time localization plugin with explicit dictionaries and
      locale routes, separate from the existing `lang`/`dir` presentation
      plugin — Fit: optional and HTML-first; Value: completes multilingual
      site workflows without mandatory i18n runtime; Complexity: high; Target:
      V2
- [x] Require static extraction/diagnostics for missing translation keys and
      locale SEO metadata before considering a runtime translation helper —
      Fit: compiler-first; Value: catches copy errors before deployment;
      Complexity: high; Target: V2
- [x] Keep translation-provider, CMS, and remote-loading integrations outside
      Core and optional — Fit: framework-agnostic Core; Value: teams retain
      vendor freedom; Complexity: medium; Target: V2
- [x] Define a development-only inspection protocol based on the existing
      devtools bridge; it must be tree-shaken from production by default — Fit:
      runtime-lightweight; Value: easier route/state/request debugging;
      Complexity: medium; Target: V2
- [x] Prototype an optional browser extension or standalone inspector only
      after the protocol proves useful; do not ship a mandatory in-app panel —
      Fit: opt-in tooling; Value: advanced debugging without beginner clutter;
      Complexity: high; Target: V2

---

## Strategic Roadmap: VeloDom's Competitive Path

This roadmap translates the framework comparison into an implementation order.
It strengthens VeloDom's HTML-first, compiler-first, folder-first identity
without making SSR, a global store, JSX, or AI mandatory. Existing release
gates in Phase Z remain separate and must be completed before public npm
publication.

### Phase 20 — V1.1 Product Foundations

- [x] Implement opt-in build-time static prerendering that emits complete HTML
      for concrete route entries, keeps client takeover optional, and works on
      static hosting — Fit: HTML-first and SEO-friendly; Value: fast first
      content and crawlable pages without a server; Complexity: high; Target:
      V1.1
- [x] Define one page-data loading contract for build, server, and client
      navigation with safe serialized transfer; cache/revalidation policy is
      intentionally deferred to Phase 21 — Fit: compiler-first and
      request-aware; Value: prevents duplicate fetches and reduces page
      boilerplate; Complexity: high; Target: V1.1
- [x] Implement progressive native HTML forms with optional `vd-form`
      enhancement for validation, loading, errors, redirects, and
      application-owned CSRF fields/headers while leaving every unenhanced
      form native — Fit: HTML-first and Vanilla Friendly; Value: forms work
      without JavaScript and remain easy to understand; Complexity: high;
      Target: V1.1
- [x] Generate application declarations through optional `vd types` for route
      parameters, page config, request routes, and discovered component props;
      JavaScript projects can ignore the generated file — Fit: compiler-first
      and flexible authoring; Value: safer refactors without forcing
      TypeScript; Complexity: medium; Target: V1.1
- [x] Stabilize the public Plugin and Adapter contracts with conformance
      fixtures, `assertPluginConformance()`, and an official static adapter
      boundary — Fit: framework Core stays generic; Value: integrations can
      evolve without copying internals; Complexity: medium; Target: V1.1
- [x] Extend compiler diagnostics for security-sensitive HTML, likely browser
      environment-secret exposure, links, forms, and accessibility regressions
      without pretending to replace server security — Fit: compiler-first
      quality; Value: catches production problems before runtime; Complexity:
      medium; Target: V1.1
- [x] Complete the beginner CLI path with project/page/component/API
      scaffolding, route exploration, source-aware Vite development-overlay
      errors, and build reports — Fit: Convention over Configuration; Value:
      fewer commands and faster onboarding; Complexity: medium; Target: V1.1
- [x] Add optional derived-state primitives for `computed`, `watch`, and
      `effect` without replacing plain-object state or introducing a new
      template language — Fit: Runtime-lightweight; Value: less repetitive
      synchronization code; Complexity: medium; Target: V1.1

### Phase 21 — V1.2 Ecosystem and Production Integration

- [x] Add an optional Node request adapter for dynamic rendering while keeping
      static output and the browser runtime independent — Fit: Adapter-first;
      Value: supports authenticated and request-time pages without enlarging
      Core; Complexity: high; Target: V1.2
- [x] Add opt-in in-memory cache and stale-while-revalidate policies for public
      page data; cookies, headers, secrets, and user-specific state remain
      application-owned and uncached — Fit: secure conventions; Value: fresh
      content without accidental data leakage; Complexity: medium; Target: V1.2
- [x] Implement build-time localization with typed dictionaries, locale routes,
      missing-key diagnostics, and per-locale SEO — Fit: optional and
      compiler-first; Value: multilingual sites without a mandatory runtime;
      Complexity: high; Target: V1.2
- [x] Promote the optional VS Code prototype into a stable language-tooling
      package with shared compiler diagnostics and route/component completion —
      Fit: convention-first; Value: a gentler authoring experience for
      beginners and teams; Complexity: high; Target: V1.2
- [x] Extend content helpers with typed external loaders and generated content
      indexes while keeping CMS integrations outside Core — Fit: content-first
      and vendor-neutral; Value: production blogs and documentation sites can
      scale data sources safely; Complexity: medium; Target: V1.2

### Phase 22 — V2 Optional Hybrid Capabilities

- [ ] Add opt-in hybrid server rendering with explicit static, server, and
      client route modes; do not introduce implicit server behavior — Fit:
      preserves predictable deployment; Value: handles personalized pages when
      static output is insufficient; Complexity: very high; Target: V2
- [ ] Design compiler-generated islands or partial hydration boundaries so only
      interactive regions load client code — Fit: compiler-first and
      runtime-lightweight; Value: smaller initial JavaScript for content-heavy
      pages; Complexity: very high; Target: V2
- [ ] Provide an optional standalone DevTools protocol and inspector for
      routes, state, requests, events, and component relationships — Fit:
      development-only and tree-shakable; Value: advanced debugging without
      beginner runtime clutter; Complexity: high; Target: V2
- [ ] Evaluate streaming and Edge adapters only after static and hybrid
      rendering contracts are proven with browser and deployment fixtures — Fit:
      adapter-owned complexity; Value: progressive delivery on modern hosting;
      Complexity: very high; Target: V2

### Phase 23 — Future Research (Optional)

- [ ] Design an optional AI Provider interface with privacy, offline, cost, and
      security boundaries; AI must never be required by Core — Fit: optional
      provider architecture; Value: assisted review and generation for teams;
      Complexity: high; Target: Future Research
- [ ] Research HTML, Vue, and React migration assistants only if they preserve
      readable HTML and produce maintainable VeloDom conventions — Fit:
      strengthens adoption without compatibility bloat; Value: lowers
      migration cost; Complexity: high; Target: Future Research
- [ ] Research CMS and deployment integrations as external adapters rather than
      framework-owned features — Fit: vendor-neutral Core; Value: broader
      production adoption without package bloat; Complexity: medium; Target:
      Future Research

### Explicitly Rejected for V1

- [x] Keep JSX/TSX, a mandatory Virtual DOM, a mandatory global store, a
      mandatory SSR server, a built-in CSS system, and required AI outside the
      VeloDom Core — Fit: protects the framework identity; Value: keeps the
      beginner path small and the browser runtime light; Decision: reject for
      V1

---

## Suggested Order

1. Tests
2. Documentation
3. Naming freeze
4. Lifecycle cleanup
5. Request UX improvements
6. Validation
7. Performance pass
8. Tooling

---

## Notes

- Do not add new features unless they support clarity, stability, or real user workflows.
- Keep the framework HTML-first and simple for the user.
- Prefer conventions that reduce boilerplate.
- Protect framework power features with clear guardrails and strong error messages.
- 2026-08-16 V1 site pass: removed obsolete DummyJSON/login/category/CRUD
  application files, rebuilt the example as a local VeloDom framework blog,
  kept Core unchanged, and verified the app with static project diagnostics,
  production build, automated tests, and Chromium browser E2E.
- 2026-08-16 V1 identity pass: package metadata now uses local version
  `1.0.0` while keeping `private: true`; publication still requires explicit
  npm ownership and release approval.
- 2026-08-16 Content Mode pass: added optional `velodom/content` build-time
  helpers for Markdown collections, SEO entries, sitemap records, RSS XML,
  search-index records, and typed content metadata.
- 2026-08-16 Competitive review: accepted a constrained post-V1 roadmap for
  adapter compatibility, optional authoring types, build-time asset quality,
  editor intelligence, static rendering research, progressive forms,
  localization, and development-only inspection. It explicitly rejects a
  mandatory virtual DOM, global store, JSX, CMS, or universal SSR runtime.
- 2026-08-17 Workspace organization pass: kept the runnable blog under
  `examples/`, reclassified the installed-package fixture under
  `tools/test-fixtures`,
  placed optional VS Code tooling beside the framework packages, and moved
  repository-only release checks to `tools/scripts` so none become accidental
  npm runtime dependencies.

## Completed Workspace Organization

- [x] Classify example applications, package test fixtures, optional editor
      integrations, and repository quality tools by ownership; keep only the
      Core runtime in the published `velodom` package — Fit: clear package
      boundaries; Value: a clean consumer install and maintainable workspace;
      Complexity: low; Target: V1
- [x] Group framework tests, browser helpers, and package fixtures under
      `tools/` without publishing or executing fixtures as test files — Fit:
      clean repository ownership; Value: a pure application/framework surface
      with unchanged quality coverage; Complexity: low; Target: V1
- [x] Co-locate package build, declaration, and private build-helper
      configurations with `packages/velodom`, while keeping workspace checking
      at the repository root — Fit: explicit package ownership;
      Value: a cleaner source tree with reproducible package outputs;
      Complexity: low; Target: V1
- [x] Audit npm publication structure, complete discovery metadata and the
      registry-facing README, register the optional editor consumer as a
      workspace, and enforce those boundaries in package checks — Fit:
      package-first delivery without changing runtime authoring; Value: a
      predictable npm install and clearer first-use experience; Complexity:
      low; Target: V1
