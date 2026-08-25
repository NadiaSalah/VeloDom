# VeloDom V1 Roadmap

This roadmap describes one VeloDom V1 product family. It separates what is
implemented from work that is current, planned, research-only, deferred, or
rejected. Historical phase names are preserved in `CHANGELOG.md` and in the
implementation record at the end of this file, but they are not separate
product generations.

## V1 Status Summary

| Area | Status | Evidence / next action |
| --- | --- | --- |
| Core compiler and lightweight runtime | V1 — Implemented | TypeScript source, declarations, compiler/runtime tests |
| Authoring and application conventions | V1 — Implemented | Folder mode, optional `.vd`, JS/TS parity, layouts, CLI scaffolding |
| Production features | V1 — Implemented | Routing, requests, forms, SEO, content, localization, package subpaths |
| Developer intelligence | V1 — Implemented | `vd` inspection commands, compiler language helpers, testing utilities |
| Public package | V1 — Implemented | Published `velodom@1.0.0`, exports and consumer checks pass |
| Browser release gate | V1 — Implemented | GitHub Actions Run #27 passed Chromium, Firefox, WebKit, and Mobile WebKit |
| npm publication | V1 — Implemented | `velodom@1.0.0` published with public access and `latest` dist-tag |
| Hybrid rendering and islands | V1 — Planned / Experimental | Design must preserve static-first authoring and optional runtime cost |
| AI, migration, CMS, and Edge integrations | V1 — Research / Deferred | External, optional, and never required by Core |

### Progress counter

**V1 implementation: complete. Release readiness: complete.**

`[##################--]`

The npm account is authenticated and protected by write-level 2FA. The
`velodom@1.0.0` package is published with the `latest` dist-tag. Future work
is optional post-publication development.

### Status vocabulary

- **V1 — Implemented:** supported by source, tests, and public documentation.
- **V1 — Current:** part of the current release candidate or an active release
  gate; it is not a new product generation.
- **V1 — Planned:** approved direction with implementation still pending.
- **V1 — Research:** investigation only; no runtime promise.
- **V1 — Deferred / Experimental:** intentionally postponed until evidence and
  a bounded design exist.
- **Rejected:** conflicts with VeloDom's identity or adds mandatory complexity.

## V1 Core — Implemented

- [x] TypeScript framework source with generated public declarations and ESLint.
- [x] HTML parser, source-aware diagnostics, safe expression AST/evaluator, and
  compiler-selected runtime feature manifests.
- [x] Preferred `vd-*` directives with backward-compatible `data-vd-*` names.
- [x] Text interpolation, escaped interpolation, and `vd-pre` literal regions.
- [x] Pages, nested routes, dynamic params, query values, guards, hashes,
  scroll restoration, focus management, and opt-in prefetch.
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
- [x] Added root AI/contributor guidance plus `docs/AI_CONTEXT.md`, a concise
  generation contract that explains Core/application ownership, supported
  syntax, boundaries, and verification.
- [x] Added `examples/blog/README.md` so the showcase is an explicit consumer
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
  page, component, API, middleware, plugin, and focused demo scaffolding. The
  package also exposes `npx velodom@latest <name>` as the shortest starter flow.
- [x] Compiler-backed editor analysis/completion and the optional private
  `packages/velodom-vscode` workspace consumer.
- [x] `velodom/testing`, devtools bridge/inspector, and real-browser Playwright
  smoke coverage.
- [x] Documentation checks for public exports, documented CLI commands, private
  imports, legacy roadmap labels, and removed-guide links.
- [x] Source-derived documentation coverage for all public runtime/build values,
  preferred directive names, and CLI commands in the canonical one-file guide.
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
velodom/package.json
```

Current release work is governance rather than a new framework feature:

- [x] Complete the strict Firefox browser run in a graphics-capable CI/release
  environment. GitHub Actions Run #27 passed Chromium, Firefox, WebKit, and
  Mobile WebKit on the current `main` commit. Local Firefox remains limited by
  the host's SWGL compositor, but this no longer blocks the release gate.
- [x] Confirm npm account and release preflight: `npm whoami` returns
  `engnadia`, email is verified, write-level 2FA is enabled, `velodom` is not
  currently published, the package is public-scoped in `publishConfig`, and
  the `1.0.0` tarball dry run passes. npm does not reserve an unregistered
  name; publication itself is the ownership event.
- [x] Remove `private: true` after explicit approval and publish `velodom@1.0.0`
  with public access and the `latest` dist-tag. Registry verification confirms
  the published version and both CLI binaries.
- [x] Review registry dependency advisories after owner approval. `npm audit`
  now reports 0 vulnerabilities; the lockfile updates `brace-expansion` to
  5.0.9, `nanoid` to 3.3.18, and `postcss` to 8.5.26 and passes `npm ci
  --dry-run` under the npm 10.9.2 toolchain used by GitHub Actions. Optional
  `@emnapi/core` and `@emnapi/runtime` entries are retained for npm 10's clean
  install resolution.
- [x] Add the published default starter preset through
  `npx --yes --package velodom create-velodom <name>`. It generates a Vite
  application with `mountVeloDom()`, the supplied SVG brand/favicon, a shared
  layout/navbar, `/about` single-file lesson, `/guide` component lesson,
  `ignoreDeprecations: "6.0"`, and public package dependencies.
  The package tarball also includes the source-controlled editable
  `velodomProj/` default example. Additional opinionated presets remain
  optional research.
- [ ] Publish the starter-page and CLI-alias refinement as the next patch
  release after explicit owner approval; the current npm `1.0.0` remains
  unchanged.

## V1 Advanced Capabilities — Planned / Experimental

These are not implemented V1 runtime features. Any future work must remain
optional and pass a compiler-first/runtime-budget design review:

- [ ] Evaluate an opt-in hybrid server rendering boundary for applications that
  explicitly need request-time HTML.
- [ ] Evaluate route rendering modes that preserve static output as the default.
- [ ] Evaluate compiler-generated islands or partial hydration only if they can
  avoid a mandatory virtual DOM and keep ordinary HTML authoring intact.
- [ ] Evaluate richer standalone DevTools panels without mutable runtime
  internals or secret collection.
- [ ] Evaluate streaming and Edge adapters as separate contracts, not as hidden
  behavior in the browser package.
- [ ] Harden framework typing module-by-module until `strict` mode can replace
  the current bounded checks. Start with shared contracts and small leaf
  modules, then the compiler, mount/router, and request router; do not introduce
  application-facing API changes solely to satisfy the checker.

## V1 Research — Deferred

Research items are deliberately not promises and must not become Core runtime
dependencies:

- [ ] Optional AI provider interface and CLI review/explain/generate helpers;
  support local/custom providers and never require API keys, network access, or
  telemetry.
- [ ] HTML-to-VeloDom, React-to-VeloDom, and Vue-to-VeloDom migration helpers
  that output ordinary reviewable folders rather than compatibility runtimes.
- [ ] External CMS and deployment adapters that map typed records through
  `velodom/content` without credentials or remote browser fetching in Core.
- [ ] Locale negotiation, cookie/domain locale policy, ICU parsing, and request-
  time translation providers outside the build-time localization helpers.

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
