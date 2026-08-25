# Changelog

All important local changes to VeloDom are recorded here. Entries describe
both development milestones and published package verification.

## Unreleased

- Added the concise `vd init <name>` project initializer and the package-level
  `npx velodom@latest <name>` shortcut. Both generate the same complete starter
  as `create-velodom`; the existing explicit command remains supported.

## 2026-08-25

### npm Consumer Starter Smoke Project

- Added `velodomProj`, a standalone project generated with the published
  `create-velodom` preset.
- Installed `velodom@1.0.0` from npm and verified the package with `npm ls`.
- Confirmed the consumer project builds successfully with Vite and reports zero
  dependency vulnerabilities.
- Replaced the blank starter page with a small responsive introduction that
  demonstrates a reusable logo component and a persistent light/dark theme
  toggle without adding a UI dependency.
- The refinement is prepared in the workspace and consumer project; npm
  `1.0.0` is intentionally unchanged until the owner approves a patch release.
- Replaced the image-based starter logo with an inline SVG component and the
  visible `VeloDom` wordmark, removing an unnecessary public asset.
- Updated the inline mark to the supplied square `VeloDom-logo-01.svg` artwork
  while keeping the generated component image-free.
- Corrected starter home-page CTAs: the model link now uses the router-safe
  `/#principles` same-page hash, and the GitHub link uses the canonical
  repository URL in a new tab.
- Added a responsive, large inline-SVG brand panel beside the starter hero so
  the first screen communicates the framework identity without an image request.
- Added the visible `VeloDom` wordmark beside the header logo for clearer brand
  recognition in the starter project.
- Added a generated `public/velodom-favicon.svg` and linked it from the starter
  HTML shell so the supplied VeloDom SVG mark appears in browser tabs. The
  generated favicon now uses the attached artwork without a simplified redraw.
- Corrected Markdown repository links to the canonical
  `github.com/NadiaSalah/VeloDom` path.
- Expanded the npm starter with a small learning surface: `/about` is a
  single-file `.vd` page, `/guide` demonstrates reusable components and props,
  `default.vd` provides a shared layout, and `site-nav/script.js` keeps the
  navbar's active route accessible.
- Added `ignoreDeprecations: "6.0"` to generated and example JavaScript
  configurations so TypeScript 6 does not block the Vite/Bundler setup.
- Refined the `/about` single-file lesson's code panel with a high-contrast
  gradient surface, readable monospace text, and a subtle glow.
- Updated the package-facing starter documentation to describe the complete
  npm-generated learning project and its shared layout, navbar, `.vd` page,
  component script, SVG favicon, and TypeScript compatibility setting.

### GitHub Actions Release Matrix

- Uploaded the refactored release candidate to `NadiaSalah/VeloDom` on `main`.
- GitHub Actions Run #27 passed the production build and strict browser matrix
  for Chromium, Firefox, WebKit, and Mobile WebKit. The Firefox gate is now
  closed; only npm ownership and human publication approval remain external.

### npm Release Preflight

- Verified the authenticated npm account as `engnadia` with a verified email
  and write-level 2FA. The `velodom` name is currently unregistered, and npm
  reports no owned packages for the account.
- Confirmed the `1.0.0` package tarball with the package contract, installed
  consumer, and dry-run checks. `private: true` remains until explicit human
  approval authorizes publication of this exact version.

### VeloDom 1.0.0 Published

- Removed the package-only `private: true` guard after explicit owner approval
  and published `velodom@1.0.0` with public access and the `latest` dist-tag.
- Verified the registry version and the published `vd` and `create-velodom`
  binary mappings after npm's manifest normalization.

### Published Starter Preset

- Documented and verified the default npm-installable starter command:
  `npx --yes --package velodom create-velodom <name>`.
- The registry smoke test generated a complete Vite project with a package
  manifest, VeloDom bootstrap, home page, config, and plugin configuration.

### Dependency Advisory Remediation

- Ran the approved npm registry audit and found three high-severity transitive
  advisories in `brace-expansion`, `nanoid`, and `postcss`.
- Regenerated the lockfile with fixed versions (`5.0.9`, `3.3.18`, and
  `8.5.26`), removed two unnecessary optional packages, and confirmed
  `npm audit` reports zero vulnerabilities and `npm ci --dry-run` succeeds.
- Re-generated the lockfile with npm 10.9.2 after GitHub Actions exposed an
  npm 11 compatibility difference: `@emnapi/core` and `@emnapi/runtime` are
  retained so the release workflow's clean install resolves the optional WASI
  tree while the audit fixes remain applied.

### AI-Friendly Project Context

- Added root `AGENTS.md` and `docs/AI_CONTEXT.md` to give AI tools a concise,
  source-aligned contract for VeloDom identity, public syntax, Core/application
  boundaries, optional capabilities, and safe site-generation workflow.
- Added `examples/blog/README.md` to document the showcase routes, application
  conventions, and verification expectations without promoting demo code to
  framework API.
- Linked the AI context from the root README and canonical guide and recorded
  the work in the V1 roadmap.
- Regenerated the lockfile with npm 10 to include Tailwind's bundled Linux WASI
  runtime and its optional peer metadata, then ignored local npm caches so
  clean `npm ci` installs can resolve consistently.
- Updated the browser release workflow to the Node 24-compatible checkout and
  setup-node action versions.
- Added a scroll-driven fallback to the showcase documentation sidebars, so
  active sections remain synchronized in Chromium and Firefox as well as
  WebKit. Browser E2E failures now report their exact route step, URL, and
  visible page state instead of only a generic wait timeout.
- Corrected the static SEO test to inspect the no-JavaScript DOM directly.
  Chromium and Firefox correctly prevent the previous page-side wait callback
  from executing when JavaScript is disabled.
- Enabled browser E2E stage logging in the release workflow so stale reruns and
  browser-specific failures can be identified from Actions output immediately.
- Fixed the router's intercepted same-page hash contract. After updating
  history, scrolling, and focus, VeloDom now emits the `hashchange` notification
  that native anchor navigation would have produced. Documentation tabs and
  other route-aware listeners therefore synchronize consistently in Firefox
  and WebKit without reloading the current page. Added a router regression test
  for the event URLs and single-page lifecycle preservation.
- Preserved `oldURL` and `newURL` on the router's fallback hash event for DOM
  implementations without a native `HashChangeEvent` constructor.
- Enabled TypeScript checks for unused locals/parameters, unchecked indexed
  access, implicit returns, and switch fallthrough; clarified the four early
  exit paths that were previously implicit.
- Deduplicated state keys in inspect/stats/docs/graph analysis and reworded
  build intelligence so optional runtime features not requested by templates
  are treated as lazy availability rather than application dead-code debt.
- Extended project intelligence to read top-level keys from the recommended
  `export const state = { ... }` seed, including seeds with nested values,
  without requiring a JavaScript or TypeScript parser dependency.
- Rebuilt the showcase sidebar synchronization around the router's restored
  `hashchange` contract. A scroll-idle lock prevents smooth scrolling from
  selecting intermediate sections; WebKit desktop and mobile browser suites
  now complete successfully without application click-handler duplication.
- Moved static home-page learning copy into `src/content/learning.js`, adopted
  the shorter exported state seed, and kept page `init()` focused on its async
  article load.
- Removed the unused Tailwind v3-style config plus redundant root declarations
  for the example's styling packages and unused Autoprefixer dependency. The
  npm 10 lockfile was regenerated and its clean-install dry run passed.
- Removed the unreferenced 270 kB `src/assets/favicon.ico`; the optimized PNG
  is the only application logo/favicon source referenced by the site.
- Corrected the AI generation contract to access lifecycle cleanup through
  `ctx.onCleanup()` and documented the current same-page hash event behavior,
  preventing generated application code from using an obsolete hook shape.
- Expanded documentation consistency checks to cover the AI context and example
  guide, reject direct lifecycle cleanup destructuring, and reject bare hash
  targets on `vd-nav` links.
- Aligned the AI bootstrap/request examples with the public beginner path:
  `await mountVeloDom()`, standard HTML input syntax, and the conventional
  `posts.get` name produced by `src/api/posts/get.js`.
- Completed the post-refactor release verification: all 255 automated tests,
  documentation checks, TypeScript, ESLint, package build and consumer checks,
  tarball allowlist audit, production build, and performance budgets pass.
  The example reports no doctor issues and scores 100/100 in `vd health`.
- Re-ran the full application smoke journey successfully in Chromium, desktop
  WebKit, and Mobile WebKit. Local Firefox remains an environment gate because
  its SWGL compositor fails before VeloDom application code can load; the
  GitHub Actions matrix remains the authoritative Firefox verification path.

## 2026-08-24

### Academic Documentation Showcase

- Rebuilt the application-owned `examples/blog` site as a modern VeloDom
  reference and learning path. It now teaches folder and one-file authoring,
  state, directives, components, layouts, routing, requests, forms, SEO,
  build-only helpers, testing, and developer tooling through public syntax.
- Added consistently styled semantic `<pre><code>` windows, live state and
  request lessons, dynamic study notes, modern navigation/footer treatment,
  and a matching route-not-found experience. Literal template source is guarded
  with `vd-pre`, so documentation code cannot be accidentally compiled. Live
  and copyable conditional examples now use explicit Boolean expressions to
  match VeloDom's strict `vd-if` contract.
- Fixed the feature-reference sidebar to use `/features#section` links. The
  router now receives an app-relative path and performs same-page scrolling
  without reporting unsupported navigation targets.
- Added dedicated reference lessons for application API routes, middleware,
  provider-based authentication, cache and retry helpers, RTL direction, and
  native lazy/responsive image authoring. Each example keeps framework runtime
  behavior separate from application and backend policy.
- Added `/reference` as the source-verified package API catalog. It covers all
  public subpaths, 61 exported values, preferred template syntax, build-only
  helpers, explicit integrations, and every CLI command with code examples.
- Removed the remaining unreferenced legacy showcase components. `vd doctor`
  now reports no issues and `vd health` reports 100/100 with SEO coverage for
  all six example pages.
- Made the feature-reference sidebar actively follow hash links, clicked
  lessons, and the section currently visible during scrolling. Active links now
  expose `aria-current="location"` and retain clear keyboard focus styling.
- Applied the same navigation behavior to the `/reference` API catalog through
  one application-owned sidebar helper, with hash, click, and scroll coverage
  in the browser smoke suite.
- Improved the compact navigation trigger contrast and open-state styling for
  tablet and small-desktop layouts.
- Added route-aware active styling and `aria-current="page"` to the shared
  Learn, Guides, API, and Single-file navigation links in both menu layouts.
- Re-audited public source contracts against the guide and showcase. The
  canonical documentation remains complete for 11 package exports, 61 public
  values, 43 preferred directives, and 12 CLI commands; the guided site now
  groups page data, error recovery, prefetch, and compiler safety in a
  dedicated lesson.
- Delayed documentation-sidebar viewport observation until hash scrolling
  finishes, so a direct lesson URL cannot briefly select its preceding section.

### Documentation and Project-Intelligence Audit

- Extended the consistency audit to extract public values from TypeScript entry
  modules, preferred directives from the compiler contract, and commands from
  the CLI dispatcher. The canonical `docs/README.md` must name all of them.
- Fixed static inspection of `vd-pre` containers. Literal code remains visible
  to the compiler's preservation behavior, while directive usage, event,
  component, request, ref, and dead-code analysis ignores preserved content.
- Added a CLI regression fixture proving literal `vd-lazy` and
  `fakeHandler()` examples cannot affect inspection or doctor results.
- Corrected strict Boolean request examples in the registry-facing package
  README and expanded the canonical content/localization examples for their
  complete public build-time helper sets.

### Release-Gate Diagnostics

- Bounded browser launch attempts in the real-browser release check. A failed
  Firefox or WebKit startup now reports the affected target after a configurable
  timeout instead of leaving strict release verification running indefinitely.
- Reconfirmed the full Chromium browser suite, package checks, production build,
  tarball audit, documentation checks, lint, types, and 255 automated tests.
- Repaired the mobile smoke test to follow the visible course CTA rather than a
  desktop navigation item intentionally hidden at mobile breakpoints. Chromium,
  WebKit desktop, and Mobile WebKit now pass the full release smoke suite.
- Recorded the local Firefox SWGL compositor failure as the only local strict-
  browser blocker; no framework regression was observed in the passing targets.
- Confirmed that the requested `velodom@1.0.0` package is not retrievable from
  the registry, while the local npm client remains unauthenticated. Name
  ownership and publisher access therefore remain human account gates.
- Added a GitHub Actions release browser matrix for Ubuntu-based Chromium,
  Firefox, WebKit, and Mobile WebKit verification. It is ready to replace the
  host-limited local Firefox run once the branch is pushed.
- Added a compact-desktop navigation regression scenario to the browser suite
  after introducing the native menu below the wide-desktop breakpoint.

### npm Package Readiness and Workspace Cleanup

- Moved static SEO emission to Vite's post-write hook. This guarantees that
  the built HTML shell exists before VeloDom reads it, including under the
  current Vite/Rolldown build lifecycle.
- Audited the repository and confirmed the publishable boundary is
  `packages/velodom`; examples, editor tooling, tests, fixtures, and release
  scripts remain workspace-owned and are excluded from the npm tarball.
- Completed npm discovery metadata with author, keywords, monorepo directory,
  and public-access intent while retaining `private: true` as the accidental
  publication guard.
- Rebuilt the registry-facing package README around installation, folder and
  optional `.vd` authoring, public subpaths, CLI capabilities, and package
  ownership rules.
- Registered `packages/velodom-vscode` as a private workspace consumer and
  synchronized the lockfile.
- Hardened package checks and tests so metadata, self-contained build scripts,
  prepack behavior, workspace consumers, and public-package boundaries cannot
  silently regress.
- Kept generated `lib`, `types`, dependency, and example `dist` outputs local
  and ignored; they are reproducible artifacts rather than tracked source.
- Verified 255 tests, documentation headers/JSDoc, types, lint, an isolated
  package consumer, production build, performance budgets, package dry-run,
  project doctor, 100/100 project health, and targeted Chromium E2E.
- Recorded the external dependency-advisory lookup as an explicit release task
  because it requires permission to send the lockfile dependency tree to npm.
- Consolidated the documentation surface from many specialized files into the
  main guide plus `TODO.md`, `CHANGELOG.md`, `NOTES.md`, and `RELEASING.md`.
  Architecture identity, adapters, browser policy, deployment, editor
  intelligence, devtools, and future-research boundaries remain documented;
  only duplicate file boundaries were removed.

### Strategic Roadmap Review

- Reorganized the active roadmap around one VeloDom V1 product line with
  implemented, current, planned, research, deferred, and rejected states.
  Legacy V1.1/V1.2/V2 phase names remain historical context rather than public
  product generations.
- Added a documentation consistency audit that derives public imports from the
  package manifest, verifies release documentation covers every export, and
  rejects references to removed specialized documentation files.
- Strengthened the package contract audit so `velodom/localization` and
  `velodom/node` are verified alongside every other public subpath.
- Clarified static rendering, client takeover, hydration, and the Node adapter
  boundary in the primary guide without adding server/runtime features.
- Moved the practical five-minute path ahead of the detailed authoring reference
  and extended documentation checks for CLI examples, legacy product labels,
  and accidental private-import examples.

- Rebuilt the main framework guide and npm package README around the current V1
  authoring model: folder mode, optional `.vd` files, the complete directive
  syntax, layouts, components, requests, forms, SEO, localization, CLI, public
  subpaths, testing, and application boundaries. The examples now use current
  `vd-*` names and document legacy `data-vd-*` only as compatibility input.
- Completed the V1.1 optional localization-DX work without a translation
  runtime: inferred and generated translation keys, native `Intl` formatting,
  locale switching that preserves query/hash values, and static canonical plus
  `hreflang` SEO records. ICU and request-time locale concerns remain future
  adapter research rather than Core behavior.
- Added `vd create page <name> --demo <kind>` for small static, counter,
  request, form, and SEO examples. The files stay folder-first, use the smallest
  necessary syntax, and request demos include a matching file API handler.
- Added a bounded Phase 25 localization-DX roadmap after comparing VeloDom with
  `next-intl`: typed keys, native `Intl` formatting, locale-aware links, static
  `hreflang`, optional ICU research, and adapter-owned negotiation. No
  translation runtime or provider was added to V1.
- Added optional `export const state = { ... }` seeds for page and component
  scripts. They merge before `init()` and support concise safe `count++` and
  `count--` bindings without a second template syntax; only application state
  values are writable and protected internals remain blocked.
- Added optional named middleware files: a default export in
  `src/api/middleware/auth.js` is available as `auth`, while the explicit
  `src/api/middleware.js` registry remains higher priority. CLI inspection and
  doctor now follow the same effective convention.
- Added optional nested file API routes: a default export in
  `src/api/posts/get.js` registers `posts.get` without a central registry.
  Root API modules remain ordinary imports, invalid or duplicate file routes
  fail with clear startup errors, and `src/api/routes.js` retains precedence
  for advanced route configuration.
- Added `vd create feature <name>` for minimal pages and optional `--blog`
  vertical slices. It creates conventional user-owned files without touching a
  route registry or adding browser runtime behavior.
- Added a bounded future authoring-ergonomics phase: feature scaffolding,
  optional file-based API/middleware conventions, a small exported state seed,
  and focused page demos. It explicitly rejects a second terse template syntax.
- Completed the optional research boundary for AI providers, migration helpers,
  and CMS/deployment adapters. The decisions permit separate, reviewable tools
  while rejecting mandatory AI, vendor runtimes, credential stores, and
  compatibility layers in VeloDom Core.
- Added `velodom/node`, an explicit Node HTTP-to-Fetch adapter for
  application-owned dynamic responses. It does not add automatic SSR,
  hydration, sessions, or streaming to the browser framework.
- Extended `velodom/content` with typed, application-owned external loaders
  and route/slug/tag lookup indexes generated from the normalized entry set.
  CMS credentials and vendor SDKs remain outside the framework.
- Promoted the optional VS Code integration to stable workspace language tools:
  it activates for opted-in HTML diagnostics, reuses compiler diagnostics, and
  indexes conventional component/route names for completion and definition
  navigation without becoming an application dependency.
- Added `velodom/localization`, an optional build-time-only dictionary helper.
  It validates typed message trees, surfaces missing keys through the Vite
  plugin, and expands route-specific static SEO records per locale without a
  browser translation runtime.
- Added explicit `data.js|ts` page-data cache policies for public data only.
  The router-local cache is opt-in, route/query scoped, memory-only, and can
  stale-while-revalidate without touching cookies, headers, secrets, or
  user-specific values.
- Added opt-in `computed`, `watch`, and `effect` helpers over an explicitly
  supplied shallow state source; they add no global store, automatic dependency
  graph, or template syntax.
- Audited the beginner CLI/Vite path: convention scaffolds, routes, build
  reports, and source-offset compiler errors already cover the V1.1 workflow
  without adding a separate HMR abstraction.
- Added high-confidence compiler security diagnostics for `javascript:` URLs,
  new-tab links without `noopener`, password forms using GET, and likely secret
  Vite environment variables without treating static checks as server policy.
- Stabilized optional integration contracts by publishing
  `assertPluginConformance()` alongside the versioned resource-adapter
  assertion and documenting the static-resource boundary.
- Added `vd types`, an optional static declaration generator for page route
  parameters, page configs, API route names, and conventionally discovered
  component props; it produces an application-owned `velodom/app` type module
  with no browser runtime cost.
- Implemented optional progressive native forms through
  `createProgressiveFormsPlugin()` and `vd-form`; native action/method fields,
  browser validation, CSRF fields, loading, server errors, and redirects stay
  visible and application-owned.
- Added an opt-in CSS total budget for build verification through
  `VELODOM_CSS_BUDGET_KB`; it is intentionally disabled by default, while
  `vd build-report` continues to report CSS size for every project.
- Implemented the V1.1 page-data contract: conventional `data.js|ts` modules
  load before page initialization, receive route context, expose `data` to
  templates/hooks, and reuse matching safely serialized prerender data.
- Implemented the first V1.1 roadmap item: opt-in page-owned static
  prerendering with concrete entries, build-only data, safe HTML validation,
  client-takeover metadata, and browser-config stripping.
- Added public `PagePrerenderConfig`, `PrerenderEntry`, and
  `PrerenderRenderContext` type contracts plus regression coverage for dynamic
  route output and `.vd` config stripping.
- Added an ordered post-V1 roadmap: static prerendering, unified page data,
  progressive forms, optional typed declarations, adapter contracts, compiler
  security diagnostics, CLI improvements, and derived state for V1.1.
- Deferred full hybrid rendering and remaining server integration to V2; partial
  hydration,
  DevTools, and Edge/streaming work remain V2 concerns.
- Kept AI, migration tools, and CMS integrations optional research items and
  explicitly rejected JSX, mandatory Virtual DOM, mandatory SSR, mandatory
  global state, mandatory CSS, and required AI for V1.

## 2026-08-17

### Beginner-First V1 Authoring

- Added `mountVeloDom()` as the recommended one-call Vite entry point and
  `createViteApp()` as the non-mounting convenience API.
- Added convention discovery for optional `src/api/routes.js|ts` and
  `src/api/middleware.js|ts`, while preserving explicit option overrides and
  the generic `createApp()` API.
- Added deterministic errors and regression tests for ambiguous convention
  files and invalid registry exports.
- Updated the CLI project scaffold to emit a complete HTML document and removed
  its misleading `mount("#app")` argument.
- Removed stale hard-coded source lines from global error reporting.
- Switched the showcase from the complete daisyUI CSS import to the Tailwind
  plugin with light/dark themes, reducing generated CSS from about 1.16 MB to
  about 91 KB.
- Reworked the primary documentation and roadmap around the beginner path,
  explicit advanced escape hatches, project ownership, and truthful V1 limits.
- Included linked focused docs, engineering notes, and the roadmap in the npm
  allowlist, and expanded package-contract checks to cover asset/devtools
  subpaths so installed-package documentation and exports remain complete.
- Split CLI filesystem analysis, output formatting, shared contracts, and
  scaffolding templates into focused internal modules. The command entry file
  is roughly one-third smaller while CLI syntax and output remain compatible.
- Updated performance-budget classification so the new Node-only `cli/`
  modules remain excluded from browser-runtime package measurements.
- Retried the strict browser matrix; Chromium and all build/package gates
  passed, but local Firefox headless startup stalled again, leaving that
  environment-specific release gate open for CI.
- Added optional folder-mode `config.ts` discovery across the Vite adapter,
  static SEO renderer, CLI inspection, doctor/docs reports, and `--ts`
  scaffolding. TypeScript remains an optional peer used only by typed config
  builds; Vanilla `config.js` projects add no compiler requirement.
- Converted the showcase Features page to typed config and added regression
  coverage for TypeScript SEO evaluation and CLI generation.
- Moved all framework-owned source, package binaries, built ESM, and generated
  declarations into the publishable `packages/velodom` workspace package.
- Replaced the former repository-document tarball allowlist with a focused npm
  README and license; full roadmap and architecture records remain repository
  documentation instead of application dependencies.
- Moved the documentation blog to `examples/blog` and removed every direct
  framework-source import so it verifies the same `velodom` public subpaths as
  an external application.
- Added application-local `@` and standards-based `#app/*` aliases while
  preserving relative imports, and updated CLI project scaffolding to generate
  the Vite and editor configuration automatically.
- Made Vite an optional peer of the focused Vite integrations and kept
  TypeScript optional, so adapter-independent Vanilla users install only the
  runtime they choose.
- Kept the blog's Tailwind scan rooted to its own workspace, reducing the
  current generated CSS artifact further to about 70 KB.
- Consolidated repository-level Markdown documentation into `docs/`; the root
  README now acts as a short entry point and the npm package retains its own
  focused README for registry rendering.
- Kept the runnable documentation blog in `examples/blog`, moved the
  installed-package verification fixture to `tools/test-fixtures/package-consumer`,
  and relocated the optional VS Code integration to `packages/velodom-vscode`.
- Moved repository-only release, package, browser, documentation, and
  performance checks to `tools/scripts`; they remain workspace tooling and are
  intentionally excluded from the published `velodom` package.
- Grouped automated framework tests, test helpers, and the installed-package
  fixture under `tools/`, and made the test command target only
  `tools/tests/**/*.test.js` so fixtures cannot be mistaken for executable
  test files.
- Retained the workspace check at root `tsconfig.json` and moved package
  TypeScript options, build/declaration configs, and declaration rewriter
  beside `packages/velodom` so package builds no longer depend on `tools/`.
- Kept generated dependency and build output excluded from Git; the lockfile
  and npm scripts remain the reproducible source of installation and build
  state.

## 2026-08-16

### Post-V1 Roadmap Decision

- Added a constrained competitive-evolution roadmap for adapter stability,
  optional authoring types, build-time asset quality, editor intelligence,
  static-rendering research, progressive HTML forms, localization, and
  development-only inspection.
- Recorded the architectural guardrail that these initiatives must not turn
  VeloDom into a mandatory virtual-DOM, JSX, CMS, global-store, or universal
  SSR framework.
- Added the versioned V1 resource-adapter contract, a public conformance
  assertion, adapter fixtures, and optional inference helpers for page config,
  request routes, plugins, and adapters in both JavaScript and TypeScript.
- Added optional Node-only image inspection and responsive attribute helpers,
  plus compiler diagnostics for image dimensions, without a browser asset
  runtime or image-provider dependency.
- Added compiler-backed editor analysis and preferred-directive completions;
  `.vd` template diagnostics now retain original-document line locations in
  both the Vite error path and optional language-service output.
- Recorded V2 implementation contracts for build-time prerendering,
  progressive native forms, optional localization, and development inspection;
  added a fixture confirming that native forms add no runtime feature.
- Added an optional standalone `velodom/devtools` inspector and VS Code tools
  backed by the public compiler language service. Neither is a
  required application runtime dependency.

### V1 Release Polish

- Reconciled release-candidate documentation so README, TODO, NOTES,
  RELEASE_DECISION, Content Mode docs, and DX rubric describe one consistent
  current state.
- Removed stale README limitations around the already-frozen local public V1
  API and clarified that `seo.renderPage` client takeover is not SSR or
  hydration.
- Converted the Content Mode document from a planned-design note into current
  `velodom/content` implementation documentation plus future improvements.
- Updated current release evidence to 201 passing automated tests while keeping
  historical changelog counts unchanged.
- Installed missing Playwright Firefox/WebKit browsers for release verification;
  WebKit and mobile WebKit now pass locally, while Firefox strict verification
  remains pending because local headless startup timed out.
- Verified the provider-neutral static-hosting contract locally: root files,
  generated route folders, dynamic SEO entries, and unknown-route SPA fallback
  resolve as documented.

### Performance Pass

- Reviewed loop rerender behavior and avoided structural loop rerenders when
  the iterable item identity sequence is unchanged.
- Reduced unnecessary DOM writes across text, attribute, value, boolean, class,
  and style bindings when evaluated values do not change.
- Expanded `npm run benchmark:rendering` with a stable-loop update case.
- Added `npm run performance:check` and wired it into `npm run build` to
  enforce JavaScript budgets for generated chunks and package runtime modules.
- Brought the automated suite to 191 passing tests.

### Developer Tooling CLI

- Added package binaries for `vd` and `create-velodom`.
- Added `vd inspect`, `vd stats`, and `vd routes` as local static project
  intelligence commands.
- Extended the project analyzer manifest to include CSS files, refs, events,
  state keys, exposed names, and SEO config files.
- Added `vd doctor` for static compiler diagnostics, missing component
  references, broken request references, and simple page config mistakes.
- Extended `vd doctor` with warnings for broken `$refs`, duplicate declarative
  `vd-state` names, unknown event handlers, unsafe dynamic directive
  expressions, unused components/request routes/middleware, unreachable
  showcase files, circular component dependencies, and large templates.
- Added `vd build-report` for text or JSON summaries of project counts, SEO
  coverage, compiler features, unused runtime feature modules, largest source
  templates, and generated JS/CSS chunks.
- Extended `vd build-report` with unused directive families, largest route
  chunks, repeated heavy-dependency signals when visible in generated chunk
  text, and advisory optimization suggestions.
- Added `vd graph` to export page-route, template-component, request, and
  middleware relationships as text, JSON, or Mermaid.
- Extended `vd graph` to include statically provable ref, event, state, and
  expose relationships.
- Added `vd health` as a non-blocking score over doctor issues, SEO coverage,
  accessibility/compiler warnings, simple security checks, generated asset
  size, and unused runtime feature signals with optional threshold enforcement.
- Added `vd docs` for Markdown or JSON documentation covering routes,
  components, requests, middleware, plugins, refs, events, state, expose,
  slots, and SEO coverage where static analysis can prove the relationship.
- Added `vd benchmark` as a wrapper around the local rendering benchmark
  script.
- Improved static project intelligence so expose object shorthand is detected
  in `vd inspect`, `vd graph`, and `vd docs`.
- Deduplicated repeated static state/ref entries in the inspection manifest so
  project reports describe unique relationships instead of repeated
  assignments.

### V1 Framework Site

- Converted the application showcase into the first VeloDom framework site:
  a local documentation blog with V1 positioning, feature articles, live
  directive/component/request examples, dynamic article routes, and SEO entries.
- Marked the local package identity as `1.0.0` while keeping `private: true`
  so the repository represents a V1 release candidate without authorizing npm
  publication.
- Added `RELEASE_DECISION.md` to record npm ownership, access, 2FA, version,
  tagging, and publication approval gates before any public release.
- Added provider-neutral deployment recipes for static hosting, Vercel,
  Netlify, Cloudflare Pages, Nginx, Apache, and GitHub Pages.
- Added Content Mode documentation for Markdown/local content collections,
  generated SEO data, RSS/search-index artifacts, and future build-time
  diagnostics without adding browser runtime weight.
- Added the optional `velodom/content` package subpath with Markdown
  frontmatter parsing, safe HTML output, SEO route entries, sitemap records,
  RSS XML generation, search-index records, and typed content metadata.
- Removed obsolete DummyJSON, login, category, CRUD studio, application auth,
  application middleware, and form-shell files from the example application.
- Simplified `src/main.js` so the site mounts with the Vite adapter and one
  local article request route used by `vd-request` examples.
- Improved modal overlay semantics, footer external-link security, and
  accessible control names so `vd doctor` reports no project issues.
- Updated the browser E2E smoke path to verify V1 routes, one-file pages,
  local request examples, dynamic article pages, and no-JavaScript SEO.
- Refined performance budget checks so package runtime budgets exclude
  Node-only CLI and testing utility modules.
- Added convention-first scaffolding for pages, components, API files, demo
  pages, middleware files, plugins, and starter projects.
- Extended package contract checks to include the CLI wrappers in the
  publishable file allowlist.
- Brought the automated suite to 196 passing tests after removing an obsolete
  application-validation test tied to deleted demo files.

### Public Testing Utilities

- Added the `velodom/testing` package subpath.
- Added `mountTestPage()` for compiling and mounting page-like templates in
  browser-like test environments.
- Added `mountTestComponent()` for mounting in-memory component definitions
  with props, slots, module hooks, styles, and optional manifest overrides.
- Brought the automated suite to 196 passing tests.

### Roadmap Research and Identity

- Added `docs/DX_RUBRIC.md` to define the acceptance rules for future
  developer-experience features.
- Added `docs/FUTURE_RESEARCH.md` to record optional AI-provider and migration
  helper research without adding runtime features.
- Added `docs/FRAMEWORK_IDENTITY.md` to capture positioning, audience, plain
  JavaScript tradeoffs, heavier-framework tradeoffs, and intentional
  non-goals.

## 2026-07-10

### Request Status Naming

- Froze automatic request state suffixes as `Result`, `Loading`, and `Error`.
- Moved the suffix values into framework constants so the request binding
  derivation no longer depends on hidden string literals.
- Added coverage for replacing `Result`, appending suffixes to targets without
  `Result`, and preserving nested state paths.
- Brought the automated suite to 144 passing tests.

### Component Expose API

- Froze the component public API pattern as `return { state, expose }`.
- Exported the `ComponentExpose` TypeScript contract for application component
  scripts.
- Added coverage for plain-object exposed values and invalid non-object
  expose returns.
- Brought the automated suite to 146 passing tests.

### Text Interpolation

- Added compiler-first `{{ expression }}` text interpolation for page,
  component, and `.vd` templates.
- Lowered interpolation to existing `data-vd-text` bindings so the browser
  runtime stays lightweight and uses the existing safe expression engine.
- Kept interpolation disabled inside `<script>` and `<style>` content.
- Added literal interpolation escaping with `\{{ expression }}`.
- Added `vd-pre` / `data-vd-pre` raw template regions for documentation and
  code examples that must preserve `{{ }}` text.
- Brought the automated suite to 154 passing tests.

### Page Layouts

- Added optional `src/layouts/` discovery for folder-mode and `.vd` page
  shells.
- Added `layout` page config support with automatic `default`, named layouts,
  and `layout: false` opt-out.
- Mounted layout directives and components together with the active page by
  replacing one `<vd-page></vd-page>` placeholder before runtime activation.
- Migrated the showcase app to a shared `src/layouts/default.vd` shell for
  nav/footer reuse.
- Brought the automated suite to 157 passing tests.

### Documentation Recipes

- Added a create/update/delete form recipe that connects `vd-model`,
  `vd-request`, `vd-request-config`, optional validation, and automatic request
  status state.
- Added common framework error examples for compiler directives, expressions,
  conditionals, missing state functions, layouts, component paths, cross-page
  writes, and request config mistakes.

### Request UX

- Added declarative request debounce via `debounceMs` / `debounce` in
  `vd-request-config` and the `vd-debounce` shorthand attribute.
- Pending debounced requests are cancelled on repeated triggers and component
  or page cleanup.
- Added declarative request throttle via `throttleMs` / `throttle` in
  `vd-request-config` and the `vd-throttle` shorthand attribute.
- Throttled requests run on the leading trigger and ignore repeated triggers
  inside the configured window.
- Added declarative request retry via `retry`, `retries`, and `retryDelayMs`
  in `vd-request-config`.
- Added opt-in auth-failure redirects via route-level `authRedirect` and
  per-request `redirectOnAuthFailure` configuration.
- Added global `requestHooks.beforeRequest` / `requestHooks.afterRequest` and
  per-request `onSuccess` callbacks for declarative requests.
- Verified the optional native validation API, required/min/max/pattern
  handling, invalid form/field marker conventions, and request-flow blocking.
- Added advisory RTL CSS diagnostics for physical directional properties in
  folder CSS and `.vd` style blocks.
- Added app-shell UTF-8 diagnostics and `:global(...)` escapes for scoped CSS
  ancestor direction selectors.
- Added optional `createRtlFlipStyles()` CSS generation and kept full i18n as
  separate future plugin research.
- Brought the automated suite to 190 passing tests.

### RTL and Multilingual CSS

- Added optional `createDirectionPlugin()` for controlled document `lang` and
  `dir` updates.
- Exposed direction data through `app.direction`, `ctx.direction`, and the
  reactive template state key `$direction`.
- Added compiler normalization for `vd-rtl-flip` / `data-vd-rtl-flip` and the
  `rtl-flip` runtime manifest feature without loading mandatory RTL runtime.
- Brought the automated suite to 166 passing tests.

## 2026-07-09

### Router UX

- Added opt-in route prefetch through `vd-prefetch` / `data-vd-prefetch`.
  Prefetch runs on link intent events such as hover, focus, and touch start,
  warms matched page resources, and does not mount or initialize the page.
- Added compiler normalization and runtime feature-manifest coverage for
  `vd-prefetch`.
- Extended router integration coverage, bringing the automated suite to 108
  passing tests.

### Validation

- Added `createValidationPlugin()` as an optional native-form validation plugin.
  It only handles forms marked with `vd-validate` / `data-vd-validate` and
  blocks invalid submits before declarative request handlers run.
- Added compiler support for `vd-validate` without adding a mandatory runtime
  directive feature.
- Enabled the optional validation plugin in the showcase app and marked create
  and edit post forms with `vd-validate`.
- Added validation plugin and compiler coverage, bringing the automated suite
  to 111 passing tests.

### Shared State

- Added `createSharedState()` as an optional application-owned shared state
  handle with explicit plugin registration.
- Kept shared state out of the default app runtime; the app only receives
  `app.shared[name]` after the matching plugin is installed.
- Added duplicate-name protection, cleanup behavior, public type exports, and
  shared-state coverage, bringing the automated suite to 114 passing tests.

### Optional Request Tools

- Added `createRequestCache()` as an application-owned wrapper around
  `requestJson()` for GET-like request caching.
- Added `withRequestRetry()` as an explicit wrapper for application request
  handlers instead of enabling declarative retries globally.
- Added `createDevtoolsPlugin()` as an opt-in browser bridge that installs no
  globals unless registered through `plugins`.
- Added optional-tools coverage, bringing the automated suite to 118 passing
  tests.

### SSR Deferral

- Added a package-boundary guard that keeps SSR, hydration, and
  `renderToString`-style APIs out of the V1 public surface.
- Documented the browser-first SSR/hydration deferral policy, bringing the
  automated suite to 119 passing tests.

### Source-aware Errors

- Added source metadata to validated adapter loaders so page, component, style,
  manifest, and config failures can point at the user-owned file that caused
  the error.
- Updated the runtime error reporter to prefer adapter-provided file and hint
  metadata over generic fallback locations.
- Added adapter and reporter coverage, bringing the automated suite to 121
  passing tests.

### Rendering Benchmarks

- Added `npm run benchmark:rendering` for repeatable local happy-dom benchmarks
  covering common page bindings and loop rendering updates.
- Documented the benchmark as a diagnostic baseline, not a release performance
  budget.

### License and Package Name

- Selected the MIT License and added the root `LICENSE` file.
- Added `license: "MIT"` to `package.json`.
- Re-checked the npm registry for `velodom`; the registry returned 404 on
  2026-07-09, so the name appears available but still requires an approved npm
  account before publication.
- Updated release blockers to keep `private: true` until npm account access,
  package reservation, and publication approval are explicit.

### Browser E2E Matrix

- Expanded `npm run test:browser` from a Chrome/Edge-only smoke path to a
  Playwright matrix covering Chromium/Chrome/Edge, Firefox, WebKit, and a mobile
  WebKit viewport profile.
- Kept Chromium/Chrome/Edge required locally while optional Firefox/WebKit
  targets skip clearly when their Playwright browser binaries are missing.
- Added `VELODOM_BROWSER_TARGETS` and `VELODOM_BROWSER_STRICT=1` controls for
  explicit target selection and strict CI-style matrix enforcement.
- Added `.gitignore` protection for local npm recovery-code exports.
- Hardened the CRUD Studio browser smoke path so it waits for `vd-model`
  runtime readiness before submitting the request form.

### DummyJSON Blog Showcase

- Replaced the previous mixed demo application with a VeloDom-branded
  DummyJSON blog showcase.
- Added practical pages for post lists, post details, comments, categories,
  login, and a CRUD studio for create/update/delete post requests.
- Added reusable application components for navigation, footer, loader,
  error messages, modal, form shell, and post cards.
- Removed legacy profile, TypeScript demo, error-lab, emit-demo, create-post,
  and edit-post routes that duplicated the final showcase.
- Updated the browser E2E smoke path to validate the new CRUD studio.

### Dynamic SEO Hooks

- Added build-time `seo.entries` hooks so application pages can load concrete
  dynamic SEO routes from an API or CMS without adding browser runtime weight.
- Added a Vite plugin-level SEO entries hook for projects that want central
  dynamic-route discovery.
- Stripped build-only SEO entry hooks from browser page-config modules so
  API/CMS discovery stays out of the client bundle.
- Updated the DummyJSON blog post page to generate dynamic post metadata from
  DummyJSON with a local fallback for offline builds.
- Added static SEO renderer and public type export coverage, bringing the
  automated suite to 122 passing tests.

### Optional Single-File Modules

- Added optional `.vd` page and component modules with `<template>`,
  `<script>`, `<style>`, and `<config>` blocks.
- Kept folder mode authoritative: folder resources override `.vd` resources
  with the same logical page or component name.
- Compiled `.vd` templates through the same compiler, manifest generation, and
  scoped-style pipeline used by folder `index.html` files.
- Added static SEO support for page `<config>` blocks.
- Added `/single-file` and `src/components/shared/single-file-card.vd` to the
  showcase and browser smoke path.
- Added single-file parser, resource-map, Vite module, and static SEO coverage,
  bringing the automated suite to 131 passing tests.

### Static SEO Content Rendering

- Added optional build-time `seo.renderPage` support for route-specific static
  content inside generated SEO documents.
- Marked rendered content with `data-vd-static-content` and
  `data-vd-static-hydration="client-takeover"` so the behavior stays explicit:
  VeloDom serves richer initial HTML, then the normal client router takes over.
- Kept the hook out of browser bundles and rejected script tags from returned
  static content; structured data remains handled through `seo.jsonLd`.
- Added renderer and hook coverage, bringing the automated suite to 134 passing
  tests.

### Structured Data Fixtures

- Added reusable JSON-LD fixtures for common content types: WebSite,
  BlogPosting, BreadcrumbList, FAQPage, and Product.
- Extended SEO normalization and static-renderer coverage so structured-data
  arrays stay valid while invalid JSON-LD shapes fail before rendering.
- Brought the automated suite to 138 passing tests.

### Internal Naming Freeze

- Froze the internal router module filenames `page-router.ts` and
  `requests/request-router.ts`.
- Added a package-level guard so runtime and directive wiring continue to use
  those internal names intentionally.
- Brought the automated suite to 139 passing tests.

### Request State Naming

- Chose `vd-auto-state` as the preferred HTML-first alias for automatic request
  status state.
- Kept `vd-request-state` / `data-vd-request-state` compatible and stable; the
  compiler normalizes `vd-auto-state` to the canonical runtime attribute.
- Added runtime support for direct `data-vd-auto-state` usage in uncompiled
  templates.
- Brought the automated suite to 141 passing tests.

## 2026-07-08

### Router UX

- Added hash-fragment navigation support so routes like `/features#requests`
  scroll to matching `id` or named-anchor targets after page render.
- Optimized same-page hash changes so the router updates history and scrolls
  directly without remounting the current page.
- Added manual browser scroll restoration for back/forward navigation while
  keeping normal programmatic navigation at the top of the page.
- Added router-managed focus after navigation: hash targets are focused for
  fragment routes, while normal route changes prefer `data-vd-focus`, `h1`,
  page landmarks, and finally `#app`.
- Exposed the current route fragment as `ctx.route.hash`.

### Error Recovery

- Added an application-level `createApp({ errorBoundary })` hook for
  recoverable page navigation crashes.
- Added safe string fallback rendering through a generated `role="alert"`
  boundary and DOM-node fallback support for application-owned retry or
  navigation controls.
- Added `retry()` and `navigate(path)` recovery helpers to the boundary context.
- Extended the same boundary hook to component crashes so a failed component can
  render a local fallback without replacing the page.
- Added component retry support that remounts the failed component host.
- Kept the fatal error screen as the fallback when no boundary is registered,
  the boundary returns `false`, or the boundary itself fails.

### Accessibility Tests

- Added integration coverage for keyboard event modifiers, focusable element
  order after component mounting, and semantic static SEO fallback output.

### Architecture Documentation

- Refactored `ARCHITECTURE.md` (the framework architecture brief) to match the current
  framework direction: HTML-first authoring, TypeScript core with JavaScript or
  TypeScript application scripts, compiler diagnostics, static SEO,
  accessibility baseline, package boundaries, and optional future DX tooling.

### Assets

- Standardized the project favicon source under `src/assets` and removed the
  stale duplicated root favicon files from the tracked project layout.

### Accessibility

- Added compiler-level accessibility warnings for common static template
  issues: images without alt text, form controls without accessible names,
  interactive anchors without href values, non-semantic click targets, and
  skipped heading levels.
- Kept the new accessibility baseline advisory and compile-time only so it
  improves developer feedback without increasing the VeloDom browser runtime.

### Tests

- Added focused compiler coverage for the new accessibility diagnostics,
  accessible static/bound patterns, recoverable page/component error
  boundaries with retry behavior, accessibility integration behavior, and
  router scroll/hash/focus behavior, bringing the automated suite to 106 passing
  tests.

## 2026-07-07

### Public API

- Froze the V1 candidate package boundary with tests for runtime exports,
  public type export declarations, compiler exports, Vite adapter exports,
  Vite plugin exports, and package subpaths.
- Updated README language so public names are no longer described as
  unfrozen, while package publication remains blocked by license and npm-name
  ownership decisions.

### Release

- Expanded `RELEASING.md` into a human approval checklist covering release
  scope, versioning, documentation, legal/license gates, npm package-name
  ownership, verification commands, package-boundary review, and publication
  authorization.
- Hardened `npm run pack:check` so it runs package verification explicitly and
  then inspects the dry-run tarball through an isolated-cache Node helper
  without recursively triggering `prepack`.
- Made the installed-package consumer pack step ignore inherited npm dry-run
  settings so release dry-runs still create the local tarball needed by the
  isolated consumer fixture.
- Documented current publication blockers: no selected public license, no
  `LICENSE` file, unconfirmed npm package-name ownership, and the intentional
  `private: true` package guard.

### Browser Support

- Added `BROWSERS.md` with the V1 candidate evergreen browser matrix,
  unsupported legacy browser list, planned real-browser E2E targets, and
  minimum browser coverage expected before public V1.
- Added a package `browserslist` policy matching the documented evergreen
  targets.
- Added `@playwright/test` as a development dependency and introduced
  `npm run test:browser`, a real local Chrome/Edge smoke test covering client
  routing, form/model updates, request fulfillment, and no-JavaScript static
  SEO HTML.
- Updated README and release guidance to distinguish fast `happy-dom`
  integration checks from real-browser smoke coverage and the future full
  Firefox/WebKit/mobile matrix expansion.

### Fixed

- Fixed role-only request routes so automatic auth enablement uses the
  application-configured auth runtime instead of falling back to a fresh
  default server-session runtime.

### Tests

- Added direct request-directive coverage for role authorization success and
  missing-role denial before the route handler runs.
- Full verification passes with 94 automated tests, documentation checks,
  TypeScript, ESLint, package contract checks, installed-package consumer
  validation, the production showcase build, package dry-run checks, and the
  real-browser Chrome/Edge smoke suite.

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

- Rebuilt `README.md` as a current user guide instead of a mixed historical
  handoff log, with copyable examples for pages, routing, state, every
  directive family, components, slots, refs, events, lifecycle, requests,
  middleware, auth, SEO, plugins, compiler extensions, and optional TypeScript.
- Audited documentation claims against the current public exports, adapters,
  runtime modules, tests, and package metadata.
- Removed stale bundle-size measurements and outdated documentation-file
  counts, and made the private pre-release/package limitations explicit.
- Added a truthful implemented-vs-planned limitations section so validation,
  request retry/cache, router UX, error boundaries, CLI, devtools, and
  SSR/hydration are not presented as existing features.
- Added deployment guidance for VeloDom's SPA fallback, generated static SEO
  routes, hosting rewrites, Vite base paths, cache headers, and no-JavaScript
  SEO checks.
- Added a prioritized gap map to `TODO.md`, separating V1 release blockers,
  everyday application needs, and intentionally deferred framework features.
- Added concrete roadmap work for browser E2E coverage, accessibility,
  recoverable error boundaries, router UX, test utilities, performance
  budgets, licensing, deployment guidance, and project scaffolding.
- Added a Future DX roadmap analysis covering local project intelligence,
  CLI health/inspect/graph commands, build intelligence, generated
  documentation, optional provider-based AI tooling, and migration research
  while rejecting runtime-heavy framework imitation.
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
- Added a visible completed/total progress counter to `TODO.md`.
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
