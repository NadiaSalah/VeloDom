# VeloDom Engineering Notes

## Architectural Decisions

- VeloDom is compiler-first, HTML-first, and folder-first.
- `packages/velodom/src` is the single home for reusable framework source,
  including the compiler, shared contracts, adapters, and Vite plugin.
- `examples/blog/src` is the repository's application-owned showcase. External
  applications own their own `src/pages`, `src/components`, and `src/api`.
- Build-tool discovery belongs to adapters; the runtime accepts injected
  resource maps.
- Static SEO generation runs after Vite writes the bundle rather than at its
  close hook. The renderer needs the emitted `index.html` shell, and this keeps
  the behavior stable across Vite/Rolldown lifecycle ordering.
- Vite applications should normally start with `mountVeloDom()`. It supplies
  the adapter and discovers optional root request/middleware registries by
  convention; `createViteApp()` and generic `createApp()` remain explicit
  escape hatches rather than parallel framework models.
- Vite convention registries use a single default-exported object. Keeping
  both JavaScript and TypeScript variants is rejected because silent filename
  precedence would make beginner behavior hard to explain.
- Nested API handler files are an optional shortcut: a default export in
  `src/api/posts/get.js` becomes `posts.get`. Root `src/api/*.js` files stay
  importable helpers, and an explicit `routes.js|ts` registry wins whenever an
  application needs middleware, auth, roles, or a custom route shape.
- Named middleware files mirror the API shortcut: a default export in
  `src/api/middleware/auth.js` registers `auth`, including nested dot names.
  The root `middleware.js|ts` registry remains the explicit higher-priority
  form, so it is a clean escape hatch rather than an extra merging rule.
- Common users should configure requests declaratively. Custom middleware and
  explicit `next()` pipelines remain an advanced option.
- Authentication is provider-based. Frontend auth and role checks improve UX
  but never replace backend authorization.
- Request routes with `roles` and no explicit `auth` declaration must enable
  authentication through the current application auth runtime, not a freshly
  created default runtime. Otherwise custom default providers are bypassed.
- Framework source is TypeScript and passes TypeScript plus ESLint before
  production builds.
- Application source may use `script.js` or `script.ts` per folder with no API
  differences and no JSX/TSX.
- Page policy/SEO may use `config.js` or self-contained `config.ts`. Typed
  config is transpiled only during Vite build tooling, accepts type-only
  imports, and requires TypeScript only as an optional application development
  dependency; Vanilla projects keep no TypeScript requirement.
- The public application import boundary is the `velodom` workspace package
  backed by `packages/velodom/src/index.ts`; other modules are internal until
  promoted through an explicit package subpath.
- V1 public names are frozen by package-boundary tests. Changes to
  runtime exports, public type declarations, compiler exports, Vite adapter
  exports, Vite plugin exports, or package subpaths require an intentional
  architecture decision and documentation update.
- `packages/velodom/package.json` uses local version `1.0.0` to match the first
  VeloDom release-candidate identity. `private: true` remains the publication
  guard; the root package is a private development workspace.
- Build-specific framework features use explicit subpath exports:
  `velodom/vite`, `velodom/vite-plugin`, and `velodom/compiler`.
- Package exports target generated ESM in `packages/velodom/lib` and
  declarations in `packages/velodom/types`; raw framework TypeScript is a
  development input, not a published runtime.
- Vite is an optional peer because only the `velodom/vite` and
  `velodom/vite-plugin` integrations require it. TypeScript remains an optional
  peer for typed config; the base runtime stays adapter- and language-neutral.
- Client imports use public `velodom` subpaths. The optional `@` alias and
  standard `#app/*` import map resolve application files only and must never
  expose framework internals.
- The npm package uses an explicit file allowlist. Application code, tests,
  assets, and workspace configuration are never package contents.
- The package manifest records the monorepo directory, author, discovery
  keywords, and intended public access. `publishConfig.access` documents the
  eventual release target but does not override the `private: true` safety
  guard or authorize publication.
- `packages/velodom-vscode` is a private workspace consumer of the public
  `velodom/compiler` contract. It is not part of the framework tarball and
  never becomes a browser runtime dependency.
- Generated `packages/velodom/lib` and `packages/velodom/types` outputs remain
  on disk when useful for local verification but stay ignored by Git. Their
  presence is not repository clutter and their deletion is not required for a
  clean package release.
- Repository-level documentation lives under `docs/`. The root README is a
  stable short link to `docs/README.md`; `packages/velodom/README.md` remains
  adjacent to the package manifest because npm uses it as the package page.
- Release preparation is intentionally separated from publication. The
  checklist in `RELEASING.md` records gates, but only explicit human approval
  for an exact version can authorize removing `private: true` or publishing.
- `npm run pack:check` is a workspace verification command that runs package
  checks before an isolated-cache npm dry-run helper. The package's `prepack`
  hook only builds its own artifacts, avoiding recursive checks and dependence
  on workspace-only tooling.
- Vite adapter globs are rooted at `/src` so discovery is relative to the
  consuming Vite project rather than the installed adapter file.
- The package uses the MIT License, but stays private until npm name ownership,
  account access, and publication approval are explicitly confirmed. Local pack
  checks never authorize publication.
- npm registry returned 404 for `velodom` on 2026-07-09. Treat that as a
  current availability signal, not ownership; the name is only secured after an
  approved npm account reserves or publishes it.
- Package-consumer verification must install the tarball into an isolated
  temporary project; resolving the workspace source would not validate npm
  exports or declaration paths.
- Source type contracts live in `packages/velodom/src/types.ts`. Generated
  declarations stay in the ignored `packages/velodom/types` output folder, while
  `node_modules/@types` remains npm-managed dependency data.
- Generic object validation, folder-path normalization, and protected-state
  path inspection live in `packages/velodom/src/shared`; runtime modules should not create
  private copies of these helpers.
- Application examples use kebab-case folders, preferred `script`/`config`
  filenames, and compiler-facing `vd-*` syntax. Legacy names and
  `data-vd-*` remain framework compatibility inputs, not preferred examples.
- The showcase application is now the first VeloDom framework site: a local
  documentation blog that explains V1 capabilities while using VeloDom pages,
  components, dynamic routes, local request routes, layouts, and SEO config.
  It stays application-owned under `examples/blog/src`; framework-neutral
  behavior must stay in `packages/velodom/src`.
- Showcase `examples/blog/src/api/routes.js` is the declarative request
  registry for `vd-request`, not a list of every exported API helper. Page scripts
  may still import API helpers directly when imperative loading is clearer.
- The V1 site intentionally does not ship application middleware, auth, or CRUD
  example pages. Those framework features remain documented and tested in Core,
  while the public site stays focused on launch messaging and learning paths.
- The showcase uses the daisyUI Tailwind plugin with only light/dark themes;
  importing the complete prebuilt daisyUI stylesheet produced roughly 1.16 MB
  of CSS and was replaced by a generated 70 KB application stylesheet.
- Browser E2E now follows the V1 documentation site, not the removed CRUD
  showcase. It verifies the landing page, features page, one-file page,
  dynamic article route, local `vd-request` example, and no-JavaScript SEO.
- Components inside `vd-for` should be used carefully until component props
  can receive loop scope values reliably. The showcase uses direct HTML cards
  for repeated posts and keeps the reusable post-card component outside loops.
- Application-owned static assets live under `src/assets`. The root favicon
  duplicates are intentionally removed because `index.html` already references
  `src/assets/favicon.png`; root-level static duplicates should only return if
  a deployment target requires them.
- `ARCHITECTURE.md` is treated as the concise guiding
  architecture brief. It mirrors the npm package boundary at
  `packages/velodom/src` and keeps application folders outside Core.
- Large runtime entry modules coordinate features while focused modules own
  reusable behavior: `directives/expression.ts` handles expression state
  access, and `requests/request-bindings.ts` handles request destinations and
  cross-page policy.
- Template expressions are parsed under `packages/velodom/src/expression` and evaluated
  from an AST. The grammar is intentionally expression-only; complex logic
  belongs in page/component scripts, not templates.
- The expression security model blocks host-global identifiers, prototype
  traversal, function constructors, timers, and `call`/`apply`/`bind`; computed
  member names are revalidated at runtime.
- Backward compatibility is preserved while the preferred `vd-*` compiler
  syntax and folder conventions mature.
- Inactive conditional branches suspend dependent directive evaluation.
  Subscriptions remain registered so bindings evaluate when the branch becomes
  active; this prevents false-branch null access without losing reactivity.
- Component `expose` is one explicit contract for both local template methods
  and parent ref APIs. Exposed members are merged into component state before
  directives mount, while protected framework state names are rejected.
- Browser-like runtime integration uses happy-dom only in tests. The helper
  lives under `tools/test-support` so Node test discovery does not count it as an
  empty test file.
- Browser support is documented as an evergreen V1 policy in
  `BROWSERS.md` and mirrored by `package.json#browserslist`. The Playwright
  smoke suite now attempts Chromium/Chrome/Edge, Firefox, WebKit, and a mobile
  WebKit viewport profile. Chromium remains required locally; optional targets
  are skipped when their binaries are unavailable unless
  `VELODOM_BROWSER_STRICT=1` is set.
- Local npm recovery-code exports are ignored through `.gitignore`. They should
  remain outside version control and should not be read during routine
  framework work.
- `node_modules`, package `lib`/`types`, and application `dist` folders are
  reproducible local output. They remain ignored and need not be included in a
  clean source checkout.
- Loop blocks own the cleanups created for each rendered clone and release them
  both before rerender and during parent teardown.
- Explicit request loading/error paths inherit the destination of the resolved
  result binding. A local result name must never be reinterpreted as a page.
- Compiler optimizers are synchronous and run after parse/validation. They may
  return only HTML, AST, metadata, or diagnostic patches; the compiler
  validates each result before the next optimizer runs.
- Every template compile result includes a conservative runtime feature
  manifest. Optimizers can add custom features, while changes to directive
  metadata automatically rebuild the built-in feature list.
- Production template modules omit development metadata unless explicitly
  requested. The Vite adapter consumes the named manifest export for
  page/component feature selection.
- Public extensible records use `unknown`, requiring TypeScript consumers to
  narrow unmodelled values instead of receiving unsafe implicit `any`.
- Every Core TypeScript file is protected by
  `@typescript-eslint/no-explicit-any`. Dynamic mount, directive, page, and
  request boundaries use focused context interfaces or `unknown` followed by
  runtime validation.
- Public package declarations and migrated orchestrator declarations must not
  expose inferred `any`; unvalidated JSON payloads intentionally return
  `unknown`.
- The public navigation signature is `navigate(path, pagePath?)`, matching the
  folder-routing compatibility argument already implemented by the runtime.
- The router owns manual scroll restoration. It saves scroll positions by full
  path including query and hash, restores them on popstate, and prioritizes
  hash targets when a route contains a fragment. Same-page hash-only
  navigation updates history and scrolls without remounting the page.
- The router also owns predictable post-navigation focus because it depends on
  the rendered DOM, not the compiler. Fragment routes focus their hash target;
  normal route changes prefer `data-vd-focus`, then headings, landmarks, and
  finally `#app`, using programmatic `tabindex="-1"` only when needed.
- Route prefetch stays opt-in and link-local through `data-vd-prefetch`. The
  router only warms matched page resources after user intent events and never
  mounts the page, runs lifecycle hooks, or mutates page state during prefetch.
- Validation remains optional through `createValidationPlugin()`. The core
  compiler only normalizes `vd-validate`; the plugin uses native browser
  validity checks and blocks invalid form submits before request handlers run.
- Shared state remains optional through `createSharedState()`. Creating a
  handle does not mutate the app; explicit plugin registration exposes the
  named state under `app.shared` and cleanup removes it again.
- Cache, retry, and devtools behavior remain optional helpers. The core request
  runtime does not retry or cache by default; `createRequestCache()` and
  `withRequestRetry()` must be used by application API code, and
  `createDevtoolsPlugin()` is the only helper that installs a browser global.
- Full page SSR remains deferred. V1 supports static SEO fallback HTML and an
  optional build-time `seo.renderPage` hook for route-specific static content
  with client takeover. Package-boundary tests should still reject
  `renderToString`-style public SSR names until a true hydration design is
  stable enough to avoid changing the HTML-first authoring model.
- Framework-owned TypeScript files require an English module header and
  adjacent JSDoc for each exported declaration. The dependency-free
  `tools/scripts/check-core-docs.mjs` audit is part of the normal quality gate and
  rejects adjacent duplicate JSDoc blocks.
- Documentation comments should capture ownership, invariants, or architectural
  reasons; obvious line-by-line narration is intentionally avoided.
- Directive features are lazy modules selected by compiled manifests. The
  registry caches loaded modules, while loop clones reuse the already-loaded
  feature set synchronously.
- Missing manifests intentionally select every directive feature, preserving
  compatibility for custom resource adapters and direct runtime usage.
- Project intelligence belongs to the Node CLI, not the browser runtime.
  `vd inspect`, `vd doctor`, `vd graph`, `vd health`, `vd build-report`, and
  `vd docs` reuse folder conventions, template source, compiler manifests, and
  generated assets so diagnostics improve developer experience without adding
  mandatory runtime code.
- Static analyzer warnings must stay conservative and non-destructive. Unused
  components, request routes, middleware, circular dependencies, large
  templates, and unreachable showcase files are reported for humans to review;
  the framework never deletes application files automatically.
- Build intelligence suggests route prefetch, component splitting, template
  simplification, and dependency review only as advice. VeloDom should not
  silently enable optimizations that change application behavior or routing
  semantics.
- Text interpolation is a compiler feature, not a browser runtime parser.
  `{{ expression }}` is lowered to `data-vd-text` spans and uses the existing
  safe expression engine and text directive.
- Literal interpolation examples should use `\{{ expression }}` for one inline
  occurrence or `vd-pre` / `data-vd-pre` for a whole raw element body. This
  keeps documentation authoring ergonomic without adding a runtime parser.
- Layouts are application-owned shells under `src/layouts`. The adapter
  discovers them, while the router only composes validated resource maps.
  `<vd-page></vd-page>` is intentionally a single required placeholder so
  layout composition remains static and compiler-friendly.
- Recipes should document framework patterns using the showcase app as the
  proof source. Prefer documenting existing working conventions before adding
  new runtime behavior.
- Error recipes should teach developers to fix page/template/config mistakes
  from source-aware hints instead of treating Core as the first debugging
  target.
- Request debounce is intentionally request-local. It cancels pending timers
  per element and delays loading state until the latest request actually
  starts, preserving the existing cancellation semantics for active requests.
- Request throttle is also request-local and intentionally leading-only. It
  prevents repeated user triggers inside the configured window without queuing
  hidden trailing requests that might surprise application code.
- Declarative request retry is opt-in per request config. It runs only after
  config and auth pass, so permanent configuration/auth errors are not retried.
- Auth-failure redirects are opt-in and limited to application paths beginning
  with `/`; external and protocol-relative URLs are rejected to avoid open
  redirect footguns.
- Request hooks are configured once through `createApp({ requestHooks })`.
  They stay outside templates unless a specific request opts into an
  `onSuccess` callback through `vd-request-config`.
- Validation remains deliberately native and optional. The V1 API is
  `createValidationPlugin()` plus `vd-validate`, with invalid state expressed
  through `data-vd-invalid` and `data-vd-field-invalid`.
- RTL CSS diagnostics are advisory build-time warnings only. They suggest
  logical properties but never rewrite application CSS or add browser runtime.
- Scoped CSS `:global(...)` is intended for document-level selectors such as
  `html[dir="rtl"]`; it should not become a broad CSS preprocessor feature.
- I18n translation remains separate from direction. A future plugin may own
  dictionaries, pluralization, message formatting, and locale routing without
  changing the lightweight direction plugin.
- Direction management is optional and plugin-owned. RTL presentation support
  currently covers document `lang`/`dir`, reactive `$direction` reads, and
  explicit `vd-rtl-flip` markers; logical CSS diagnostics and translation
  systems remain separate roadmap work.
- Page SEO is application-owned and declared in each page's existing
  `config.js`; validation, runtime head synchronization, and static rendering
  are generic framework responsibilities under `packages/velodom/src`.
- Static SEO output is generated after Vite emits the client shell. Each
  concrete route receives metadata plus either a concise visible fallback in
  `#app` or optional application-rendered static content from `seo.renderPage`.
  The normal page router still replaces this server-delivered content at
  mount; this is client takeover, not SSR reconciliation.
- Dynamic route content is never fabricated. `seo.entries` provides explicit
  build-time paths and metadata; a future application-defined data hook may
  populate those entries from an API or CMS.
- Sitemap and robots output require an explicit `siteUrl`. Routes marked
  `noindex` remain buildable for direct navigation but are excluded from the
  sitemap.
- Meta keywords remain accepted as supplemental metadata, but they must not be
  treated as a search-ranking strategy.
- Structured-data fixtures live in tests and cover common JSON-LD content
  types without turning VeloDom Core into a full schema.org validator. Core
  validation still guarantees safe top-level JSON-LD object/array shapes.
- Static hosting must serve existing generated route files before applying the
  SPA fallback to `/index.html`; otherwise direct SEO routes lose their
  server-delivered metadata. Hosts without rewrites, such as GitHub Pages,
  need a `404.html` fallback copy and still only expose generated metadata for
  exact static route folders.
- Feature comparison must not turn VeloDom into a React-like runtime. The
  priority order is API stability, documentation, browser verification,
  accessibility, and recovery before optional state, devtools, SSR, or
  hydration.
- Accessibility diagnostics should begin at compile time where normal HTML can
  be checked cheaply; navigation focus and recovery behavior remain narrow
  runtime responsibilities.
- The first accessibility baseline is intentionally advisory compiler output:
  warnings cover missing image alt text, unnamed controls, href-less
  interactive anchors, non-semantic click targets, and skipped heading levels.
  These checks should stay static and cheap unless a future task explicitly
  adds runtime keyboard/focus behavior.
- Accessibility integration coverage currently verifies keyboard event
  modifiers, focusable element order after component mounting, router-managed
  navigation focus movement, and semantic static SEO fallback output.
- Error boundaries should isolate user-code failures and offer recovery while
  preserving the existing fatal screen for unrecoverable application startup
  failures.
- Recoverable boundaries are application-level hooks configured through
  `createApp({ errorBoundary })`. The same hook handles page navigation
  crashes and component crashes, renders safe string fallbacks or
  application-owned DOM nodes at the failed owner, and provides `retry()` plus
  `navigate(path)` recovery helpers.
- README is the current user-facing framework guide, not a milestone archive.
  Historical implementation detail belongs in CHANGELOG, while deferred
  architecture decisions belong in NOTES or TODO.
- Documentation must distinguish supported preferred syntax from compatibility
  aliases and must label the package as private until publication is actually
  authorized.
- Performance numbers should not be kept in README unless they are generated
  by a repeatable current benchmark; one-off bundle comparisons become stale
  as framework features change.
- `npm run benchmark:rendering` is a local diagnostic baseline for common page
  bindings and loop updates. It intentionally uses happy-dom for repeatability
  and must not be treated as a browser-matrix performance budget.
- Loop rendering now distinguishes structural changes from ordinary reactive
  updates. When the evaluated item identity sequence is unchanged, VeloDom
  keeps existing DOM nodes and lets nested directive subscriptions update
  their own text, class, style, and event-bound state.
- Binding directives avoid DOM writes when evaluated values are unchanged.
  This keeps large pages quieter without adding dependency tracking,
  virtual-DOM reconciliation, or a more complex state model.
- `npm run performance:check` enforces conservative JavaScript size budgets for
  generated route chunks and package runtime modules after build artifacts
  exist. CSS is intentionally not budgeted yet because the showcase's
  Tailwind/daisyUI output is application-owned and needs a separate design
  decision before strict limits are useful.
- The first VeloDom CLI is static/offline developer tooling. `vd inspect`,
  `vd stats`, and `vd routes` read folders, `.vd` templates, API route
  registrations, compiler manifests, SEO config presence, and test-file
  signals without adding browser runtime weight.
- `vd doctor` is intentionally advisory/static. It reuses compiler diagnostics
  and simple project references first; deeper semantic checks such as full
  state/control-flow analysis should remain future DX work until they can stay
  deterministic and lightweight.
- `vd build-report` is the first machine-readable build intelligence surface.
  It intentionally reports what can be proven from folders, compiler manifests,
  SEO config presence, and generated assets; dependency-level bundle attribution
  should wait for a more precise Vite/Rollup metadata design.
- `vd graph` exports relationships that can be proven statically today:
  pages-to-routes, templates-to-components, templates-to-requests, and
  request-to-middleware registrations. Event/ref/state graphs remain separate
  research until inference is reliable.
- `vd health` is advisory by default. It only fails when a project sets
  `--min-score` or `.velodom-health.json`, keeping quality thresholds
  project-owned rather than framework-imposed.
- `vd docs` is generated documentation, not a replacement for human tutorials.
  It only documents relationships visible in folders, templates, route
  registrations, and config text.
- Performance budgets intentionally measure browser runtime package modules,
  excluding Node-only CLI and public testing utilities from the largest-runtime
  module threshold.
- Package CLI wrappers live in `packages/velodom/bin` and call generated
  `packages/velodom/lib/cli.js`; the
  implementation remains TypeScript under `packages/velodom/src` so it shares framework
  quality gates while staying outside the application folders.
- CLI filesystem conventions, human-readable reporters, generated templates,
  and shared contracts now live under `packages/velodom/src/cli/`. The public `cli.ts`
  entry remains the command orchestrator so package binaries and command
  output contracts do not change during internal maintenance.
- CLI scaffolding creates normal VeloDom folders or optional `.vd` files. It
  must continue producing HTML-first files rather than introducing JSX,
  component render functions, or configuration-heavy templates.
- Public testing helpers live under `velodom/testing`, not the root runtime
  export. They compile preferred `vd-*` syntax for tests and mount in-memory
  pages/components against an already-installed DOM environment such as
  happy-dom, jsdom, or a real browser.
- DX, AI, migration, and identity research is documented under `docs/` so the
  roadmap can distinguish accepted tooling direction from features that should
  not be implemented yet.
- Future DX tooling should default to static analysis, compiler manifests,
  Vite/build metadata, and local CLI output. It should improve developer
  confidence without adding mandatory browser runtime features.
- AI support, if ever explored, must be optional and provider-based like auth.
  VeloDom must remain fully usable without AI providers, network access, API
  keys, telemetry, or hosted services.
- Migration tools may generate reviewable VeloDom folders from HTML or simple
  framework examples, but VeloDom Core must not add React/Vue/Angular runtime
  compatibility layers.
- Resource adapters now annotate user-file loader and page-config failures with
  source metadata before the router or error boundary reports them. This keeps
  diagnostics generic in core while pointing developers at application-owned
  files such as `src/pages/*/index.html`, `script.js`, `style.css`, and
  `config.js`.
- Optional `.vd` files are an adapter/compiler convenience, not a replacement
  for folder mode. The Vite plugin compiles `.vd` blocks into the same resource
  contract used by folders, and folder resources keep priority when both forms
  declare the same logical page or component name.
- `packages/velodom/src/page-router.ts` and `packages/velodom/src/requests/request-router.ts` are
  frozen internal filenames. They remain private implementation modules, but
  keeping the names stable protects diagnostics, runtime wiring, and
  integration tests from accidental churn.
- `vd-auto-state` is the preferred authoring alias for automatic request
  loading/error/result state. The compiler normalizes it to the stable
  `data-vd-request-state` runtime attribute, while direct
  `data-vd-auto-state` remains accepted for uncompiled HTML compatibility.
- Automatic request status naming is frozen around the suffixes `Result`,
  `Loading`, and `Error`. A target ending in `Result` replaces only that
  suffix; other targets append status suffixes, and nested paths keep their
  parent segments.
- Component public APIs are frozen around `return { state, expose }`.
  `expose` must stay a plain object and is the only documented pattern for
  parent ref commands; protected framework state keys remain blocked.

## Known Constraints

- Assignments, declarations, arrow functions, nested template literals, and
  `new` are intentionally unsupported inside templates.
- TypeScript `noImplicitAny` is not yet enabled globally; older internal helper
  parameters should be tightened incrementally without changing the JavaScript
  API.
- Adapter/user-file source diagnostics are now available for validated lazy
  resources, but full source-map integration across every build tool remains a
  future hardening task.
- Phase H is complete for the V1 framework-site showcase. Future application
  examples may still add more reusable form or error-display components, but
  they are no longer a blocker for the completed V1 showcase milestone.
- Static SEO provides metadata, concise fallback content, and optional
  build-only `seo.renderPage` and page-owned `config.prerender` hooks. Their
  application-owned entries and data may fetch API/CMS content at build time,
  but are never bundled into the browser runtime. `config.prerender` emits
  complete concrete route documents and still uses client takeover rather than
  true SSR hydration, which remains a separate future milestone.
- Page `.vd` files are currently imported eagerly by the Vite adapter so their
  `<config>` blocks remain synchronously available to the router. Folder pages
  keep lazy chunk behavior; future build work can revisit query-based config
  extraction if Vite/Rolldown supports it without duplicate import warnings.
- V1 release polish is documentation and verification work, not a new feature
  phase. Local code readiness, public API freeze, and package checks can be
  complete while npm publication remains blocked by `private: true` until the
  owner confirms package ownership, account, access, 2FA, final notes, and tag
  decisions.
- The post-V1 competitive roadmap is intentionally bounded: adapter contracts,
  authoring types, asset tooling, editor intelligence, static rendering,
  progressive forms, localization, and dev inspection may be researched or
  implemented only as optional compiler/build or development capabilities.
  VeloDom must not add a mandatory virtual DOM, JSX, CMS, global store, or
  universal SSR runtime merely to match another framework's feature list.
- Resource adapters now have an optional versioned capability declaration and
  public conformance assertion. This documents adapter responsibilities without
  leaking build-tool discovery into the router; legacy adapters remain valid
  when they omit the new metadata.
- The `velodom/assets` subpath inspects application-owned image files and
  builds standards-based responsive-image attributes from explicit variants.
  It intentionally does not select a CDN or transform files: image generation
  remains an application/deployment decision and adds no VeloDom runtime code.
- Editor intelligence begins with a compiler-backed, dependency-free language
  service instead of an editor-specific runtime. It maps `.vd` template
  diagnostics back to original file locations and leaves editor UI, project
  navigation, and code actions as optional integration work.
- Static prerendering is now a bounded V1.1 build capability: output is
  build-only and not SSR; forms enhance native submission through adapters;
  translations remain optional build tooling; and inspection stays opt-in with
  a read-only bridge. Hybrid rendering and partial hydration remain V2 work.
- Conventional page data is a separate, optional concern: a nearby `data.js|ts`
  loader receives the same route-shaped contract for client, build, and future
  server modes. A matching prerender entry may transfer only safely
  serializable public data. A page may additionally opt into a router-local,
  in-memory freshness/stale-while-revalidate cache; credentials, headers,
  secrets, and user-specific state stay outside that policy and must remain
  application-owned.
- Localization is a build-time subpath, not a template directive or a global
  browser store. Its default dictionary defines the required key set, while
  Vite surfaces missing translations before a build and the helper expands
  route/SEO records. Message formatting, negotiation, and client-side language
  switching remain integration concerns instead of hidden runtime behavior.
- External content loaders are typed adapters into the same normalized Markdown
  source contract as local collections. VeloDom intentionally owns only the
  generated route/slug/tag indexes and never supplies a CMS client, credential
  store, or browser data transport.
- The `velodom/node` subpath only maps Node HTTP to Fetch request/response
  primitives. Dynamic HTML, authentication, cookies, and safe failure output
  remain application-owned; automatic template rendering, hydration, and
  streaming are intentionally deferred.
- AI providers, migration assistants, and CMS/deployment support are now
  documented research boundaries, not shipped framework features. Any future
  implementation must remain separately installed, reviewable, and free of
  hidden browser-runtime dependencies or credentials.
- Future authoring ergonomics favor discoverable files and optional plain
  JavaScript exports over shorthand syntax. VeloDom should retain explicit
  `vd-*` attributes and `init()` as the advanced lifecycle escape hatch instead
  of copying Vue-style template aliases or composition APIs.
- Feature scaffolding deliberately composes existing page/component/API/test
  conventions instead of inventing a new feature runtime or editing central
  registries. The minimal template creates only a page; `--blog` is an explicit
  request for the larger vertical slice.
- CSS budgets remain build-only and opt-in. VeloDom reports generated CSS for
  every project but does not ship a default threshold because framework-owned
  limits would make a visual design-system choice look like a runtime defect.
- Progressive forms are an opt-in plugin rather than a default directive
  runtime. `vd-form` preserves standard GET/POST HTML when the plugin is
  absent; the browser plugin only adds status/error behavior around an
  application-owned server contract and never creates an action protocol.
- Application declarations are generated by the static CLI into the consuming
  project, not into `velodom` itself. The output captures only facts that can
  be proven from folder conventions and template attributes; values remain
  `unknown` instead of inventing a second schema language.
- Plugin conformance is intentionally a shape check only. It establishes the
  public setup/cleanup boundary without invoking third-party code during
  validation; lifecycle behavior remains verified in the integration's tests.
- Compiler security diagnostics are deliberately narrow and source-provable.
  They flag browser-executable URLs, credential URL exposure, opener risks,
  and secret-like Vite variable names, while server authorization, CSRF, and
  actual secret classification remain application/deployment responsibilities.
- Vite owns hot-module replacement. VeloDom supplies original file/offset
  diagnostics to Vite's standard development overlay instead of introducing a
  second HMR error UI or runtime protocol.
- Derived-state helpers intentionally subscribe to the supplied shallow state
  as a whole. This is predictable and easy to clean up, while fine-grained
  dependency tracking remains outside VeloDom's lightweight runtime goal.
- The VS Code language-tools package remains outside the framework tarball and
  consumes the public compiler language-service API. Its navigation and
  completion intentionally follow only conventional folders and `.vd` names;
  route-config overrides need a future editor-project index rather than router
  imports. Marketplace publication additionally needs a verified publisher and
  is not implied by workspace stability.
- The standalone `velodom/devtools` inspector is an explicit subpath. It
  requires an existing bridge and is not part of createApp or production builds
  unless an application imports it.

## Handoff Guidance

1. Read `README.md`, then `TODO.md`, before changing framework APIs.
2. Add framework behavior to `packages/velodom/src` only when it is generic across sites.
3. Keep domain-specific examples in the blog application folders.
4. Add a regression test for every core bug.
5. Run `npm test` and `npm run build` before committing.
6. Update README, TODO, this file, and CHANGELOG when decisions or milestones
   change.
