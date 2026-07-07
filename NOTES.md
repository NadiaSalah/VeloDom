# VeloDom Engineering Notes

## Architectural Decisions

- VeloDom is compiler-first, HTML-first, and folder-first.
- `src/core` is the single home for reusable framework source, including the
  compiler, shared contracts, adapters, and Vite plugin.
- `src/pages`, `src/components`, and `src/api` are application-owned.
- Build-tool discovery belongs to adapters; the runtime accepts injected
  resource maps.
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
- The public application import boundary is the `velodom` package export backed
  by `src/core/index.ts`; other core modules are internal until promoted.
- V1 candidate public names are frozen by package-boundary tests. Changes to
  runtime exports, public type declarations, compiler exports, Vite adapter
  exports, Vite plugin exports, or package subpaths require an intentional
  architecture decision and documentation update.
- Build-specific framework features use explicit subpath exports:
  `velodom/vite`, `velodom/vite-plugin`, and `velodom/compiler`.
- Package exports target generated ESM in `lib` and declarations in `types`;
  raw framework TypeScript is a development input, not a published runtime.
- The npm package uses an explicit file allowlist. Application code, tests,
  assets, and workspace configuration are never package contents.
- Release preparation is intentionally separated from publication. The
  checklist in `RELEASING.md` records gates, but only explicit human approval
  for an exact version can authorize removing `private: true` or publishing.
- `npm run pack:check` intentionally invokes package verification before an
  isolated-cache npm dry-run helper; this avoids recursive `prepack` execution
  and avoids dependence on the user's global npm cache permissions.
- Vite adapter globs are rooted at `/src` so discovery is relative to the
  consuming Vite project rather than the installed adapter file.
- The package stays private until name ownership, license, and public API names
  are explicitly confirmed. Local pack checks never authorize publication.
- Package-consumer verification must install the tarball into an isolated
  temporary project; resolving the workspace source would not validate npm
  exports or declaration paths.
- Source type contracts live in `src/core/types.ts`. Generated declarations
  stay in the ignored root `types` build-output folder, while
  `node_modules/@types` remains npm-managed dependency data.
- Generic object validation, folder-path normalization, and protected-state
  path inspection live in `src/core/shared`; runtime modules should not create
  private copies of these helpers.
- Application examples use kebab-case folders, preferred `script`/`config`
  filenames, and compiler-facing `vd-*` syntax. Legacy names and
  `data-vd-*` remain framework compatibility inputs, not preferred examples.
- Application-owned static assets live under `src/assets`. The root favicon
  duplicates are intentionally removed because `index.html` already references
  `src/assets/favicon.png`; root-level static duplicates should only return if
  a deployment target requires them.
- `VeloDom_Master_Architecture_Prompt.md` is treated as the concise guiding
  architecture brief. It should mirror current project principles, not preserve
  outdated package/folder ideas that conflict with the single `src/core`
  framework source boundary.
- Large runtime entry modules coordinate features while focused modules own
  reusable behavior: `directives/expression.ts` handles expression state
  access, and `requests/request-bindings.ts` handles request destinations and
  cross-page policy.
- Template expressions are parsed under `src/core/expression` and evaluated
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
  lives under `test-support` so Node test discovery does not count it as an
  empty test file.
- Browser support is documented as an evergreen V1 candidate policy in
  `BROWSERS.md` and mirrored by `package.json#browserslist`. The current
  Playwright smoke suite runs against local Chrome/Edge; happy-dom coverage is
  still not a substitute for the future Firefox, WebKit, and mobile WebKit
  matrix expansion.
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
  hash targets when a route contains a fragment.
- Framework-owned TypeScript files require an English module header and
  adjacent JSDoc for each exported declaration. The dependency-free
  `scripts/check-core-docs.mjs` audit is part of the normal quality gate and
  rejects adjacent duplicate JSDoc blocks.
- Documentation comments should capture ownership, invariants, or architectural
  reasons; obvious line-by-line narration is intentionally avoided.
- Directive features are lazy modules selected by compiled manifests. The
  registry caches loaded modules, while loop clones reuse the already-loaded
  feature set synchronously.
- Missing manifests intentionally select every directive feature, preserving
  compatibility for custom resource adapters and direct runtime usage.
- Page SEO is application-owned and declared in each page's existing
  `config.js`; validation, runtime head synchronization, and static rendering
  are generic framework responsibilities under `src/core`.
- Static SEO output is generated after Vite emits the client shell. Each
  concrete route receives metadata plus a concise visible fallback in `#app`,
  which the normal page router replaces at mount.
- Dynamic route content is never fabricated. `seo.entries` provides explicit
  build-time paths and metadata; a future application-defined data hook may
  populate those entries from an API or CMS.
- Sitemap and robots output require an explicit `siteUrl`. Routes marked
  `noindex` remain buildable for direct navigation but are excluded from the
  sitemap.
- Meta keywords remain accepted as supplemental metadata, but they must not be
  treated as a search-ranking strategy.
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
  be checked cheaply; navigation focus and recovery behavior remain runtime
  responsibilities.
- The first accessibility baseline is intentionally advisory compiler output:
  warnings cover missing image alt text, unnamed controls, href-less
  interactive anchors, non-semantic click targets, and skipped heading levels.
  These checks should stay static and cheap unless a future task explicitly
  adds runtime keyboard/focus behavior.
- Accessibility integration coverage currently verifies keyboard event
  modifiers, focusable element order after component mounting, and semantic
  static SEO fallback output. Router-managed focus movement remains a separate
  runtime UX milestone.
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
- Future DX tooling should default to static analysis, compiler manifests,
  Vite/build metadata, and local CLI output. It should improve developer
  confidence without adding mandatory browser runtime features.
- AI support, if ever explored, must be optional and provider-based like auth.
  VeloDom must remain fully usable without AI providers, network access, API
  keys, telemetry, or hosted services.
- Migration tools may generate reviewable VeloDom folders from HTML or simple
  framework examples, but VeloDom Core must not add React/Vue/Angular runtime
  compatibility layers.

## Known Constraints

- Assignments, declarations, arrow functions, nested template literals, and
  `new` are intentionally unsupported inside templates.
- TypeScript `noImplicitAny` is not yet enabled globally; older internal helper
  parameters should be tightened incrementally without changing the JavaScript
  API.
- Adapter/user-file source maps still need broader build-tool integration
  coverage beyond runtime stack-location parsing.
- The showcase still needs reusable form and error-display components before
  every Phase H item can be marked complete.
- Static SEO currently provides metadata and concise fallback content rather
  than full page rendering or hydration. Dynamic API/CMS fetching and
  full-content pre-rendering remain separate future milestones.

## Handoff Guidance

1. Read `README.md`, then `todo.md`, before changing framework APIs.
2. Add framework behavior to `src/core` only when it is generic across sites.
3. Keep domain-specific examples in the blog application folders.
4. Add a regression test for every core bug.
5. Run `npm test` and `npm run build` before committing.
6. Update README, TODO, this file, and CHANGELOG when decisions or milestones
   change.
