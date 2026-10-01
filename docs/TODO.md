# VeloDom Roadmap

This roadmap preserves VeloDom V1 as the completed source baseline and keeps
post-launch work intentionally small, optional, and evidence-driven. It
separates the remaining V1 release gates, the approved next-release maturity
scope, later-release opportunities, research-only work, and rejected
directions.
Discarded pre-public milestones are not product generations; only their
surviving user-visible outcomes are summarized in `CHANGELOG.md`.

## V1 Status Summary

| Area | Status | Evidence / next action |
| --- | --- | --- |
| Core compiler and lightweight runtime | V1 — Implemented | TypeScript source, declarations, compiler/runtime tests |
| Authoring and application conventions | V1 — Implemented | Folder mode, optional `.vd`, JS/TS parity, layouts, CLI scaffolding |
| Production features | V1 — Implemented | Routing, requests, forms, SEO, content, localization, package subpaths |
| Developer intelligence | V1 — Implemented | `vd` inspection commands, compiler language helpers, testing utilities |
| VeloDom Lab | V1 — Experimental / Implemented slice | Optional Vite UI, safe protocol, runtime/compiler inspectors, production-leak test |
| Public package source | V1 — Implemented | Local `1.0.0` manifests, exports, package docs, starters, and consumer checks |
| Browser release gate | V1 — Current | Strict CI workflow exists; rerun it on the exact initial-release commit |
| npm registry state | External verification | No official release is represented; verify name/version state before first publication |
| Approved authoring and rendering maturity | Implemented locally | Looped components, keyed updates, `.vd` lazy parity, and compiler cache; release verification remains separate |
| Approved developer intelligence | Implemented locally | Shared project index, diagnostics, safe fixes, generated types, and CLI composition |
| Approved optional extensions | Implemented locally | Seven bounded tooling/integration milestones complete; research remains excluded |
| Commerce and large applications | Active validation / optional extensions | Storefront, admin, HTTP/session and C04 organization/installed-consumer recipe are complete |
| Hybrid rendering, AI, migration, CMS, and Edge | Research / Experimental | External or high-risk capabilities; never required by Core |

### Progress counter

**V1 implementation: complete. Local scaffolder/package gates: complete.**

`[####################] 100%`

**Next-release approved scope: 15 of 15 milestones complete.**

`[####################] 100%`

The repository is the local V1 source baseline. Registry availability,
authentication, tags, and releases are external state and are deliberately not
recorded as completed here. Repository tests never publish or prove registry
state.

**New V1 simplicity/organization follow-up: 6 of 8 complete (75%).**
This separately scoped quality/adoption work is detailed below; the completed
implementation counters above do not mean these follow-ups or release gates are done.

**Commerce and large-application track: 8 of 10 complete (80%).**
These new proposals do not change the completed baseline or the 6/8 simplicity
counter. C01–C03 now provide storefront, administration, and real server-denial
evidence without adding commerce policy to Core. Research
experiments are tracked separately and are not implementation promises.

### Status vocabulary

- **V1 — Implemented:** supported by source, tests, and public documentation.
- **V1 — Current:** part of the current release candidate or an active release
  gate; it is not a new product generation.
- **Next release — Planned:** approved, bounded follow-up work that must retain
  the V1 public model and pass its focused regression/performance gates.
- **Later release — Deferred:** useful work intentionally postponed until the
  next release creates the required contracts or release evidence.
- **Research / Experimental:** investigation or opt-in prototype only; it is
  not a runtime promise.
- **Rejected:** conflicts with VeloDom's identity or adds mandatory complexity.

## V1 Simplicity, Organization, and Adoption — Prioritized Follow-up

This quality track is separate from the completed implementation milestones.
Freeze new capability expansion while validating the existing beginner path.
These tasks reuse current contracts, not new directives or a new runtime layer.

**Progress: 6 of 8 complete (75%).**

`[###############-----] 75%`

- [x] **P0 / V1 / Small:** Separate package, quality, browser, and performance
  repository scripts; keep source/example/package boundaries and stable npm
  commands. Fix obsolete lint globs and exclude generated tarballs/reports from
  Git. Value: contributors can find ownership without moving Core or duplicating
  the package's self-contained build scripts.
- [x] **P0 / V1 / Small:** Inspect both actual npm manifests, public entry files,
  nested accidental/private artifacts, and download/install/file-count budgets.
  Keep source maps and portable consumer documentation. Value: catch packaging
  growth and leaks before release without adding browser bytes.
- [x] **P0 / V1 / Small:** Make the root README an entry point instead of a second
  changelog; explain repository versus npm versus generated-site outputs. Add a
  two-file first-feature walkthrough to the educational homepage and clarify
  that the full documentation site differs from the generated Blog starter.
- [x] **P1 / V1 / Medium:** Validate one recommended beginner journey end to end:
  Minimal + JavaScript + ordinary CSS, edit one page, add one component, then
  build/preview. Show advanced alternatives afterward; preserve JS/TS, folder/
  `.vd`, and existing aliases. The shipped Quick Start and Minimal generated
  README now teach the same ordered path. The installed-tarball consumer creates
  the documented component through `vd`, applies the page/script example, rejects
  private import paths, and produces the production build before the advanced
  alternatives are introduced. Independent human observation remains the
  separately open validation task below rather than being inferred from tests.
- [x] **P1 / V1 / Medium:** Audit common list and form recipes against the existing
  request/auto-state/validation helpers. Remove unnecessary example boilerplate,
  show loading/error/empty/success states, and test the taught snippets. Do not
  add a new directive where an existing helper already solves the task. The
  teaching site now uses one `vd-target` plus `vd-auto-state`, an always-iterable
  keyed loop, and an accessible progressive form status/field-error recipe.
  Integration tests compile and execute those exact displayed snippets across
  native-invalid, loading, success, empty, request-error, and server-field-error
  outcomes; the production browser journey covers success and empty without an
  expected console error weakening the release gate.
- [x] **P1 / V1 / Medium:** Expand dev/production parity fixtures only where
  coverage is missing: imported/public assets, route/hash entry, layouts,
  scoped styles, requests and recovery. Reuse current starter/browser gates;
  include the new introductory lesson in copy-to-project tests. Acceptance:
  the same documented example works in development and from an installed
  tarball's production build without `/src/` asset URLs or hidden setup. The
  installed-package gate now reads the literal homepage HTML/script lesson,
  copies it into Minimal JavaScript, creates the taught component through the
  installed CLI, and verifies its scoped style, public favicon, and absence of
  source-only asset links in production output. Existing Vite tests cover dev
  compilation/invalidation; production browser journeys cover imported logos,
  layouts, route/hash entry, requests, reload recovery, and `.vd` lazy styles,
  so no duplicate parity runner was added.
- [ ] **P1 / V1 validation / External:** Observe 3–5 independent developers
  (including beginners) building a small content site or dashboard. Record
  first-page time, unclear errors, manual setup steps, and production surprises.
  Obtain voluntary feedback; automated tests cannot close this task. Use that
  evidence to choose simplifications rather than claiming ecosystem maturity.
  A bounded observation protocol is recorded in `NOTES.md`; no independent
  participant results exist yet, so this remains open.
- [ ] **P2 / V1.x / Medium:** Break the long teaching guide into smaller lessons
  only when navigation/usability evidence justifies it. Preserve existing
  `/features#...` links, keep syntax/inventory authoritative, and retain literal
  code + live examples. Do not duplicate the handbook in a second package doc
  tree or split the framework into more npm packages merely to reduce file count.
  The same study should record whether learners can find the existing
  request/auth/RTL lessons before changing navigation or splitting routes.

Existing SSR/islands/AI/migration proposals remain in Research below; this track
does not promote them. Release approval and full browser CI remain the existing
V1 Ecosystem gates, not additional unchecked copies here.

## Commerce and Large Applications — Evidence-led Roadmap

VeloDom is already a general-purpose frontend, not a blog engine. The current
documentation site is one consumer, not the framework's architectural boundary.
The objective is to prove and improve store, administration, and business-app
workflows without turning Core into an e-commerce backend or enterprise platform.

**Progress: 8 of 10 milestones complete (80%).**

`[################----] 80%`

### Existing foundations — reuse before adding

| Already implemented | Apply it to | Missing evidence or bounded extension |
| --- | --- | --- |
| Pages, dynamic routes, query context, layouts, guards, lazy routes | Catalog, product details, account and admin shells | Complete non-blog journeys; unsaved-edit handling is evaluated in C06 |
| `createSharedState`, shallow reactive state, keyed lists | Cart count, selected variants, editable collections | Explicit immutable/reassignment patterns; cart persistence is app-owned |
| Request routes, middleware, cancellation, retry, cache helpers, page data policies | Search, catalog reads, account requests, mutations | C05 completed explicit confirmed-write invalidation/refetch and privacy scope; no second request engine |
| Native validation/progressive forms and error boundaries | Address forms, login, product editing, recovery | Complex form composition in C06; client validation is not backend validation |
| Localization, native `Intl`, RTL, assets and static SEO/content hooks | Translated catalog, currency display, responsive product images | Real application examples and freshness policy, not a new translation or image service |
| Project Index, types, build reports, testing helpers and Lab | Team development, large route trees, debugging | Measured scale and production integration evidence in C07/C09 |

Prerequisite: complete the beginner journey and common-recipe work in the
Simplicity track before adding optional Core APIs. C01–C04 can validate current
V1 contracts; C05–C09 are bounded V1.x proposals, not a reason to inflate the
initial V1 release. C10 is deferred to a future major release unless independent usage justifies
earlier prioritization. Complexity labels are relative, not delivery estimates.

### P0 — Prove real applications with the current V1

- [x] **C01 — Storefront reference consumer. V1 validation; complexity: High;
  owner: application/example; CLI: NONE initially.** Build a separate small
  store example using public imports: catalog, categories, product variants,
  URL-backed search/filter/sort/pagination, product details, cart quantity and
  totals, empty/loading/error states, and a clearly mocked checkout handoff.
  Reuse `createSharedState`, requests, keyed lists, layouts, and native `Intl`;
  no `vd-cart`/`vd-checkout` directives or required store service. Keep guest-cart
  persistence versioned and application-owned, store no credentials in it, and
  revalidate availability/prices with the backend. Value: prove a complete
  shopping interaction without learning a second framework model. Acceptance:
  direct product links, Back/Forward filters, refresh/persistence failure,
  keyboard operation, mobile/RTL, and production builds work; the example
  clearly labels mock data/payment and makes no real transaction. Implemented
  as the separate `examples/velodom-store` consumer with deterministic local
  catalog and quotation fixtures, URL-backed native filters, direct SEO product
  routes, keyed product components, a versioned id/quantity-only guest cart,
  fresh price/stock checks, and a non-transactional checkout handoff. Unit tests
  cover filter/pagination, authoritative pricing/stock, invalid/unavailable
  persistence, while C03 replaces the original local checkout helper with the
  HTTP mock-order contract. Desktop/mobile browser journeys cover
  Back/Forward filters, keyboard add-to-cart, refresh persistence, blocked
  storage, direct routes, mock checkout, responsive overflow, and RTL. The
  example exposed and fixed the existing direction-context gap for components;
  no commerce API, directive, starter, or dependency entered Core.

- [x] **C02 — Administration and business workflow example. V1 validation;
  complexity: Medium; owner: application/example; CLI: NONE initially.** Add
  a focused admin area to the same reference consumer rather than a second
  copy of its domain/data layer. Demonstrate list/detail/edit, server-paginated
  search, bulk-action confirmation, validation errors, and separate layouts.
  Reuse native forms, existing request status, and accessible HTML; include
  focus restoration, keyboard controls, readable errors, and non-color-only
  status. Value: show dashboards/CRUD are first-class use cases without shipping
  a mandatory data grid/design system. Acceptance: rejected/failed/conflicting
  writes preserve edits and recover visibly; test actual server denial as well
  as UI guards through C03. Extend the existing common-recipe task, not a new
  parallel form tutorial. Application-side implementation is complete in
  `examples/velodom-store`: a dedicated admin layout shares the catalog
  repository with the storefront; URL search is server-paginated; native
  validated edit forms preserve drafts across deterministic failure/conflict;
  revision reload recovers explicitly; and a native dialog confirms keyboard-
  operable bulk publication changes. Unit and Chromium browser coverage prove
  readable non-color status, focus restoration, and recovery. C03 now exercises
  actual server authorization denial and UI guards, closing this milestone.

- [x] **C03 — Backend, session, and safe-write integration contract. V1
  documentation/integration tests; complexity: High; owner: application backend
  plus fixtures; CLI: NONE.** Teach that `src/api` discovery is a client request
  convention, not a secret server execution boundary. Specify a small
  replaceable HTTP contract for session, catalog, cart quotation, order creation,
  and order status. Test denied resource/role/tenant access, session expiry,
  logout/account changes, pending requests, and cached private data isolation.
  Keep server credentials, permission checks, CSRF/session policy, authoritative
  price/currency/stock/tax validation, and order state transitions on the server.
  Explain idempotent writes and retry restrictions: disabling a button or using
  a client-generated key alone cannot guarantee one order/payment. A future
  sandbox payment adapter must verify provider events on the backend and must
  not treat the browser success URL as proof of payment. Value: a realistic
  production boundary without making Core a backend. Acceptance: a deterministic
  local backend fixture rejects unauthorized/tampered/duplicate writes and
  produces no real charges; no provider SDK or secret enters a browser bundle.
  Implemented by the store's local-only Fetch-compatible backend plus Vite/Node
  adapters, server-session provider, guarded admin pages, authoritative quote,
  and idempotent mock-order flow. Focused tests cover resource/role/tenant and
  CSRF denial, expiry/logout/account changes, private no-store responses,
  tampered totals, duplicate keys, and aborted reads. The production browser
  gate crosses the actual HTTP adapter and rejects server-secret markers in
  client chunks. `src/api` contains browser calls only; CLI impact remains NONE.

- [x] **C04 — Large-team application organization recipe. V1 documentation;
  complexity: Medium; owner: docs/examples; CLI: NONE.** Show feature-owned
  catalog/cart/account/admin modules, shared application UI, typed public
  contracts, and dependency direction while retaining existing `src/pages`,
  `src/components`, `src/layouts`, and `src/api` discovery. Keep helpers in
  explicit app-owned modules outside discovery folders where appropriate;
  do not invent auto-discovered `services` folders or a DI container. Explain
  public versus server-only configuration, environment/build differences,
  deployment base paths, and choosing JS or TS without duplicating the app.
  Value: teams can grow a project without giant page scripts or private Core
  imports. Acceptance: examples build using the installed npm artifact and
  existing inspection tools; no new module registry or mandatory global store.
  Implemented in the handbook and blog architecture lesson against the actual
  store boundaries, with app-owned wire types used by the JS HTTP client.
  The package-consumer gate copies both real examples outside the workspace,
  uses the installed local tarball for inspect/routes/doctor/build, checks
  public-only imports and server-secret exclusion, and strictly checks a TS
  caller plus the handbook's JS/TS snippets. Vite asset base is distinguished
  from explicit routing/deployment paths. No runtime API or starter changed.

### P1 — Optional improvements after the reference workflows expose gaps

- [x] **C05 — Coherent read/mutation lifecycle. V1.x; complexity: High;
  owner: generic request/data helpers only if recipes prove insufficient;
  CLI: NONE.** Audit current cache/page-data/retry/cancellation contracts first.
  Design explicit invalidation/refetch after a successful mutation, bounded
  cache lifetime, duplicate-read coalescing, and stale-response prevention.
  Scope private entries by session/tenant and handle logout/in-flight completion
  without cross-user reuse. Begin with pessimistic writes; optimistic UI is
  optional, requires rollback/conflict semantics, and must never confirm payment
  or stock ownership. Value: fewer inconsistent cart/admin views and less
  hand-written request coordination. Acceptance: concurrency, abort, failed
  mutation, account-switch and memory-bound tests; reuse one request engine,
  preserve existing helpers, and add no automatic global fetch/store behavior.
  **Progress:** the request-cache audit reproduced five old failures, now fixed:
  late writes after clear, duplicate concurrent reads, private scope switch-back,
  header/credential collisions, and unbounded retention. The existing helper
  now has bounded LRU/in-flight tracking, independently cancellable coalesced
  GETs, explicit scope fencing, and compatible base-key invalidation. Ten
  regression tests also cover total cancellation, failures, TTL, custom-key
  races, and saturation; installed TS consumption checks the new options.
  Its superseded implementation/helpers were removed, and package/AI/blog
  docs distinguish request caching from public-only page-data freshness.
  **Retry/cancellation progress:** unified the existing declarative wait and
  optional retry wrapper; cancelled contexts and AbortError never trigger a
  new attempt. Middleware no longer proceeds into another operation after
  cancellation or wraps aborts as ordinary failures. Late ignored-abort results
  and completion effects after an async success callback are fenced. Twelve
  additional regressions cover wrapper/middleware/directive cancellation and
  listener cleanup; replaced duplicate/uncancellable wait helpers.
  **Page-data progress:** the existing opt-in public cache now bounds LRU values
  and tracked reads at 100, coalesces matching cold/SWR reads, prunes expiry and
  observes background failure without renewing its original stale age. Internal
  page/all invalidation fences late cache writes; app destroy clears identities.
  Thirteen new regressions cover freshness, recovery, uncached independence,
  invalidation, LRU, expiry, saturation, non-finite policies and public app
  teardown/SWR; the installed public createApp is also exercised. Removed the
  old unbounded refresh helper.
  **Navigation progress:** fixed the reproduced slow-loader overwrite across
  template/layout/data/style/module/init/mounted and error-fallback awaits.
  Accepted replacements own abort signals; blocked newer guards and same-page
  hashes preserve the visible/accepted scope as appropriate. Client data loaders
  receive optional signal (build/server may omit it); cached subscribers cancel
  independently and the last abort fences shared work. SWR belongs to the cache
  and tracked reads abort on app destruction. Components clean captured owners,
  not the new DOM under a reused root; async directive/loop cleanup is awaited.
  Twenty-three new regressions cover navigation, cleanup, lifecycle and data
  cancellation; the installed public app and TS loader contract are checked too.
  Removed duplicated shared-read cancellation and migrated its one utility to
  shared Core. Destroy-before-onCleanup and old syntax/exports remain compatible.
  **Completion:** the public app and page/component `ctx` now offer explicit
  logical-page/all invalidation and mounted-page refetch over the existing
  loader/cache. Concurrent explicit refreshes coalesce even without cache;
  failed reads preserve mounted data/drafts, while abort, departure, destroy
  and invalidation fence late commits. The real store confirms catalog/admin
  freshness after accepted edits/bulk writes, preserves success on a failed
  post-write read, retries only the GET, and invalidates on account changes;
  rejected writes do neither. Core and HTTP-consumer tests exercise concurrency,
  cancellation, failed mutation, account switch and cache bounds. No implicit
  write interception, second request engine, private page cache, global store,
  rollback or automatic optimistic UI was added. CLI classification for the
  public controls is DEFAULT_INCLUDED; no prompt or generated policy is needed.
  Existing helper option CLI impact remains NONE.
  CLI classification for navigation cancellation is DEFAULT_INCLUDED: no new
  prompts, controllers or generated cache policy. Existing templates need no
  changes; JS/TS starters and real consumers are verified by the package gate.

- [x] **C06 — Composable complex forms and edit protection. V1.x; complexity:
  High; owner: optional forms integration and narrowly scoped router extension
  only if needed; CLI: NONE initially.** Build on native constraints and the
  existing validation plugin: field/server-error mapping, dirty/touched state,
  repeatable fields, async-validation cancellation, and multi-step form recipes.
  Evaluate an optional schema adapter, not a required validation dependency.
  Include an explicit multipart/file-upload escape hatch with cancel/cleanup;
  do not imply the JSON request helper already serializes files or that upload
  progress/resume is automatic. Define unsaved-edit behavior for app navigation,
  browser Back, and best-effort native unload prompts without trapping users;
  browser restrictions still apply. Value: usable checkout/admin forms without
  a new form DSL. Acceptance: accessible focus/errors, retained values on failure,
  stale validation ignored, no duplicate listeners, server validation retained.
  **Progress:** the Store reference now composes the existing global router
  guard with an application-owned dirty baseline: app links and blocked Back
  preserve the draft, a confirmed departure releases it, and `beforeunload`
  is registered only while the mounted edit is dirty. The optional progressive
  form bridge links server field messages accessibly, forwards native multipart
  `FormData`, aborts removed forms, fences ignored-abort late success/redirect,
  and keeps an accepted submit successful if only redirecting fails. No new
  directive, global form store or required schema dependency was introduced.
  The separate `/forms` lesson now proves keyed repeatable fields, two native
  editing steps, touched/dirty feedback, latest-only async validation and
  cleanup on departure. The documented `$event` alias was repaired in the
  expression evaluator and verified by direct DOM and production-browser
  tests. A schema adapter was evaluated but not added: native constraints,
  application state and authoritative server validation meet the reference
  cases without a dependency or form DSL. CLI impact remains NONE; six
  generated JS/TS starter combinations retain native form defaults. All 426
  source tests, full build, installed consumers and desktop/mobile Chromium
  pass; Firefox/WebKit and remote CI remain separate release evidence.

- [x] **C07 — Measured large-project reliability. V1.x; complexity: Medium;
  owner: existing build/test tooling; CLI: NONE.** Extend current benchmarks and
  six-starter gates with deterministic larger route/component graphs and long
  navigation sessions. Measure cold/warm builds, HMR invalidation, route chunks,
  cleanup/listener/cache growth, and representative catalog/admin response work.
  Prefer server pagination and lazy routes before virtualization. Reuse
  `build-report`, Project Index, browser tests, and performance budgets instead
  of adding another dashboard. Value: replace "supports large projects" claims
  with reproducible evidence. Acceptance: record dataset, environment, baselines
  and thresholds; cover deep links, base paths, auth changes and repeated mounts;
  regressions fail CI, and browser-scale evidence is not presented as backend
  throughput or a guarantee of concurrent shoppers.
  **Evidence:** `benchmark:check` compiles a fixed 80-page/32-component graph
  cold, warm and after targeted invalidation; it also performs first,
  repeated and `/preview/`-based real Vite builds and asserts stable route
  chunk counts. A 160-visit runtime regression covers deep nested links,
  session-guard changes, retained DOM event-listener cleanup and page-owner
  release. Existing page-data tests bound cache variants/tracked reads at
  100; the real Store desktop/mobile browser journey checks catalog/admin
  navigation. The same benchmark samples 100 small local catalog/admin reads,
  explicitly **not** backend throughput. Timing is recorded, not gated on
  machine-specific milliseconds; structural, cache, package and bundle
  regressions fail the existing build/test gates. CLI impact NONE; templates
  and public Core API remain unchanged.

- [ ] **C08 — Optional Store/Admin starter exposure. V1.x, after C01–C04;
  complexity: Medium; owner: existing scaffolder; CLI: STARTER_SPECIFIC.** Only
  promote a proven minimal subset of the reference app into starter selection
  after usability tests show it saves setup work. Reuse shared starter layers,
  feature installers, ownership/conflict rules, and JS/TS choices; do not copy
  the full teaching site or add another generator. Value: a beginner starts a
  practical app with editable files and no framework-internal edits. Acceptance:
  packed-install builds, language/tooling combinations, optional additions,
  public-only imports, portable docs, and visible mock/backend setup; no secret
  prompts, payment activation or dependency installation without explicit choice.
  There is no Store/Admin starter option today; do not document future flags
  as current commands. The `NOTES.md` study protocol measures which Store
  setup steps independent beginners repeat; no usability result or starter
  promotion is claimed yet.

- [x] **C09 — Opt-in production diagnostics recipe. V1.x; complexity: Medium;
  owner: application integration, then generic hooks only for confirmed gaps;
  CLI: NONE.** Reuse structured error reports, existing boundaries, and request
  lifecycle hooks to forward redacted errors/timing/correlation IDs to an
  application-selected sink. Document source-map handling, sampling, cleanup,
  and route/request attribution; never capture session/cart/payment payloads
  by default. Keep Lab development-only. Value: diagnose real user failures
  without mandatory telemetry or a framework monitoring account. Acceptance:
  normal imports create no collector/network traffic, redaction fixtures pass,
  handlers clean up, and observability failure never breaks a user action.
  **Evidence:** the Store ships an unmounted application-owned recipe over
  public request hooks and recoverable boundary context. It samples and emits
  only allowlisted code, logical page/route, stage, outcome, local ephemeral
  correlation ID and duration; raw params, session/cart/payment values,
  messages, stacks and URLs never reach the sink. Abort and destroy release
  pending timers/listeners; broken or rejected sinks do not affect actions.
  Source tests include a real declarative request and sensitive-data fixtures.
  The handbook and teaching site show explicit opt-in wiring, private source
  maps and the limits of the client-only ID. Normal app imports produce no
  collector or traffic. CLI impact NONE; no Core hook, export, dependency,
  starter prompt or package-version change.

### P2 — Defer until contracts and users justify it

- [ ] **C10 — Optional API-contract code generation. Future major release; complexity: High;
  owner: build-only adapter; CLI: POST_CREATE_STEP if approved.** Evaluate
  generating app-owned request wrappers and TS declarations from a local
  OpenAPI schema, reusing `vd types` conventions where possible. Plain JS and
  hand-written handlers must stay valid; server validation remains mandatory.
  Value: reduce API drift for multi-team applications, not introduce a new
  runtime RPC/server-actions layer. Acceptance: deterministic output, explicit
  generated-file ownership, no overwrite of user handlers, no network fetch
  without consent, and installed-consumer tests. No CLI command is promised yet.
  **Feasibility audit:** `vd types` currently discovers local request names but
  deliberately types their payloads as `unknown`; first-party feature ownership
  hashes do not yet own generated API files. A real local OpenAPI importer must
  handle references, media types and security descriptions without executing
  auth policy in the browser. No schema-backed consumer or user evidence exists
  here to justify the dependency/maintenance cost, so no V1 generator, flag,
  handler rewrite or network fetch is introduced. Detailed decision in
  `NOTES.md`; this remains future-major research, not a completed capability.

### Services that must not be built into Core

| Concern | Correct owner / VeloDom's role |
| --- | --- |
| Catalog persistence and full-text search | Application backend/database/search service; VeloDom displays and requests records |
| Prices, currencies, discounts, inventory, shipping and taxes | Server business rules; frontend formats and previews but cannot authorize totals |
| Payments, refunds, fulfillment and subscriptions | Application backend + chosen provider; frontend handles a documented handoff/status UI |
| Accounts, sessions, roles, tenants and authorization | Server identity/access policy; existing client providers/guards improve UX only |
| Upload storage, image transformation, email and jobs | Optional application services/adapters, not hidden credentials or mandatory cloud dependencies |
| Shared state, error UI and presentation | Application-owned patterns using optional generic helpers; no compulsory global store/UI kit |

External evidence for these boundaries (not a selected vendor dependency):
[OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
requires permissions to be checked on requests;
[Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment) explains why
payment completion cannot depend only on a browser landing page; its
[idempotent-request contract](https://docs.stripe.com/api/idempotent_requests)
illustrates backend/provider-enforced retry semantics. Recheck the chosen
provider's actual contract during implementation; there is no universal payment API.

Keep `examples/velodom-blog` as the teaching site. Future store/admin consumers
should be separate application examples, linked from lessons once implemented,
not silently substituted for the documentation site or bundled into Core.

## V1 Core — Implemented

- [x] Audit runtime bindings, CLI errors/creation flags, diagnostic privacy,
  static navigation analysis, starter accessibility, and documentation parity.
  Add regressions for ARIA booleans, CSS variable casing/style replacement,
  dynamic href diagnostics, safe help, and non-Error throws. Keep aliases intact.
  Production visual checks also fixed source-folder logo URLs, narrow navigation,
  and code-card overflow in the playground and `.vd` lesson. See `NOTES.md`
  for passed gates and the remaining local Firefox launch limitation.

- [x] TypeScript framework source with generated public declarations and ESLint.
- [x] HTML parser, source-aware diagnostics, safe expression AST/evaluator, and
  compiler-selected runtime feature manifests.
- [x] Preferred `vd-*` directives with backward-compatible `data-vd-*` names.
- [x] Text interpolation, escaped interpolation, and `vd-pre` literal regions.
- [x] Pages, nested routes, dynamic params, query values, guards, hashes,
  scroll restoration, focus management, and opt-in prefetch.
- [x] Router guards validate Vanilla JavaScript configuration and redirect
  targets, preserve global-before-page order, ignore stale async completions,
  and keep the address bar aligned when popstate navigation is blocked.
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
- [x] Added root AI/contributor guidance plus `packages/velodom/AI_CONTEXT.md`, a concise
  generation contract that explains Core/application ownership, supported
  syntax, boundaries, and verification.
- [x] Added `examples/velodom-blog/README.md` so the showcase is an explicit consumer
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
  page, component, API, middleware, plugin, and focused demo scaffolding.
- [x] Unified feature-based project creation with Minimal, Blog, and Empty;
  Recommended/Customize; JS/TS; CSS/Tailwind; optional ESLint, Prettier,
  route examples, i18n, tests, Git, install, server start, and scriptable flags.
- [x] Added a separate Node-only `create-velodom` npm-create wrapper while
  keeping `vd create`, `vd init`, and package binaries on one scaffolder core.
- [x] Verified a real Recommended dependency install and its ESLint, Prettier,
  TypeScript, and production-build commands; added isolated package cases for
  all three starters and the combined TS/Tailwind/i18n/Unit/E2E configuration.
- [x] Compiler-backed editor analysis/completion and the optional private
  `packages/velodom-vscode` workspace consumer.
- [x] `velodom/testing`, devtools bridge/inspector, and real-browser Playwright
  smoke coverage.
- [x] Experimental opt-in VeloDom Lab with route, mounted scope/component,
  state, binding, timeline, request/event, and compiler views over a versioned,
  bounded, read-only protocol.
- [x] `vd lab`, `vd explain`, focused `vd inspect` views, Lab setup diagnostics,
  optional scaffolder selection, package-manager-aware startup, HMR compiler
  refresh, and a production-artifact leakage gate.
- [x] Add a dependency-free VeloDom CLI wordmark with safe ANSI color detection,
  plain CI/pipeline output, and `--no-logo`/`--color`/`--no-color` controls;
  JSON and version responses remain machine-readable.
- [x] Documentation checks for public exports, documented CLI commands, private
  imports, legacy roadmap labels, and removed-guide links.
- [x] Named-function JSDoc across all Core TypeScript modules, enforced by an
  AST-based documentation gate while emitted runtime JavaScript stays free of
  comment weight.
- [x] Source-derived documentation coverage for all public runtime/build values,
  preferred directive names, and CLI commands in the canonical one-file guide.
- [x] Source-derived showcase coverage for package entry points, public-value /
  directive / CLI totals, and obsolete syntax signatures that previously
  allowed teaching examples to drift from Core.
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
- [x] Split interactive exercises into `/playground`, keeping `/features`
  focused on explanation while dogfooding state,
  component props, slots, refs, expose, and declarative requests.
  The expanded static catalog still has a non-blocking size advisory; its
  evidence-led lesson split is tracked in the V1 simplicity follow-up.
- [x] Project intelligence now detects object-form `expose` APIs, including
  JavaScript shorthand properties and method syntax.
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
velodom/pwa
velodom/devtools
velodom/vite
velodom/vite-plugin
velodom/testing
velodom/cli
velodom/scaffolder
velodom/package.json
```

Current release work is governance rather than a new framework feature:

- [x] Prepare local `1.0.0` manifests, public exports, package-local docs,
  composable starters, installed-consumer checks, and dry-run tarball audits.
- [x] Keep the npm 10 clean-install compatibility entries required by the CI
  lockfile while preserving successful npm 11 local development.
- [x] Provide a strict Chromium, Firefox, WebKit, and Mobile WebKit workflow;
  local graphics limitations do not weaken the required release CI run.
- [ ] Choose the exact initial-release commit and run every package, build,
  performance, and strict browser gate on that commit. Current local WebKit
  desktop/mobile and Chromium desktop/mobile pass, while Firefox local startup
  is blocked by `RenderCompositorSWGL` graphics failure before any scenario;
  strict Linux CI on the selected final commit remains required.
- [ ] Verify the `velodom` and `create-velodom` registry names and versions at
  release time; local documentation must not guess their current availability.
- [ ] Obtain explicit owner approval, publish `velodom` first, then publish the
  matching `create-velodom`, and smoke-test `npm create velodom@latest` from a
  clean directory.
- [ ] Create the first official Git tag/GitHub release and move verified notes
  from `Unreleased` into the dated `1.0.0` changelog section.

## Next Stable Release — Approved Maturity Scope

The next stable release is a maturity release, not a redefinition of VeloDom. Every item below
must preserve HTML-first authoring, JavaScript/TypeScript parity, folder mode,
and zero browser cost for unused capabilities. A proposal moves to a later
section if it requires a new mandatory runtime abstraction, a compatibility
layer, or unproven analysis.

### P0 — Authoring, rendering, and Core quality

- [x] Make `vd-component` inside `vd-for` reliable: evaluate `vd-props` in the
  loop scope, preserve the current component contract, and add nested-loop,
  async-update, and browser regression coverage. This resolves the documented
  V1 authoring constraint instead of adding a second component syntax.
- [x] Improve keyed `vd-for` reconciliation for stable `vd-key` values so list
  reorders move, insert, and remove existing DOM/component instances where
  safe; preserve focus, form values, and component state. Keep conservative
  rebuild behavior for unkeyed or ambiguous lists.
- [x] Restore `.vd` lazy-loading parity with folder pages by extracting route
  configuration at build time without duplicate Vite imports or a different
  public page format.
- [x] Add an incremental compiler/HMR cache keyed by normalized source and
  compiler options, with invalidation and cold/warm-build benchmarks. It is a
  development/build optimization, never an application runtime cache.
- [x] Migrate Core typing to TypeScript `strict` in small verified slices:
  shared contracts and leaf modules first, then compiler, directives,
  mount/router, requests, CLI, and scaffolder. Do not change the JavaScript
  authoring API merely to satisfy the checker.
  - [x] Enforce the first strict slice for public/shared contracts,
    compiler/devtools protocol types, the build-time compiler cache, authoring,
    lifecycle, plugins, reactive state, refs, and shared leaf utilities.
  - [x] Migrate the compiler implementation and optimizer pipeline, including
    the safe expression parser and `.vd` source-position helpers reached by the
    public compiler entry.
  - [x] Migrate directive features and expression/runtime integration,
    including the auth, middleware, binding, and request-router dependencies
    reached by the declarative request feature.
  - [x] Migrate mount, page routing/matching, resource adapters, page data, and
    the directly reached event, style, SEO, lifecycle-hook, and error-boundary
    runtime dependencies.
  - [x] Migrate CLI/project intelligence and scaffolder modules, then enforce
    `strict` over every `packages/velodom/src/**/*.ts` source so future public,
    optional, adapter, and build modules cannot bypass the completed boundary.
    Request runtime dependencies are covered by the directive integration
    slice above.
- [x] Create one internal, build-time Project Index with source locations and
  compiler metadata. Existing CLI, language tools, generated declarations,
  documentation, graph, health, and Lab views must consume it incrementally
  rather than each gaining a separate project parser. The first completed slice
  centralizes discovery, source/config/script loading, `vd-pre` masking, and
  compiler results for CLI diagnostics, generated declarations, docs, graph,
  health, security, and build reports; editor/Lab consumers can adopt the same
  internal snapshot contract as their project-wide views expand.

### P1 — Diagnostics, typing, and focused developer workflows

- [x] Add stable diagnostic IDs, documented categories, source locations, and
  typo suggestions for compiler/route/component/request findings; extend
  `vd explain <code>` without changing deterministic offline behavior. Project
  diagnostics now use compiler, accessibility, component, configuration,
  maintainability, request, routing, security, state, or tooling categories;
  statically located template findings report line/column data and conservative
  nearest-name suggestions.
- [x] Add `vd check` as a non-destructive composition of compiler diagnostics,
  generated-type validation, `doctor`, route/reference checks, accessibility,
  security, and build sanity. It must report which checks actually ran and
  never silently substitute a production build for a browser test. Text and
  JSON reports enumerate compiler, references, security, build sanity,
  maintainability, and an explicit `browser: not-run` step; no source or build
  artifact is written.
- [x] Add `vd fix` only for reviewed, syntax-preserving fixes such as preferred
  `vd-*` aliases and deprecated request-state names. It must preview changes,
  leave business logic untouched, and never delete files automatically. The
  default is a line/column preview; `--write` is explicit, verifies that source
  still matches the Project Index snapshot, edits only HTML/`.vd` template
  regions, and supports only legacy `data-vd-*`, event, and request-state aliases.
- [x] Extend `vd doctor` through the Project Index with source-provable checks:
  invalid app-relative `vd-nav` links, impossible request targets, component
  prop/ref/expose mismatches, unused shallow state, and unreachable template
  handlers. Control-flow inference remains out of scope until it is reliable.
  Prop checks require an explicit `ComponentInitContext<Props>` interface/type;
  dynamic `vd-props` and dynamic state access remain deliberately unguessed.
- [x] Extend generated application declarations for TypeScript consumers with
  typed route parameters, request route names, and component-prop facts that
  can be proven statically. JavaScript users keep the same zero-configuration
  workflow and unprovable values remain `unknown`. `vd types` now combines
  route params and request names with individual/static-object prop usage plus
  required/optional facts from explicit `ComponentInitContext<Props>` contracts.
- [x] Expand `vd build-report` using Vite/Rollup metadata to attribute initial,
  route, shared, component, and lazy-feature chunks, including duplicated
  dependency cost when it can be measured accurately. The Vite plugin now emits
  a versioned, source-free `dist/velodom-build-meta.json`; the report derives
  chunk ownership and Rollup rendered-module duplication from that artifact and
  states when metadata is unavailable instead of guessing from minified text.
- [x] Add a narrowly scoped `vd add <feature>` installer for existing optional
  first-party capabilities (for example i18n, tests, or Lab). Start with an
  idempotent feature-installer contract and a generated-file manifest before
  considering removal or third-party packages. `vd add i18n|pwa|tests|lab` now
  preflights every write, refuses user-file/script conflicts, records created
  file hashes and controlled modifications in `.velodom/features.json`, and is
  idempotent without installing packages or creating a plugin marketplace.
- [x] Improve the optional, read-only Lab with a component ownership tree,
  state diffs, request waterfall, route-transition timeline, directive/source
  inspection, and copyable diagnostic commands. Keep source writes, mutable
  runtime state, payload capture, and secret collection out of the next release.
  The Lab now derives those views from bounded snapshots, correlates concurrent
  requests/navigation with internal development IDs, and copies only local
  `vd explain` commands through the browser Clipboard API.
- [x] Add `vd test` as a thin command for existing project tests plus compiler
  fixture, route, request-mock, component-interaction, and accessibility-smoke
  helpers. Browser, unit, component, and route filters must run real selected
  tests, not report a green placeholder. The command now selects an existing
  package script (`test`, `test:unit`, `test:browser`/`test:e2e`, or focused
  compiler/route/request/component/accessibility scripts), rejects missing or
  recursive scripts, and `velodom/testing` exposes deterministic helpers over
  the real compiler, router, DOM event, request-double, and accessibility paths.

## Later Releases — Deferred Extensions

These implemented extensions remain optional build/development integrations.
Their bounded contracts and tests use the shared Project Index and installers;
completed local work does not imply publication or replace release gates.

**Executable later-release scope: 7 of 7 milestones complete.**

`[####################] 100%`

- [x] Expand the feature installer lifecycle with safe `vd remove`, `vd
  upgrade`, compatibility reporting, and shareable project presets. Removal
  must use generated-file manifests and refuse to delete user-owned changes.
  `vd features` now audits chained ownership hashes; `vd remove` restores
  reversible controlled files and deletes only unchanged generated files;
  `vd upgrade` transactionally reruns current first-party generators; and
  versioned JSON presets contain only allowlisted feature names/options.
- [x] Extend localization with pluralization, parameter interpolation, nested
  key groups, missing/unused-key reports, extraction/check commands, editor
  completion, and per-locale RTL validation while retaining build-time,
  application-owned dictionaries. Explicit `definePluralMessage()` leaves use
  native `Intl.PluralRules`; `{name}` interpolation stays text-only; static
  `vd i18n extract|check` never imports project code; diagnostics cover
  missing/extra/unused/unknown/direction facts; and dictionary completions are
  exposed for optional editor integrations.
- [x] Add build-only CSS and asset intelligence: unused-selector and scoped-CSS
  duplication reports, route CSS attribution, logical-property suggestions,
  missing dimensions, oversized/duplicate/unused assets, responsive-variant
  checks, and LCP/preload advice. Do not add a CSS framework or automatic image
  transformation service. `vd inspect css|assets` now reuses the Project Index,
  attributes resource styles to statically provable routes, hashes local assets,
  and labels usage/LCP findings as conservative advisories. It never mutates
  files or enters application bundles.
- [x] Add an optional PWA build plugin with manifest validation, offline
  fallback, installability diagnostics, and explicit cache-strategy templates.
  `velodom/pwa` remains a separate build subpath; a manifest alone emits no
  service worker or registration module, while `--pwa` and `vd add pwa`
  generate visible application-owned policy and assets. Cache matchers and
  algorithms are allowlisted, navigation defaults to network-only, and normal
  framework imports gain no runtime code.
- [x] Improve error diagnosis with hierarchical ownership reporting, error IDs,
  richer source stacks, grouped compiler/router/request errors, and a
  development-only overlay. Preserve the existing application-owned recovery
  boundary rather than imposing an error UI. Runtime reports now carry stable
  IDs, normalized bounded frames, subsystem groups, and page/component/request
  ownership; the opt-in `velodom/devtools` overlay only observes and groups
  those reports, while application hooks continue to own retry and fallback UI.
- [x] Formalize plugin manifests with compatibility ranges, declared build,
  browser, and Node capabilities, conflict diagnostics, and conformance tests.
  Optional manifests now declare exact plugin versions, a bounded VeloDom
  range subset, host capabilities, and named conflicts. Static conformance
  reports duplicates, incompatibility, target mismatch, and conflicts without
  executing setup/cleanup; legacy manifest-free plugins remain compatible and
  no marketplace or discovery service was added.
- [x] Expand browser/performance regression benchmarks and starter compatibility
  coverage as the new contracts land; checks remain release gates rather than
  browser runtime behavior. The release matrix now covers desktop/mobile
  Chromium plus desktop/mobile WebKit and Firefox, fails on unexpected browser
  errors, verifies six Minimal/Blog/Empty JavaScript/TypeScript starter builds,
  enforces per-starter bundle ceilings, runs compiler/render correctness
  benchmarks, and measures only modules reachable from public browser entries.
  Local runs default to required desktop/mobile Chromium; strict CI selects the
  complete five-target matrix explicitly so machine-specific Firefox launch
  failures cannot leave the local gate hanging.

## Research / Experimental Boundaries

Research items are deliberately not promises and must not become Core runtime
dependencies. A written design, runtime-budget comparison, and an opt-in proof
of concept are required before promoting any item to a later release.

- [ ] Investigate fine-grained dependency tracking as an internal optimization
  only. Shallow state remains the default; do not introduce a required signals
  API or wake unrelated subscriptions without proving semantics, cleanup, and
  runtime-size benefits. Current source and rendering-budget audit in
  `NOTES.md` found no measured need for a second tracking layer; this remains
  research until a reproducible user workload identifies one.
- [ ] Evaluate an opt-in hybrid server-rendering boundary and route rendering
  modes that keep static output the default for applications that explicitly
  need request-time HTML.
  Use public product/category freshness and authenticated-account isolation as
  evaluation cases. Compare explicit static rebuilds with request-time needs;
  never cache personalized pricing/account HTML across users. Commerce does not
  automatically promote this research to an implemented V1 SSR/hydration promise.
- [ ] Evaluate compiler-generated islands or partial hydration only if ordinary
  HTML remains the authoring surface, no mandatory virtual DOM is introduced,
  and pages that do not opt in pay no hydration cost.
- [ ] Evaluate streaming and Edge adapters as separate contracts, not hidden
  behavior in the browser package.
- [ ] Evaluate critical-CSS extraction only as a deterministic build plugin;
  never make it a framework styling system or require a particular CSS tool.
- [ ] Evaluate an optional AI-provider interface and separate CLI review,
  explain, generate, or migration helpers. Support local/custom providers and
  never require API keys, network access, telemetry, or AI to use VeloDom.
- [ ] Evaluate HTML-to-VeloDom, React-to-VeloDom, and Vue-to-VeloDom migration
  helpers that output ordinary reviewable folders, never a compatibility
  runtime or an automatic source rewrite without review.
- [ ] Evaluate external CMS/deployment adapters that map typed records through
  `velodom/content` without credentials or remote browser fetching in Core.
- [ ] Evaluate locale negotiation, cookie/domain locale policy, full ICU
  parsing, and request-time translation providers outside the build-time
  localization helpers.
- [ ] **Commerce/large-data research; complexity: High; CLI: NONE:** Evaluate an
  optional virtual-list integration only when C07 measurements show pagination
  is insufficient. Prove keyed state/focus, keyboard/screen-reader behavior,
  variable-height rows, cleanup, and memory limits; never change default
  `vd-for` semantics or hide important indexable content by default.
- [ ] **Business-app realtime research; complexity: Medium–High; CLI: NONE:**
  Evaluate app-owned SSE/WebSocket recipes for order notifications and dashboards
  with reconnect/backoff, authentication changes, missed-event recovery,
  bounded buffering, and cleanup. Start with native APIs and existing lifecycle
  hooks; do not add a required connection, hosted broker, or stock/transaction
  consistency guarantee to Core.

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
