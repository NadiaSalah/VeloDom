# VeloDom TODO

## Goal

This file turns the current framework review into a practical roadmap.

The current priority is not adding random features.  
The priority is to make the existing core stable, clear, documented, and release-ready.

---

## Progress Counter

**214 of 313 tasks completed — 68.4%**

`[#############-------]`

Remaining tasks: **99**

Update this counter whenever checklist items are added or completed.

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

1. Load dynamic SEO entries from an application API/CMS hook.
2. Add optional full static rendering and hydration without changing normal
   HTML authoring.
3. Keep shared state, validation extensions, cache providers, and devtools as
   optional plugins.
4. Consider broader SSR only after static rendering and hydration are stable.

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
- [x] Enforce `no-explicit-any` across every TypeScript file in `src/core`

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

- [x] Add an English responsibility header to every TypeScript file in `src/core`
- [x] Add JSDoc to every exported core function, class, interface, type, and constant
- [x] Enforce core headers and exported JSDoc through `npm run docs:check`

### Phase 0 Acceptance Criteria

- [x] Preferred `vd-*` syntax works in page and component HTML
- [x] Existing `data-vd-*` templates continue working unchanged
- [x] Malformed directives fail during development build
- [x] Compiler modules run under Node without browser globals
- [x] Production build uses compiler output and passes all framework tests
- [x] Framework TypeScript, declarations, and ESLint checks pass
- [x] Runtime and component props contain no `eval` or `new Function`

---

## General Framework Roadmap

The goal of this roadmap is to make the VeloDom core reusable for building
different kinds of websites, while keeping application code outside `src/core`.

### Phase A: Core Boundaries

- [x] Isolate all `import.meta.glob(...)` usage in the Vite adapter
- [x] Inject page and component resources into `createApp(...)`
- [x] Keep filesystem folder conventions inside the adapter, not the router
- [x] Inject application routes and middleware into `createApp(...)`
- [x] Provide one public request API through `src/core/requests/index.ts`
- [x] Keep named framework constants inside `src/core/constants.ts`
- [x] Add tests for the Vite adapter resource maps
- [x] Consolidate all framework-owned source under `src/core`
- [x] Expose build integrations through supported package subpaths

### Phase A Acceptance Criteria

- [x] Runtime modules outside `src/core/adapters` contain no `import.meta.glob(...)`
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
- [ ] Add scroll restoration and hash-fragment navigation
- [ ] Move focus predictably after navigation for keyboard and screen-reader users
- [ ] Add opt-in route prefetch without forcing eager page loading

### Phase F: Optional Plugins

- [x] Define the smallest useful plugin contract
- [x] Support `createApp({ plugins: [] })`
- [x] Add plugin setup and cleanup
- [ ] Keep validation optional
- [ ] Keep shared state optional
- [ ] Keep cache, retry, and devtools optional
- [ ] Avoid adding SSR until the browser framework core is stable

### Phase G: Release Hardening

- [x] Remove remaining application assumptions from core errors and hints
- [ ] Add source-aware errors for adapters and user files
- [x] Complete router, component, directive, request, and lifecycle tests
- [x] Add package exports and semantic versioning rules
- [x] Build publishable ESM and declaration artifacts from `src/core`
- [x] Validate package entry points and the npm file allowlist before packing
- [x] Add a minimal package-consumer example
- [x] Type-check a consumer against the installed package declarations
- [x] Build a consumer through Vite from an installed local tarball
- [ ] Benchmark common page and loop rendering cases
- [ ] Choose a project license and confirm npm package-name ownership
- [x] Define the supported browser matrix and automated browser targets
- [ ] Add real-browser E2E tests for routing, forms, requests, and no-JavaScript SEO
- [x] Document a release approval checklist without automating publication

### Phase H: Blog Showcase Application

After the generic core is stable, replace the current demo application with a
complete blog project whose files remain under `src/pages`, `src/components`,
and `src/api`.

- [x] Create a blog home page with reactive post lists and loops
- [x] Create a post details page using route params and requests
- [x] Create post create/edit pages using forms and `vd-model`
- [x] Create an auth/profile page demonstrating auth providers and roles
- [ ] Create reusable nav, post card, loader, form, modal, and error components
- [x] Demonstrate props, slots, refs, grouped refs, `expose`, and page events
- [ ] Demonstrate every conditional, binding, model, loop, and event directive
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
- [ ] Add an application-defined API/CMS data hook for dynamic SEO entries
- [ ] Add optional full-page static content rendering and hydration
- [ ] Add structured-data validation fixtures for common content types

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

- [ ] Freeze naming for `page-router` and `request-router`
- [ ] Decide whether `data-vd-request-state` keeps its current name or becomes a clearer alias
- [ ] Freeze request naming convention: `Result`, `Loading`, `Error`
- [ ] Freeze component public API pattern: `expose`
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
- [ ] Add recipe: form create/update/delete
- [ ] Add recipe: common framework error examples

### 8. Lifecycle

- [x] Formalize `destroy` hook
- [x] Document `init` object signature as the preferred style
- [x] Add and document the `mounted` hook
- [x] Expose `onCleanup` and lifecycle `AbortSignal`

### 9. Project Polish

- [x] Review folder naming consistency inside `src/core`
- [x] Consolidate duplicate object and path helpers under `src/core/shared`
- [x] Extract expression/state-path logic from the directive orchestrator
- [x] Extract target and cross-page policy from the request router
- [x] Review internal naming consistency across `pages`, `components`, and `api`
- [x] Review demo pages for consistency with final API style
- [x] Remove legacy application examples that no longer represent the preferred API

---

## V1.5 Improvements

### 10. Request UX

- [x] Add automatic request cancellation on supersede and unmount
- [ ] Add request debounce support
- [ ] Add request throttle support
- [ ] Add request retry option
- [ ] Add redirect behavior on auth failure
- [ ] Add global before-request hook
- [ ] Add global after-request hook
- [ ] Add request success callback pattern if needed

### 11. Forms and Validation

- [ ] Design a simple validation API
- [ ] Add built-in required validation
- [ ] Add built-in min/max validation
- [ ] Add built-in pattern validation
- [ ] Add validation error state conventions
- [ ] Integrate form validation with request flow

### 11.1 Accessibility and Recovery

- [ ] Add compiler accessibility diagnostics for images, controls, labels, and headings
- [ ] Define an application error-boundary hook with a recoverable fallback
- [ ] Define an optional component-level error boundary
- [ ] Support retry or safe navigation from recoverable runtime failures
- [ ] Add keyboard, focus-order, and semantic-output integration tests

### 12. Performance

- [ ] Review re-render behavior in loops
- [ ] Reduce unnecessary full-block updates where possible
- [ ] Improve granular updates for large pages
- [ ] Benchmark common UI cases
- [ ] Enforce agreed runtime and generated-chunk performance budgets
- [x] Split runtime directive features into manifest-selectable modules
- [x] Type remaining dynamic mount, directive, and request orchestrator boundaries

---

## V2 Ideas

### 13. Shared State

- [ ] Decide if the framework truly needs a global store
- [ ] If needed, design the smallest useful shared state API
- [ ] Keep shared state optional, not mandatory

### 14. Developer Tooling

- [ ] Create a `create-velodom` project scaffolding command
- [ ] Create CLI for page scaffolding
- [ ] Create CLI for component scaffolding
- [ ] Create CLI for API file scaffolding
- [ ] Create CLI for demo scaffolding
- [ ] Add public test utilities for mounting pages and components
- [ ] Add a development command to inspect discovered routes and feature manifests

### 14.1 Future DX Acceptance Rules

Modern developer experience work is allowed only when it strengthens VeloDom's
identity instead of copying larger frameworks. DX tooling should prefer static
analysis, compiler metadata, build reports, and optional providers. It must not
add mandatory runtime state, JSX/TSX authoring, virtual-DOM concepts, or hidden
configuration-heavy behavior.

- [ ] Define a DX feature rubric before implementation — Fit: protects HTML-first/compiler-first decisions; Value: prevents feature bloat; Complexity: low; Target: V1.x
- [ ] Keep every DX feature usable without AI or cloud services — Fit: preserves Vanilla Friendly and offline workflows; Value: predictable local development; Complexity: low; Target: V1.x
- [ ] Keep DX analysis outside the browser runtime by default — Fit: preserves Runtime Lightweight; Value: safer diagnostics without app-size cost; Complexity: medium; Target: V1.x

### 14.2 Project Intelligence

Static project intelligence fits VeloDom because folders, templates,
directives, route configs, and compiler metadata already describe most project
relationships. The first version should be static, local, and deterministic.

- [ ] Design a project analyzer manifest that reads pages, components, API routes, middleware, CSS, refs, events, and SEO configs — Fit: compiler/folder-first; Value: one source of project truth; Complexity: medium; Target: V1.x
- [ ] Add `vd inspect` to list discovered pages, components, routes, request routes, middleware, and compiler features — Fit: convention over configuration; Value: explains automatic discovery; Complexity: medium; Target: V1.x
- [ ] Add `vd doctor` to detect missing components, broken component paths, invalid `vd-*` usage, invalid config shapes, and broken request references — Fit: compile-time validation; Value: catches common mistakes early; Complexity: medium; Target: V1.x
- [ ] Detect broken refs, duplicate state names used across one template scope, unknown event handlers, and unsafe directive expressions before runtime — Fit: compiler-first; Value: fewer runtime surprises; Complexity: medium; Target: V1.x
- [ ] Detect unused components, unused routes, unused middleware, dead API handlers, and unreachable showcase files without deleting anything automatically — Fit: static analysis; Value: reduces project clutter; Complexity: medium; Target: V2
- [ ] Detect circular component dependencies and large page/component folders with actionable warnings — Fit: folder-first maintainability; Value: prevents slow builds and confusing composition; Complexity: medium; Target: V2
- [ ] Generate `vd stats` project statistics for route count, component count, directive usage, request usage, SEO coverage, and test coverage signals — Fit: build-time metadata; Value: clear project health snapshot; Complexity: low; Target: V1.x

### 14.3 CLI Experience

CLI work should reduce boilerplate around VeloDom's conventions. It should
scaffold normal `index.html`, `script.js`/`script.ts`, `style.css`, and
`config.js` files, not introduce a new component authoring model.

- [ ] Extend CLI planning to include `vd middleware` and `vd plugin` scaffolding — Fit: keeps custom code outside core; Value: faster setup for advanced users; Complexity: low; Target: V1.x
- [ ] Add `vd health` as a summarized wrapper over doctor, stats, SEO, accessibility, and build checks — Fit: local static tooling; Value: one command before release; Complexity: medium; Target: V2
- [ ] Add `vd graph` to export project relationships as JSON and Mermaid without requiring a browser devtool — Fit: compiler/build-time output; Value: easier onboarding and audits; Complexity: medium; Target: V2
- [ ] Add `vd benchmark` for repeatable page, loop, request, and component rendering benchmarks — Fit: performance-budget roadmap; Value: prevents anecdotal optimization; Complexity: medium; Target: V2
- [ ] Add a route explorer command that prints route paths, params, guards, metadata, SEO, and generated static entries — Fit: folder-first router transparency; Value: easier deployment/debugging; Complexity: low; Target: V1.x
- [ ] Add a build report command or Vite output section for bundle, directive, route, component, and SEO summaries — Fit: build intelligence without runtime cost; Value: clear production feedback; Complexity: medium; Target: V1.x

### 14.4 Visual Project Graph

Visual graphs are useful when generated from source metadata. They should be
exported artifacts, not a mandatory browser devtools runtime.

- [ ] Generate a pages-to-routes graph — Fit: folder-first; Value: shows navigation surface; Complexity: low; Target: V2
- [ ] Generate a pages-to-components graph with nested component dependencies — Fit: HTML component discovery; Value: finds coupling and circular usage; Complexity: medium; Target: V2
- [ ] Generate request and middleware graphs from `src/api` registrations — Fit: request-layer transparency; Value: safer API refactors; Complexity: medium; Target: V2
- [ ] Generate event, ref, state, and expose relationship graphs where static analysis can prove the connection — Fit: compiler-first where possible; Value: debugs communication patterns; Complexity: high; Target: Future Research

### 14.5 Framework Health Report

A health report fits VeloDom when it is advisory and generated from existing
compiler/build/test signals. It must not block builds until thresholds are
explicitly configured by the project.

- [ ] Define a non-blocking health score model covering performance, accessibility, SEO, security, bundle size, dead code, and maintainability — Fit: convention-guided quality; Value: one release-readiness signal; Complexity: medium; Target: V2
- [ ] Add configurable project thresholds for health checks without hard-coded framework opinions — Fit: convention over configuration with opt-in strictness; Value: adapts to different site types; Complexity: medium; Target: V2
- [ ] Report security concerns such as unsafe links, risky HTML injection patterns, weak auth demos in production, and external-write policy gaps — Fit: existing structured diagnostics; Value: safer apps; Complexity: medium; Target: V2
- [ ] Report SEO and accessibility coverage from page configs and compiled templates — Fit: compile-time HTML analysis; Value: fewer missed metadata and semantic issues; Complexity: medium; Target: V1.x

### 14.6 Build Intelligence

Build intelligence should reuse compiler manifests and Vite output. It should
suggest optimizations rather than silently changing application behavior.

- [ ] Report largest pages, largest components, largest route chunks, and repeated heavy dependencies after production build — Fit: build-time only; Value: practical performance work; Complexity: medium; Target: V1.x
- [ ] Report unused directives and unused runtime feature modules based on compiler manifests — Fit: compiler-first tree-shaking; Value: keeps runtime small; Complexity: medium; Target: V1.x
- [ ] Suggest route-level prefetch, component splitting, or template simplification without enabling them automatically — Fit: runtime-lightweight; Value: informed optimization; Complexity: medium; Target: V2
- [ ] Emit machine-readable build reports for CI dashboards and future tooling — Fit: package/tooling boundary; Value: automation without runtime cost; Complexity: low; Target: V1.x

### 14.7 Documentation Generator

Generated docs fit VeloDom when they document discovered conventions and public
contracts. They should not replace human-written tutorials in `README.md`.

- [ ] Generate route documentation from folders and `config.js` metadata — Fit: folder-first; Value: always-current route map; Complexity: low; Target: V1.x
- [ ] Generate component documentation from props, slots, refs, exposed methods, and examples found in templates — Fit: HTML-first components; Value: easier reuse; Complexity: medium; Target: V2
- [ ] Generate request/API documentation from route handlers, middleware, auth, params, and result conventions — Fit: request-layer clarity; Value: safer backend/frontend coordination; Complexity: medium; Target: V2
- [ ] Generate event, ref, state, plugin, and SEO documentation where static analysis is reliable — Fit: compiler metadata; Value: searchable project reference; Complexity: high; Target: Future Research

### 14.8 Optional AI-Native Tooling

AI can be valuable, but it must be optional and provider-based like auth. The
framework should work fully without AI, internet access, API keys, or hosted
services.

- [ ] Research an optional AI provider interface with OpenAI, OpenRouter, Ollama, Gemini, and custom providers — Fit: provider pattern without mandatory dependency; Value: user choice and local-first options; Complexity: medium; Target: Future Research
- [ ] Keep AI CLI commands such as `vd ai review`, `vd ai explain`, `vd ai generate`, and `vd ai optimize` outside the runtime package — Fit: runtime-lightweight; Value: assistance without app bloat; Complexity: medium; Target: Future Research
- [ ] Require AI tools to read compiler/project manifests instead of guessing project structure — Fit: compiler-first; Value: more accurate suggestions; Complexity: medium; Target: Future Research
- [ ] Treat `vd-ai`, `vd-ai-prompt`, and `vd-ai-target` directives as research-only until security, privacy, offline behavior, and runtime cost are proven acceptable — Fit: protects HTML-first simplicity; Value: prevents premature directive bloat; Complexity: high; Target: Future Research
- [ ] Add clear privacy controls for files, prompts, secrets, and provider telemetry before any AI integration is considered usable — Fit: safe developer tooling; Value: trust and compliance; Complexity: high; Target: Future Research

### 14.9 Migration Tools

Migration helpers are acceptable only as optional project-conversion assistants.
They should produce normal VeloDom folders and HTML, not compatibility layers
that emulate React or Vue at runtime.

- [ ] Research `HTML -> VeloDom` migration helpers that add folder structure, `vd-*` directives, and `script.js` state incrementally — Fit: HTML-first adoption; Value: easiest migration path; Complexity: medium; Target: V2
- [ ] Research limited `React -> VeloDom` and `Vue -> VeloDom` codemods that generate reviewable VeloDom folders for simple components only — Fit: optional conversion tooling; Value: helps teams experiment; Complexity: high; Target: Future Research

### 15. Framework Identity

- [ ] Write a one-paragraph positioning statement
- [ ] Define who VeloDom is for
- [ ] Define what VeloDom does better than plain JS
- [ ] Define when to choose VeloDom over heavier frameworks
- [ ] Define what problems VeloDom intentionally does not solve

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
