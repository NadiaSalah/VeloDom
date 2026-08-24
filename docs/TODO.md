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
| Public package | V1 — Current | `1.0.0`, `private: true`, exports and consumer checks pass |
| Browser release gate | V1 — Current | Chromium, WebKit, and Mobile WebKit pass; strict Firefox-capable CI run remains open |
| npm publication | V1 — Current | Registry lookup is unauthenticated; ownership, account, 2FA, version, and approval remain human gates |
| Hybrid rendering and islands | V1 — Planned / Experimental | Design must preserve static-first authoring and optional runtime cost |
| AI, migration, CMS, and Edge integrations | V1 — Research / Deferred | External, optional, and never required by Core |

### Progress counter

**V1 implementation: complete. Release readiness: 3 external gates open.**

`[##################--]`

The remaining gates are strict browser verification on an appropriate
Firefox-capable environment, npm ownership/account approval, and final human
publication approval. The local package remains private and unpublished.

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
- [x] `vd create` and `create-velodom` for convention-first project, page,
  component, API, middleware, plugin, and focused demo scaffolding.
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

- [ ] Complete the strict Firefox browser run in a graphics-capable CI/release
  environment. Local Chromium, WebKit, and Mobile WebKit pass; local Firefox
  reports an SWGL compositor framebuffer failure before the application loads.
  `.github/workflows/release-browser-matrix.yml` is ready for the remote gate.
- [ ] Confirm npm package-name ownership/reservation, account, organization or
  scope, access level, 2FA policy, exact version, dist tag, and release notes.
  The local npm client is currently unauthenticated (`npm whoami` returns 401).
- [ ] Remove `private: true` and publish only after explicit human approval for
  that exact version. Never publish from routine development tasks.
- [ ] Review registry dependency advisories only after the owner approves
  sending workspace dependency metadata to npm.
- [ ] Add npm-installable starter presets after the public package path exists.

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

Run `npm run test:browser` for the real-browser matrix. Do not run
`npm publish`, remove `private: true`, or run registry-dependent audit commands
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
