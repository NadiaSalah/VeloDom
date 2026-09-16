# VeloDom Engineering Notes

## Architectural Decisions

- VeloDom is compiler-first, HTML-first, and folder-first.
- Consumer and AI documentation ships from `packages/velodom`: the syntax
  reference and feature inventory are authoritative package-local contracts,
  `AI_CONTEXT.md` summarizes them, and `AI_GUIDE.md` explains agent workflow.
  Root `docs` retains the detailed repository handbook, roadmap, decisions,
  history, and release policy; it does not carry a second AI context copy.
- Project creation is feature-composed rather than template-matrix based.
  `packages/velodom/templates/default` contains only shared safe files;
  `templates/starters/{minimal,blog,empty}` contains starter-specific app code;
  `packages/velodom/src/scaffolder` applies language/tooling features.
- `packages/create-velodom` exists only to satisfy npm's `npm create velodom`
  naming contract. It delegates to `velodom/cli`; `vd create`, `vd init`, the
  framework-package binaries, and npm-create never duplicate generator logic.
- The scaffolder is a Node-only public subpath. Prompting, filesystem access,
  package-manager detection, child processes, and templates cannot be imported
  from the browser-facing `velodom` entry or increase its client bundle.
- On Windows, npm is launched through `process.execPath` and npm's own CLI
  module. Directly spawning `npm.cmd` with `shell: false` produced `EINVAL` on
  the supported host. Other package-manager names remain a validated enum and
  use constant arguments through `ComSpec`; user input is never interpolated
  into a shell command.
- A generated project that enables Prettier must pass `format:check`
  immediately. Template sources and generator strings therefore own formatted
  output; the scaffolder does not depend on Prettier or mutate output after an
  optional dependency installation.
- `examples/velodom-blog` remains the complete teaching/showcase consumer.
  The Blog starter is deliberately smaller and production-editable; smoke
  tests, not a large synchronization generator, guard their shared conventions.
- `packages/velodom/src` is the single home for reusable framework source,
  including the compiler, shared contracts, adapters, and Vite plugin.
- Core documentation is enforced structurally: every TypeScript module has a
  responsibility header, every exported declaration has public JSDoc, and
  every real named function declaration has adjacent JSDoc. Anonymous
  callbacks remain uncluttered. Build output uses `removeComments` so repository
  maintainability does not become browser-runtime weight; declarations retain
  public API documentation.
- The documentation blog is checked against package source rather than trusted
  as a second contract. Its package map, public/directive/CLI totals, and known
  signature-sensitive examples fail `npm run docs:check` when they drift.
- `examples/velodom-blog/src` is the repository's application-owned showcase. External
  applications own their own `src/pages`, `src/components`, and `src/api`.
- Build-tool discovery belongs to adapters; the runtime accepts injected
  resource maps.
- Static project tooling now builds one Node-only Project Index in
  `src/cli/project-index.ts`. The index owns discovery plus cached raw/template,
  script, config, and compiler results; policy checks consume that snapshot.
  Source bodies and AST data stay non-enumerable in `vd inspect` output, so the
  internal optimization does not expand the public CLI report or browser bundle.
  CLI impact is `NONE`: no new flags, templates, dependencies, or generated
  application files are required.
- Project diagnostics have stable machine-readable IDs and one of ten bounded
  categories. Compiler IDs remain their source of truth; CLI relationship
  findings use the `VD_PROJECT_*` namespace. Suggestions use a conservative
  edit-distance threshold and never rewrite source. CLI impact is
  `DEFAULT_INCLUDED`: existing `doctor` output gains structured fields and
  `vd explain` accepts IDs, with no generated-project or template changes.
- `vd check` is a thin orchestration command, not a second analyzer. It reuses
  the Project Index, doctor diagnostics, in-memory declaration generation, and
  explicit package/Vite sanity checks. It never writes declarations, starts a
  build, or reports browser success; the browser step is always `not-run` with
  the real follow-up named. CLI impact is `DEFAULT_INCLUDED`; starters and
  runtime exports do not change.
- `vd test` is a process dispatcher, not a framework-owned test runner. It
  resolves one application package script and delegates to the project's
  package manager; absent focused scripts are errors, so filters can never
  produce placeholder success. CLI impact is `DEFAULT_INCLUDED`; projects
  without tests gain no files, while scaffolds that select tests already emit
  compatible `test`, `test:unit`, and `test:e2e` scripts.
- Test fixtures belong to the explicit `velodom/testing` subpath. Compiler,
  route, request-double, interaction, and accessibility helpers reuse public
  production semantics but remain test-only imports, preserving browser-runtime
  size and Vanilla/TypeScript authoring parity.
- Optional-feature removal follows installation order in reverse because
  first-party features may successively modify `package.json`. Each new
  controlled mutation records before/after hashes and source; removal restores
  it only when the live after-hash is exact. Older entries without reversible
  source stay readable but non-removable. CLI impact is `DEFAULT_INCLUDED`;
  presets are data-only allowlists and never install dependencies or execute
  third-party code.
- Localization pluralization is an explicit dictionary leaf, not a template
  language or full ICU parser. Native `Intl.PluralRules` chooses a category and
  named primitive interpolation returns text. Static CLI analysis evaluates
  only a balanced literal options object through VeloDom's safe expression
  evaluator; dynamic configs are reported as unprovable rather than imported.
  CLI impact is `DEFAULT_INCLUDED`; the optional i18n starter demonstrates the
  API, and applications without localization add nothing.
- CSS and asset intelligence is a focused `vd inspect` view backed by the
  existing Project Index. It treats dynamic class names and asset URLs as
  unprovable, so unused and LCP results are advisory; byte-identical assets use
  SHA-256 evidence, and route attribution follows static page, layout, and
  nested component relationships. CLI impact is `DEFAULT_INCLUDED`; no
  templates, dependencies, runtime exports, or generated files change.
- `vd fix` is not a formatter or codemod framework. The allowlist owns only
  semantic-equivalent template aliases, previews by default, confines `.vd`
  changes to `<template>`, and compares the current file with its indexed
  snapshot before `--write`. Unknown directives and all JavaScript remain
  untouched. CLI impact is `DEFAULT_INCLUDED`; generated projects already use
  preferred syntax, so no template change is needed.
- Advanced doctor relationships remain proof-driven. Prop diagnostics activate
  only when a child script explicitly uses `ComponentInitContext<Props>` with a
  readable interface/type; dynamic prop objects are skipped. Child-ref member
  calls are checked against explicit `expose`, request targets reject runtime
  scope/protected paths, and state warnings require no conservative usage
  signal. CLI impact is `DEFAULT_INCLUDED`; no authoring contract is added.
- Generated component declarations merge two evidence sources: statically
  supplied prop keys and an optional explicit `ComponentInitContext<Props>`
  contract. The latter controls required/optional keys; values remain `unknown`
  because parsing application TypeScript types into a second type system would
  be brittle. CLI impact is `DEFAULT_INCLUDED`; `vd types` output improves, but
  JavaScript projects and starters are unchanged.
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
- A module's optional plain `state` export is merged before `init()` for both
  pages and components. It is intentionally limited to shallow defaults and
  safe state-only `++`/`--` updates; async setup, props, lifecycle cleanup,
  and complex behavior remain explicit in `init()`.
- Focused `vd create page --demo` templates are educational scaffolds, not a
  second app mode. They keep ordinary folders, create no shared global state,
  and omit scripts/styles/API files unless the named lesson truly uses one.
- The `next-intl` comparison resulted in a bounded optional i18n-DX roadmap:
  typed translation keys, native `Intl` formatting, locale-aware links, static
  `hreflang`, and a future ICU evaluation. Runtime providers, locale
  negotiation, cookies, domains, and CMS loading stay outside Core unless an
  explicit adapter contract is approved.
- `velodom/localization` now uses inferred default-dictionary keys for typed
  controller calls and exposes a pure declaration generator for wider
  application types. Its `Intl` formatter and locale-path helpers hold no
  browser state; generated localized SEO records own canonical and alternate
  links at build time. ICU and request-time locale selection remain deferred
  under the documented adapter boundary.
- The primary guide and package README are the learning surface for the
  documentation site. They intentionally explain the same folder/`.vd`
  authoring model and preferred `vd-*` syntax; compatibility attributes remain
  documented as migration input rather than beginner examples.
- `packages/velodom/AI_CONTEXT.md` is a compact generation contract, not a second API
  source. It points AI tools back to source-verified exports and the canonical
  guide, and it must be updated whenever the public authoring model changes.
- Common users should configure requests declaratively. Custom middleware and
  explicit `next()` pipelines remain an advanced option.
- Authentication is provider-based. Frontend auth and role checks improve UX
  but never replace backend authorization.
- Request routes with `roles` and no explicit `auth` declaration must enable
  authentication through the current application auth runtime, not a freshly
  created default runtime. Otherwise custom default providers are bypassed.
- Framework source is TypeScript and passes TypeScript plus ESLint before
  production builds.
- TypeScript enforces `strict` plus unused-code, indexed-access, return-path,
  side-effect-import, override, and switch-fallthrough checks across every
  package source file. The migration was intentionally completed slice by
  slice because a one-step switch exposed implicit contracts across compiler,
  runtime, adapters, optional integrations, CLI, and scaffolding.
- `packages/velodom/tsconfig.strict.json` is now a permanent package-wide gate
  over `src/**/*.ts`, not a transitional allowlist. Both `npm run check` and
  package builds execute it, and any future source module is strict by default.
- Directive registration reaches request routing through the lazy declarative
  request feature. That dependency belongs to the same strict boundary: hiding
  it with unchecked imports would leave runtime weaker than compiler. The final
  pass also covered CLI/project intelligence, scaffolding, optional subpaths,
  resource maps, and Vite integrations.
- Strict normalization uses explicit internal locale records and typed Vite
  glob/resource maps instead of assertions. Binary/text parsers guard missing
  indexed values, and public/plugin navigation is wrapped once so its runtime
  Promise behavior matches `VeloDomApp`. CLI impact is `NONE`: this hardening
  adds no flags, prompts, generated files, dependencies, or authoring syntax.
- Page routing requires one real `#app` mount element. The router validates this
  before touching layout, style, directive, or error-boundary targets and emits
  one source-aware diagnostic when the HTML shell is invalid.
- Unknown caught values are inspected through `shared/thrown.ts`. Compiler and
  request modules must not duplicate unsafe property access or assume every
  thrown value is an `Error`; source metadata from structured failures remains
  available when present.
- Directive feature modules are lazy dynamic imports. A bundler may emit their
  small standalone chunks so they remain available to dynamically discovered
  pages, while compiler manifests determine which chunks the application
  requests at runtime. Build intelligence therefore calls them "not requested"
  rather than claiming that the files were removed from build output.
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
- `packages/velodom/package.json` uses local package identity `1.0.0`; the root
  package remains a private development workspace. This source state does not
  assert that either package is currently available from npm.
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
  keywords, and public access. `publishConfig.access` documents the intended
  registry visibility for future releases.
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
- The documentation surface is intentionally consolidated into five maintained
  files: `README.md` for the complete guide and architecture reference,
  `TODO.md` for the roadmap, `CHANGELOG.md` for history, `NOTES.md` for
  decisions and handoff, and `RELEASING.md` for release and browser gates.
  Specialized capability notes were merged into the main guide so links do not
  fragment the beginner path.
- Current product documentation uses one V1 lifecycle vocabulary: Implemented,
  Current, Planned, Research, Deferred / Experimental, and Rejected. Older
  version labels remain only in `CHANGELOG.md`; they do not announce public
  releases or make research decisions into shipped features.
- Documentation/package consistency is automated from the public export map.
  Release documentation must include every package subpath, while current guides
  must not link to the specialized documentation files that were consolidated.
- Canonical guide coverage is also derived from public TypeScript entry modules,
  `PREFERRED_DIRECTIVES`, and CLI switch cases. Adding a public value, directive,
  or command requires documenting it in `docs/README.md` in the same change.
- Static project intelligence masks descendant text inside `vd-pre` before
  looking for directives, refs, components, requests, events, or state names.
  The compiler still receives the original template because preservation is a
  real compiler feature; only higher-level usage analysis receives the masked
  view. This prevents documentation source from creating false health signals.
- The example documentation information architecture separates explanation,
  practice, and exhaustive lookup: `/features` is the guided course,
  `/playground` owns live exercises, and `/reference` is the public
  package/syntax catalog. The canonical repository guide remains the single
  detailed text source under `docs/README.md`.
- Browser release verification uses a bounded launch timeout so broken local
  browser hosts report a named failed target instead of blocking CI forever.
  The mobile route smoke uses a visible content CTA, not navigation that is
  deliberately hidden at the mobile breakpoint. Strict Linux CI is the
  release authority when a local Firefox compositor cannot start, but the
  exact release commit must still pass the workflow before publication.
- Registry lookup is only a point-in-time availability signal. It cannot
  reserve a name, prove publisher rights, or establish release history. Prior
  repository and registry experiments are treated as pre-public development;
  current availability must be checked again during an authorized release.
- `.github/workflows/release-browser-matrix.yml` is the authoritative remote
  replacement for local graphics-limited browser testing. It uses a supported
  Ubuntu runner, installs Playwright's browser binaries, and runs the existing
  strict smoke suite without adding any runtime dependency to VeloDom.
- Release preparation remains intentionally separated from publication. The
  checklist in `RELEASING.md` records the gates for every version, and
  exact-version approval is required before publishing or tagging.
- `npm run pack:check` is a workspace verification command that runs package
  checks before an isolated-cache npm dry-run helper. The package's `prepack`
  hook only builds its own artifacts, avoiding recursive checks and dependence
  on workspace-only tooling.
- Vite adapter globs are rooted at `/src` so discovery is relative to the
  consuming Vite project rather than the installed adapter file.
- The package uses the MIT License and declares intended public access in its
  manifest. Local pack checks validate the artifact but never prove registry
  availability or authorize publication.
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
  It stays application-owned under `examples/velodom-blog/src`; framework-neutral
  behavior must stay in `packages/velodom/src`.
- The showcase is also the academic learning surface for VeloDom. Literal
  template examples use semantic `<pre><code>` markup and `vd-pre` so example
  interpolations and directives never become live template input. Dynamic
  JavaScript examples use `vd-text` to retain escaped text. This gives the site
  W3Schools-like readability without introducing a documentation renderer or
  browser dependency into Core. All live and copyable `vd-if` examples use an
  explicit Boolean expression, preserving the framework's strict conditional
  contract instead of relying on truthy strings or optional-chain values.
- Showcase `examples/velodom-blog/src/api/routes.js` is the declarative request
  registry for `vd-request`, not a list of every exported API helper. Page scripts
  may still import API helpers directly when imperative loading is clearer.
- The V1 site intentionally does not ship application middleware, auth, or CRUD
  example pages. Those framework features remain documented and tested in Core,
  while the public site stays focused on launch messaging and learning paths.
- The showcase uses the daisyUI Tailwind plugin with only light/dark themes;
  importing the complete prebuilt daisyUI stylesheet produced roughly 1.16 MB
  of CSS and was replaced by a generated 70 KB application stylesheet.
- Browser E2E now follows the V1 documentation site, not the removed CRUD
  showcase. It verifies the landing page, features page, playground state and
  component refs, one-file page, dynamic article route, local `vd-request`
  example, and no-JavaScript SEO.
- Components may own `vd-for`. The loop runtime evaluates `vd-props` and
  `vd-key` against the nested loop scope, mounts asynchronously discovered
  component resources, and owns their lifecycle cleanup and ref removal across
  list replacement. Ordinary non-component loops retain synchronous DOM
  updates when their iterable structure changes.
- Keyed loops reconcile by ownership range, not by cloning markup. A unique
  string/finite-number key plus the same item object permits reuse and movement;
  the loop scope index is refreshed before child subscribers run. Unkeyed or
  ambiguous lists rebuild, and a same-key/new-object item remounts deliberately
  because component props are initial values rather than a hidden reactive-prop
  channel.
- Application-owned static assets live under `src/assets`. The root favicon
  duplicates are intentionally removed because `index.html` already references
  `src/assets/favicon.png`; root-level static duplicates should only return if
  a deployment target requires them.
- The Master architecture rules are maintained in the consolidated
  `docs/README.md` guide. They mirror the npm package boundary at
  `packages/velodom/src` and keep application folders outside Core.
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
  section of `RELEASING.md` and mirrored by `package.json#browserslist`. The Playwright
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
- Navigation guards are an ordered policy boundary: global `beforeEach` guards
  run first, followed by the matched page's `beforeEnter`. Invalid guard
  configuration and non-app-relative redirects fail during validation rather
  than silently opening a protected route. Guard executions are navigation-
  scoped so a stale asynchronous result cannot commit after a newer route.
  When popstate is blocked, the router reinserts the active URL because the
  browser changes its address before application policy can decide.
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
  aliases, and must distinguish the local package identity from verified
  registry availability.
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
- Package runtime totals exclude `cli`, `scaffolder`, testing, and the
  build-only `pwa` integration. They are explicit Node/development/build entry points and cannot enter the browser
  through the main package export; counting them as client runtime would hide
  the metric the budget is intended to protect.
- The first VeloDom CLI is static/offline developer tooling. `vd inspect`,
  `vd stats`, and `vd routes` read folders, `.vd` templates, API route
  registrations, compiler manifests, SEO config presence, and test-file
  signals without adding browser runtime weight.
- `vd doctor` is intentionally advisory/static. It reuses compiler diagnostics
  and simple project references first; deeper semantic checks such as full
  state/control-flow analysis should remain future DX work until they can stay
  deterministic and lightweight.
- `vd build-report` is a machine-readable build intelligence surface. The Vite
  plugin emits a compact `dist/velodom-build-meta.json` with normalized module
  paths and byte counts but no source. Chunk ownership comes from those module
  paths, while duplicated dependency cost is reported only from Rollup's
  rendered-module lengths. Missing or incompatible metadata is an explicit
  unavailable state, never a minified-code heuristic.
- `vd add` is intentionally limited to existing first-party `i18n`, `tests`,
  and `lab` capabilities. It preflights all files/config entries and writes a
  versioned ownership manifest only after success. This establishes the safety
  contract needed by any later remove/upgrade lifecycle without introducing a
  plugin registry, package installation side effect, or browser code.
- Lab lifecycle correlation uses monotonically increasing request/navigation
  IDs only inside development events. The UI derives ownership, diffs,
  waterfalls, transitions, and diagnostic commands from the existing bounded
  read-only protocol; it still captures no credentials, request/response bodies,
  application source text, or mutable state controls.
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
- Page `.vd` route config is a build-metadata concern, not a reason to load the
  page runtime eagerly. The adapter requests only the virtual `vd-config`
  module for synchronous route discovery and reuses one lazy full-module loader
  for template, script, style, and manifest exports. This preserves code
  splitting without adding a registry file or a second page format.
- Incremental compilation is scoped to one Vite plugin instance and never
  enters the browser runtime. Cache identity includes normalized source,
  filename, mode, emission settings, and custom optimizer identity; an
  exact-source guard prevents line-ending normalization from reusing incorrect
  diagnostic offsets. Source fingerprints and Vite hot updates both invalidate
  affected variants, while a 256-entry LRU bound releases old results and file
  fingerprints. The standalone compiler intentionally stays uncached so its
  public calls remain explicit and deterministic.
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
- TypeScript `noImplicitAny` is not yet enabled globally. The shared-contract
  and compiler/optimizer slices are enforced; directive/runtime expression
  integration, mount/router, requests, CLI, and scaffolder parameters remain
  staged work and must be tightened without changing the JavaScript API.
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
- V1 release polish is documentation and verification work, not a new feature
  phase. Code readiness, the public API freeze, and local package checks form
  the `1.0.0` source baseline. Publication and release tagging remain explicit
  future owner actions after the exact release commit passes every gate.
- The `velodom` tarball owns the templates and shared scaffolder. A tiny
  `create-velodom` package is now necessary because npm resolves
  `npm create velodom` by package name, not by a bin alias in `velodom`.
- `vd create`, `vd init`, `velodom`, the in-package `create-velodom` binary,
  and the dedicated npm-create wrapper are thin interfaces to one engine.
  Removing duplicate implementations is more important than keeping every
  historical invocation as the primary documented path.
- Starter selection and optional features are separate dimensions. The three
  starter overlays stay small; feature installers generate manifests and
  config only for selected capabilities. This avoids a JS/TS/Tailwind/testing
  template matrix and keeps the generated project understandable.
- Dependency advisory review was completed for the V1 workspace baseline.
  The approved npm audit fixed three transitive high-severity issues; future
  lockfile changes must rerun `npm audit`, `npm ci --dry-run`, and the
  package/browser verification gates. The lockfile is generated with npm
  10.9.2 to match GitHub Actions and intentionally retains optional `@emnapi`
  entries that npm 11 may remove during an audit-only lockfile rewrite.
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
- Static prerendering is now a bounded V1 build capability: output is
  build-only and not SSR; forms enhance native submission through adapters;
  translations remain optional build tooling; and inspection stays opt-in with
  a read-only bridge. Hybrid rendering and partial hydration remain planned
  experimental work.
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
  diagnostics to Vite's standard development overlay. When optional Lab is
  active, one custom Vite event only tells the read-only compiler panel to
  refresh its local metadata; it does not replace Vite HMR or ship to
  production.
- Derived-state helpers intentionally subscribe to the supplied shallow state
  as a whole. This is predictable and easy to clean up, while fine-grained
  dependency tracking remains outside VeloDom's lightweight runtime goal.
- The VS Code language-tools package remains outside the framework tarball and
  consumes the public compiler language-service API. Its navigation and
  completion intentionally follow only conventional folders and `.vd` names;
  route-config overrides need a future editor-project index rather than router
  imports. Marketplace publication additionally needs a verified publisher and
  is not implied by workspace stability.
- The standalone `velodom/devtools` inspector and experimental Lab UI are an
  explicit subpath. `vd lab` enables the bridge only for the current Vite
  development process. A tiny hook connects optional sessions to runtime
  lifecycle points; the serializer, recorder, compiler endpoint, and UI stay
  in development-only modules. The protocol is versioned and read-only,
  retained events are bounded, getters are not executed, and request bodies,
  credentials, and response payloads are never recorded.
- VeloDom Lab remains in the existing `velodom/devtools` package subpath for
  V1 instead of creating a second package with synchronized version pressure.
  The scaffolder's `--lab` choice adds only `"lab": "vd lab"`; no-Lab
  projects gain no dependency or production configuration. A separate package
  may be reconsidered only if independent releases or a standalone host become
  real requirements.
- Lab integration must be verified through a real Vite browser session, not
  only unit fixtures. Vite transforms direct `import.meta.env.DEV` access but
  does not guarantee transformation of optional-chained variants, and plugins
  attach the inspection session after router construction but before its first
  navigation. The adapter therefore uses the direct development constant and
  the router resolves the session lazily inside navigation.
- `vd explain` is deterministic local tooling, not an AI feature. Migration
  infrastructure is intentionally deferred because V1 has no real framework
  migration to perform; exposing a placeholder command would violate the
  no-fake-features rule.

- PWA support is an opt-in build integration under `velodom/pwa`, not a Core
  runtime service. CLI impact is `OPTIONAL_PROMPT` plus `CONFIG_GENERATED`:
  `--pwa` or `vd add pwa` creates the manifest policy and public fallback/icon,
  then adds the explicit Vite plugin. Manifest-only use never emits a service
  worker; cache rules are data-only and allowlisted so validation never runs
  third-party/application callbacks. Navigation defaults to network-only and
  API/auth caching remains application-owned.

## Handoff Guidance

1. Read `README.md`, then `TODO.md`, before changing framework APIs.
2. Add framework behavior to `packages/velodom/src` only when it is generic across sites.
3. Keep domain-specific examples in the blog application folders.
4. Add a regression test for every core bug.
5. Run `npm test` and `npm run build` before committing.
6. Update README, TODO, this file, and CHANGELOG when decisions or milestones
   change.
