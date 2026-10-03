# VeloDom Engineering Notes

## Architectural Decisions

### Open roadmap gates: usability, API contracts, and reactivity — 2026-10-01

- P1/C08 require independent observation, not another automated fixture.
  Invite 3–5 volunteers including beginners. Give each the current Minimal
  first-page/component/build journey, then one small catalog or dashboard task
  using the existing supported starter. Record time to a working first page,
  commands/files edited, unclear diagnostics, production-build surprises and
  which Store reference files they would actually reuse. Ask them to find the
  request, auth and RTL lessons using current navigation; record failed paths
  before deciding P2 guide splitting. Do not collect credentials or treat
  staff/agent reenactment as independent developer evidence. Promote C08 only
  if repeated observed setup friction is reduced by a small editable starter
  prototype without increasing the beginner default; then run packed JS/TS
  and option-combination gates. No participant data has been collected here.

#### P1 observation sheet (unfilled)

Use one fixed commit/package artifact and record its SHA. Before registry
publication, follow the source-checkout command in
`packages/velodom/docs/QUICK_START.md`; label those results **pre-release
local setup**, not npm registry onboarding. Give the participant the Quick
Start without explaining the answers. Set up Node/dependencies first and time
that separately so first-page time is comparable.

1. Starting from Minimal + JavaScript + plain CSS, change the home heading,
   make the counter respond to a click, create/render `welcome-note), change
   one ordinary CSS rule, then build and preview. Start the first-page timer
   when they open the generated project; stop it when the first working page
   appears. Record build/preview separately.
2. Add a small `/inventory` page with three local records, a category filter,
   and an empty result. A local array is enough; do not ask participants for
   credentials, a real checkout, or a backend. Note every Store reference
   file or pattern they choose to copy, and which setup steps they repeat.
3. Without direct URLs, ask them to locate the existing request, auth, and RTL
   lessons. Record the route/click path, elapsed time, failed searches and
   whether each answer was found.

Copy this blank record once per participant, using an anonymous ID and consent
for any optional screen recording:

```text
Participant ID / prior framework experience:
Tested commit / OS / Node / distribution mode:
Prerequisite setup minutes (separate from first-page time):
First working page minutes / component / CSS / build / preview result:
Inventory task completed? Steps copied from the Store reference:
Unclear error text or manual setup; exact command and file:
Request / auth / RTL lesson path, time, and missed attempts:
Observer interventions and production-only surprises:
Participant's preferred simplification, in their own words:
```

Summarize repeated issues only after 3–5 independent records exist. If at
least two participants encounter the same navigation problem, test a small
navigation change before splitting guides (P2). If at least two independently
repeat the same Store setup work, prototype the smallest opt-in starter and
compare its steps/build against the current path before C08 promotion. Keep
both TODO items open until those follow-up checks pass.

- C10 is not a V1 implementation task. `vd types` emits project-discovered
  request names with `unknown` values; `.velodom/features.json` protects files
  created by optional feature installers, not API-contract output. A separate
  local OpenAPI adapter would need a validated reference/media-type subset,
  deterministic ownership and refusal to overwrite user handlers; it must
  leave plain JS/manual routes valid and server validation authoritative. The
  [OpenAPI specification](https://spec.openapis.org/oas/) includes reusable
  references and security descriptions, so treating a document as a simple
  route-name list would be misleading. There is no local schema-backed
  consumer or usability evidence that warrants a generator or CLI command now.
  Revisit in a future major release after a real schema and ownership tests
  exist; no network fetch, package dependency or browser runtime is added.
- Current `reactive.ts` intentionally notifies shallow-state subscribers for
  each assignment; `watch` filters its callback after selecting the new value.
  The local rendering benchmark reports 100-binding median 7.294 ms and
  stable 160-item loop median 12.391 ms, while the browser-reachable package
  runtime is 370.9/380 KiB. These machine-local numbers do not prove a
  bottleneck or headroom for a dependency graph. Do not add required signals,
  deep observation, or a second tracking system without a traced workload,
  semantic/cleanup proof and measured net runtime-size benefit.
- Hybrid-rendering research triage found two existing, deliberately separate
  paths: build-only `config.prerender` emits public route HTML with client
  takeover, while `velodom/node` passes a Fetch request to an application
  handler and buffers its response. It does not render VeloDom templates or
  hydrate them. A public category/product page with bounded freshness can be
  rebuilt statically; current stock/pricing authority remains a live backend
  request. An authenticated account page needs per-request session/tenant
  isolation and private no-store headers, not a personalized static file.
  Combining those paths into framework SSR would require a server-only route
  renderer, deterministic expression/directive semantics, safe per-request
  data serialization, explicit cache policy, and a tested browser takeover or
  hydration boundary. The current package has none of that public contract.
  Keep static output the default and any future rendering integration in an
  opt-in server subpath; the present build-only path adds zero hydration
  runtime, whereas a new renderer has no measured budget or workload yet.
  No automatic SSR, route-mode flag, CLI prompt, or prototype is promoted.
- Islands/partial hydration would first need a reliable server-rendered or
  resumable fragment contract; VeloDom currently has neither. Folder and
  `.vd` pages already load route chunks lazily, and build-time static HTML is
  replaced on client takeover. Adding per-component bootstraps now would
  duplicate that path without a proven interaction/LCP gain. Any future
  prototype must use ordinary HTML, remain opt-in, and measure added browser
  bytes plus nested component/event/cleanup parity. No island syntax is added.
- The optional `velodom/node` bridge buffers a Fetch `Response` with
  `arrayBuffer()` and ends one Node response; it does not propagate streaming
  backpressure. Edge environments already expose their own Fetch request
  handler boundary and cannot import `node:http`. A future transport-specific
  adapter would need abort/backpressure/header/cookie tests against a named
  target, remain separately exported, and keep auth/cache policy application-
  owned. There is no target runtime or measured need here, so no adapter is
  promoted and no existing Node semantics are silently changed.
- `vd inspect css` already reports route attribution, duplicate rules,
  possible unused selectors, and RTL advice without rewriting output.
  Critical-CSS extraction would need the final Vite/Rollup CSS graph plus
  accurate cascade, media/supports, dynamic-class, font and route-ownership
  handling; source-level selector advice is not safe extraction input. No
  route-specific LCP measurement currently shows the build complexity is
  worthwhile. Keep this a separate opt-in build-plugin experiment after a
  reproducible slow route, preserving ordinary CSS and zero runtime cost.
- AI/provider and migration research: current `vd` intelligence and `vd fix`
  are deterministic, offline, and source-limited. A provider-based review/
  generation CLI would need explicit credentials/consent, redaction, local or
  custom provider support, reviewable diffs and no automatic source writes;
  it belongs outside required Core and has no demonstrated workflow yet.
  HTML/React/Vue migration would need representative fixture pairs, a
  documented unsupported-syntax report, and human-reviewed ordinary folder
  output; no compatibility runtime or guessed transformation is justified.
- CMS and locale research: `velodom/content` already accepts typed external
  records through an application-owned build loader; a vendor SDK would only
  add credential/deployment policy without a named consumer. The localization
  subpath produces explicit dictionaries, locale paths and SEO entries but
  intentionally does not choose a visitor's language. Cookie/domain negotiation,
  full ICU syntax and request-time translations require a server/product policy
  and separate privacy/cache tests. Keep both boundaries external until a
  concrete integration proves repetition that generic helpers cannot remove.
- Virtual-list and realtime research: C07's 160-item keyed-loop fixture
  measures update/correctness, not an accessibility-tested unbounded viewport;
  the Store already pages catalog and admin results. No virtualizer is justified
  without a real workload showing pagination inadequate and focus/screen-reader
  preservation. The Store backend fixture has no event stream. Native
  EventSource/WebSocket plus page-owned cleanup and explicit refetch would be
  the first application experiment; it must prove reconnect, session changes,
  missed-event recovery and bounded buffers before any reusable helper. Neither
  capability enters Core or the default starter based on this research triage.

### Strict local browser audit and form readiness — 2026-10-01

- The new `/forms` browser scenario originally typed after seeing a static
  heading. On one WebKit desktop run the HTML appeared before event binding,
  so the reserved-name assertion timed out. The browser test now waits for the
  reactive `Step 1 of 3` marker first; desktop WebKit passed twice afterward,
  and Mobile WebKit passed. No Core handler or application form behavior was
  changed for this test race.
- Chromium desktop/mobile passed previously on this exact C09 build. Strict
  Firefox locally still fails before any scenario because headless startup
  logs `RenderCompositorSWGL failed mapping default framebuffer` and times
  out. This is environment evidence, not proof of a Firefox framework bug or
  a passing release matrix. CI on the final commit is still required.

### Optional production diagnostics boundary — 2026-10-01

- C09 is an application-owned, unmounted recipe in the Store, not a Core
  collector, Lab production mode, CLI option, or required monitoring account.
  Public `requestHooks` and `errorBoundary` already provide the necessary
  integration points. A sink is explicitly supplied by the application;
  importing the helper or mounting the normal Store sends no telemetry.
- Only stable logical route/page names, diagnostic code/group, stage/outcome,
  ephemeral local correlation ID and duration can be emitted. No params,
  sessions, raw URLs, messages, source stacks, cart/payment data or response
  bodies cross the recipe boundary. A local ID is not a backend trace header;
  propagating one requires a separate backend contract. Private source maps
  and retention/consent policy belong to the chosen monitoring deployment.
- Abort/destroy release timer ownership. Both synchronous throws and rejected
  sink promises are contained so user actions and fallback UI are unaffected.
  Source tests include direct redaction fixtures and one real declarative
  request hook integration. CLI classification NONE; public Core/types/exports,
  templates, generated projects, npm contents and package version are unchanged.
  Current evidence: 431 source tests, docs/types/strict/lint, full build, six
  JS/TS starter combinations, both installed example consumers, desktop/mobile
  Chromium browser checks, 260.5/264 KiB total lazy teaching-site JavaScript,
  and both npm dry-run content/size gates pass. Firefox/WebKit and remote CI
  remain separate release evidence.

### Larger-project evidence and non-goals — 2026-10-01

- C07 uses the existing compiler cache and Vite build rather than a second
  dashboard. The fixed 80-page/32-component graph verifies 112 warm hits,
  one targeted invalidation, stable lazy production chunks and a base-path
  asset reference. First/repeated local build times are displayed as
  observations, not CI time thresholds because runner speed is variable.
- A 160-visit happy-dom test holds detached event elements to prove listeners
  are removed, and checks exactly one active page owner across deep links and
  session-guard changes. Existing 100-value/read page-data cache bounds and
  Store desktop/mobile browser paths remain dependent checks. This is not a
  160-route browser session or a memory-heap guarantee.
- The local catalog/admin service sample contains only fixture products and
  does not represent database latency, backend throughput or concurrent
  buyers. Server pagination and lazy routes remain the first scale tools;
  virtualization is not justified by this evidence. CLI impact NONE;
  package exports, types, dependency list, templates and published version
  do not change. The new benchmark runs in `benchmark:check` as part of
  `npm run build`, so structural failures block the existing build gate.

### Completed C06 native-form composition and event parity — 2026-10-01

- C06 is complete. The Store uses a small app-owned dirty baseline and the
  existing `router.beforeEach` contract. Rejected app navigation and Back keep
  both URL and draft; a confirmed departure releases its `beforeunload`
  listener. Browsers control whether a native unload dialog appears. Only real
  product fields affect dirty state, not the fixture response-mode selector.
- The optional progressive plugin already forwarded native multipart
  `FormData`; no JSON uploader was added. Two failing tests exposed missing
  detached-form abort and ignored-abort completion fences. It now observes DOM
  removals only while a form request is pending, aborts/removes that owner,
  suppresses late success/redirect, and clears loading on teardown. Server
  field messages receive stable IDs and `aria-errormessage` links without
  replacing authored descriptions. Redirect failure after an accepted submit
  leaves success visible; it does not claim rollback. `vd-form` and
  `vd-request` are alternative submit paths, as corrected in package docs.
- The blog's lazy `/forms` route is the application-owned recipe: two native
  editable steps plus a review, stable-key contact rows, touched feedback and
  one latest-only async check. It aborts on newer values/page cleanup and
  fences transports that ignore abort. Server validation remains authoritative.
  A schema adapter was evaluated and deferred because the reference cases do
  not justify a dependency or a Core form DSL. The browser check exposed the
  existing documented `$event` alias was unresolved in safe expressions; the
  evaluator now maps it to the current event and rejects state-style mutation.
  Direct expression, compiled DOM and production browser tests cover it.
- CLI classification NONE: no prompt, starter field policy, required schema
  package, new directive, export, dependency or version. The package docs and
  generated starters retain native form defaults; six JS/TS variants pass.
  The earlier edit/upload slice passed 422 source tests. Complete C06 now
  passes 426 source tests, docs/types/strict/lint,
  full build, six starter combinations, both installed real consumers,
  desktop/mobile Chromium including a dismissed unsaved-edit prompt, and npm
  dry-run content/size gates pass. The package is 335 files / 690.0 KiB
  packed / 2929.9 KiB installed; the create wrapper is 4 files / 1.7 KiB.
  Runtime budget is 370.9 KiB/380 KiB and blog JS is 127.5 KiB initial /
  259.5 KiB total. The optional lazy form lesson raised only the total blog
  JS budget from 256 to 264 KiB; the 130 KiB initial ceiling is unchanged and
  a chunk-isolation assertion proves the lesson stays lazy. Other engines and
  remote CI remain unverified here.

### Explicit page-data freshness and confirmed-write separation — 2026-10-01

- C05 closes on the existing loader/cache rather than a second request layer.
  `invalidatePageData(page?)` takes a discovered logical page name, clears all
  its query variants (or every page), and aborts matching explicit refreshes.
  It never fetches or remounts. `refetchPageData()` only reads the mounted
  loader, coalesces concurrent calls even without cache, and commits only
  current successful data to `state.data`. An initial navigation invalidated
  mid-read retries before committing. Refresh failure retains the last good
  value/draft; departure/destroy fence late ignored-abort results.
- The store keeps policy outside Core: accepted admin edits/bulk writes clear
  public catalog/product data; the private list refetches authoritative rows,
  totals and paging while preserving an unsubmitted filter draft. A post-write
  read failure leaves write success visible and retries only the GET. Rejected
  writes do not clear anything. Login/logout/expiry invalidate public page
  variants; private session and admin reads are never page-cached. The old
  manual bulk-row patch and one-off edit reload request were removed, while
  the named request route remains supported for other consumers.
- CLI classification DEFAULT_INCLUDED: methods ship on the existing app/
  context; no new prompt, template fetch policy, directive, package export,
  dependency, or version. Package-consumer smoke checks installed runtime and
  JS/TS context types. Generated Minimal/Blog/Empty projects require no
  migration. The blog's cache/reference lesson and repository/package/AI docs
  now teach the same explicit success-then-refresh contract.
- Verification: all 418 source tests pass, including eleven focused Core
  refresh and four real HTTP-consumer tests. Docs consistency, normal/strict
  type checks, lint, full build, six JS/TS starter combinations and both
  installed real consumers pass. The installed package smoke proves public
  invalidate/refetch behavior and context types. Desktop/mobile Chromium
  production journeys pass, including an accepted bulk write, failed GET,
  read-only retry and one-write assertion. Dry-run content/size gates pass:
  VeloDom 335 files / 687.6 KiB packed / 2920.4 KiB installed; create wrapper
  4 files / 1.7 KiB packed. JavaScript budgets pass at 126.8 KiB initial /
  250.4 KiB total blog and 368.4 KiB package runtime. Other browser engines
  and remote CI remain separate release evidence; no push/publish/version bump.

### Navigation ownership and loader cancellation — 2026-09-26

- Six initial regressions reproduced late template/CSS/data/init commits,
  cancellation after destroy and a blocked guard incorrectly affecting an
  accepted load. Each accepted replacement now owns its preparation/mount
  signal, separate from guard competition and the retained visible lifecycle.
  Preparation does not replace the visible page until its resources/data/module
  are ready. Hash-only navigation preserves the visible owner and cancels a
  pending replacement. Failed preparation cleans the old owner before fallback
  and aligns browser history; a departed async fallback cannot overwrite new UI.
- Async component cleanup captures the instances that load created, never a
  later query of the reused #app. Directives await asynchronous nested cleanup;
  loops register cleanup before mounting and do not report expected cancelled
  updates. Release attempts are isolated; destroy-before-onCleanup remains
  tested. Late cleanup registration observes async failure. User code ignoring
  abort may still write directly, and a non-settling user cleanup cannot be forced.
- One internal shared cancellation utility now coordinates request/page reads,
  observes late work and releases listener/subscriber ownership. The old request
  utility path and duplicate request-cache join helper were removed. Cached page
  subscribers have independent aborts; final cancellation aborts/fences transport.
  SWR belongs to the cache, not a departed page; app destroy aborts tracked work.
- Public type addition: optional PageDataContext.signal on client loads; build/
  server may omit it. No new exports, syntax, package dependency or version.
  CLI classification DEFAULT_INCLUDED, no prompt or generated controller/cache.
  Existing templates have no page-data fetch recipe to migrate; the store's
  loaders already forward signal. Package and handbook snippets/AI docs plus
  the blog quality lesson now explain the same ownership and limitations.
- Twenty-three regressions were added, existing cleanup-order tests retained,
  and the installed package smoke checks stale navigation plus optional signal
  typing. All 403 source tests, docs/types/strict/lint, full build, six starter
  combinations and both installed real consumers pass. Desktop/mobile Chromium
  production flows also pass, including delayed catalog → cart cancellation.
  Other engines and remote CI remain separate release evidence. Both package
  content/size gates pass: VeloDom 332 files / 682.6 KiB packed / 2897.8 KiB
  installed; create wrapper 4 files / 1.7 KiB packed. Bundle budgets pass at
  124.7 KiB initial / 247.0 KiB total teaching-site JS and 363.0 KiB package
  runtime source; no speed improvement claim. No push/publish/version change.
- C05 remains open for explicit public invalidation/refetch and the real
  mutation-success recipe. The 4/10 commerce counter is unchanged; its stale
  section-local 3/10 display was corrected to match already completed C04.

### Bounded public page-data freshness — 2026-09-26

- Seven failing regressions exposed duplicate cold/SWR loads, an unhandled
  background rejection, no invalidation fence and unbounded retained/tracked
  values. The existing opt-in cache now retains 100 LRU values, tracks 100
  pending identities, prunes expiry and bypasses storage when tracking is full.
  Matching reads share work; uncached loaders remain independent. No second
  fetch engine or default/global data service was introduced.
- Successful background refresh is still next-visit only. Failure is observed
  without changing loadedAt; after the original stale window the normal awaited
  read/error boundary handles failure. Tests also cover an explicitly non-finite
  stale duration that the old `|| 0` default silently accepted.
- Private internal clear(page?)/clear-all fences old completions without
  discarding original caller results; app destroy clears cache identities.
  These are not new public imports or a documented application refetch API.
  Navigation cancellation and explicit public invalidation/refetch remain
  separate C05 work. Keep session/admin/immediately write-sensitive data
  uncached. Request-cache invalidation never implies page-data invalidation.
- The superseded refresh helper was removed rather than retained alongside
  another implementation. Core types describe the same existing cache policy;
  package exports, compiler syntax, dependencies and versions are unchanged.
- CLI classification: NONE. Templates do not opt into page-data cache; the
  store's public home loader keeps its existing 5s/15s policy and private
  loaders remain uncached. Blog/store docs, package syntax/inventory/AI guides
  and the handbook teach the same lifetime/failure and API limitations.
- Thirteen new source regressions include public createApp SWR/teardown; a
  tarball consumer checks the compiled public app against the same failed
  background refresh/recovery sequence using the existing DOM test environment.
- Verification: all 380 tests passed, including the thirteen new cases;
  docs/types/strict/lint, full builds, installed runtime smoke checks, six
  generated starters and both installed real consumers passed. Desktop/mobile
  Chromium production flows and package content/size gates passed. VeloDom's
  artifact contains 332 files / 673.0 KiB packed; the creation wrapper contains
  4 files / 1.7 KiB packed. Bundle budgets passed (120.6 KiB initial / 242.3 KiB
  total teaching-site JS). Rendering benchmark timings varied under local load;
  no speed improvement or backend-scale performance claim is made.
- The next router audit independently reproduced a remaining defect with an
  uncached slow loader: navigate /slow, await /fast, then resolve /slow →
  heading changes from "Fast page" to "Obsolete slow page", URL remains /fast,
  and the obsolete navigation returns true. The data context has no signal.
  This was not repaired by cache coordination; C05 remains open for navigation
  ownership/cancellation and the explicit mutation/refetch contract. Other
  browser engines still require separate strict release evidence. No publish,
  push, dependency change or version bump was performed.

### Unified retry and middleware cancellation — 2026-09-26

- Source tests reproduced pre-aborted handler execution, repeated AbortError,
  next attempts after cancelled retry waits, delayed middleware reaching a
  handler after cancellation, and middleware wrapping aborts as failures.
  Another test proved a disposed binding still emitted success/afterRequest
  after an awaited callback. These were control-flow bugs, not backend policy.
- `requests/cancellation.ts` now owns the common cancellation classifier,
  active check and abortable wait. The old declarative wait was moved here and
  the optional wrapper's uncancellable timer was removed. Middleware checks
  each dispatch and final completion; it preserves the original AbortError.
  The wrapper checks before attempts and after successful handler completion.
  The declarative runtime rechecks binding ownership after async onSuccess.
- Cancellation strings are centralized in Core constants. Declarative waits
  keep their original Error shape; the cache keeps its DOMException shape for
  compatibility while sharing the same name/message. No runtime export,
  signature, dependency, syntax, automatic retry policy or starter changed.
- Cancellation releases wait timers/listeners and prevents later operations;
  it cannot undo accepted server writes, already-applied state, or custom work
  that ignores a signal. Backend status/idempotency and app-owned refetch remain
  necessary for ambiguous outcomes. Existing signal/predicate contracts remain.
- CLI impact is `NONE`: no global feature/configuration or creation prompt is
  needed. Templates do not actively use the optional wrapper. Root/package/AI
  docs and the blog cache lesson now teach cancellation and signal forwarding;
  installed-package checks also exercise the real wrapper.
- C05 stays open for router loader cancellation, page-data freshness/coalescing/
  invalidation and complete catalog/admin/account refresh evidence.
- Verification: all 367 automated tests passed (twelve new regressions), as did
  docs/types/strict/lint, the full build, six installed starter combinations,
  both installed reference consumers, public runtime retry/cache smoke tests,
  and performance budgets. Dry-run artifacts passed at 332 files / 670.5 KiB
  packed for VeloDom and 4 files / 1.7 KiB for the creation wrapper.
- One mobile browser run selected an unbound checkbox while the table caption
  was already visible. The same target passed on replay without source changes,
  confirming nondeterministic readiness rather than a reproduced cancellation
  defect. The administration E2E now waits for its mounted locale component
  after edit/list navigation and asserts selection text before opening the
  dialog; it does not force clicks, extend timeouts or ignore errors.
- The corrected full desktop/mobile Chromium production matrix and final
  docs/types/strict/lint checks passed. Other browser engines and remote CI are
  separate release evidence; no version change or publication was performed.

### Request-cache concurrency and invalidation — 2026-09-26

- C05's first implementation scope is the existing opt-in request helper.
  Five failing regressions proved invalidated reads could repopulate cache,
  parallel GETs were duplicated, account switch-back could reuse stale work,
  headers/credentials collided, and retention was unbounded.
- One `requests/request-cache.ts` module now owns coordination, while
  `request-tools.ts` keeps the compatible re-export. The old implementation,
  key/cacheability helpers and unused imports were removed. All HTTP work still
  uses `requests/http-client.ts`; no second fetch engine, global listener or
  automatically enabled cache was introduced.
- `maxEntries` bounds LRU results and tracked reads; saturation bypasses caching.
  Default capacity is 100. Legacy zero TTL still means until clear/eviction;
  finite TTL is recommended. Each read has per-consumer cancellation and one
  transport controller; the final abort cancels transport and fences completion.
- Identity includes explicit application scope, headers and credentials.
  Scope changes and `clear` detach pending entries, preventing late cache
  repopulation even after switching back or starting a newer same-key read.
  Original callers still receive awaited results and own UI identity checks.
  Custom/legacy base keys remain accepted by `clear`.
- Session/no-store endpoints in the store remain uncached. The JSON helper
  cannot infer response cache policy or HttpOnly-cookie changes; private read
  caching requires explicit backend/application permission, identity scope and
  logout invalidation. No automatic auth observer or page-cache invalidation
  is claimed. The separate router/page-data/SWR and retry-wait audit is still
  open; C05 is not marked complete.
- CLI impact: `NONE`. Templates contain no active use of this optional cache
  and need no global configuration or dependency. The installed fixture checks
  option declarations; examples and package/root/AI docs teach the same finite
  cache, explicit invalidation and private-session boundary.
- Verification: all 355 automated tests passed, including ten new focused
  cache regressions; docs/types/strict/lint and the full build passed. The local
  artifact's runtime/declarations, six starter combinations and both real
  consumers passed installed-package checks. Performance budgets passed with
  119.7 KiB initial and 240.2 KiB total teaching-site JavaScript. Artifact gates
  passed at 329 files / 667.8 KiB packed for VeloDom and 4 files / 1.7 KiB for
  the creation wrapper. This is local evidence, not publication or remote CI.
- The installed artifact also passed a real `velodom` import smoke test for
  concurrent GET coalescing and pending-write invalidation. Desktop/mobile
  Chromium production flows passed after the cache change. Other browser
  engines still require their separate strict release matrix.

### Feature-owned application organization — 2026-09-26

- C04 documents the existing page/component/layout/API discovery and ordinary
  explicitly imported `src/domain` modules. Shared modules never depend on
  page scripts. Catalog/cart/auth/admin/backend boundaries remain app-owned;
  no registry, DI container, global store requirement or Core policy was added.
- App-owned `.d.ts` contracts describe cart/session/quote/order DTOs for the
  JavaScript HTTP wrapper and optional TS callers. JSDoc response assertions
  are static documentation, not response validation; backend validation and
  authorization tests remain authoritative. The original optional-input
  behavior of the wrappers is retained.
- Browser env values (`VITE_*`) are public. Static `dist` output does not deploy
  the local backend. Root hosting is the example default; Vite asset base does
  not supply an undocumented route-prefix API. Subdirectory deployments must
  coordinate route config, links, SEO, API/proxy paths and hosting explicitly.
- CLI impact is `NONE`. Existing `inspect`, `routes` and `doctor` provide the
  analysis. The local-tarball gate now copies both real consumers outside the
  workspace and runs installed analysis/builds plus strict JS/TS contract and
  handbook-snippet checks. Tooling dependencies are reused locally without a
  registry download; VeloDom itself comes only from the installed artifact.
- No implementation was superseded, so no compatibility code was removed.
  Two missing explicit noopener attributes were fixed after installed doctor
  exposed them. Remaining unused-handler/large-template warnings are advisory,
  not grounds for deleting programmatic request handlers or teaching content.
- Verification: all 345 automated tests and docs/type/strict/lint gates passed;
  the six starter combinations and both installed reference consumers passed.
  The teaching site has 7 routes and one advisory template-size finding; the
  store has 9 routes and seven advisory dynamic/unused-handler findings.
  Both production builds and artifact-content gates passed (326 VeloDom files,
  662.6 KiB packed; 4 create-wrapper files, 1.7 KiB packed). This is local
  source/package evidence, not publication or remote CI approval.
- Production browser verification passed in desktop Chromium and mobile
  Chromium, including the store HTTP/session/admin flows. Firefox/WebKit were
  not selected for this local run; the strict remote release matrix remains a
  separate gate rather than being inferred from these results.

### Replaceable backend/session contract — 2026-09-24

- `src/api` remains a browser request convention. The store's new `server/`
  fixture is connected only through Vite dev/preview and the repository browser
  harness; its session signing secret and Node imports are rejected if they
  appear in browser build assets. Production consumers replace the fixture with
  their own backend rather than moving trust into Core.
- The server independently enforces HTTP-only sessions, expiry, role, resource
  ownership, tenant scope, CSRF, optimistic revisions, authoritative USD price,
  stock and tax, and order state. Private responses are `private, no-store` and
  vary by cookie. Mock order creation requires an idempotency key, rejects
  submitted-total tampering and duplicates, and never imports a payment SDK.
- The public UI adds a no-index session fixture page, guard-protected admin
  routes, server-backed catalog/cart/admin loaders, and a no-charge mock order
  result. Client guards are documented as usability only. CLI impact is
  `NONE`: this is an application integration example, not a generated starter
  or new public framework capability.
- Replaced the superseded local `createMockCheckout()` path and its test with
  server-contract coverage. The new tests exercise denial, expiry/logout,
  account replacement, private cache headers, total tampering, idempotency,
  resource isolation, and cancellation; the browser gate crosses the actual
  Node HTTP adapter for customer checkout and guarded administration.
- The completion audit added a concurrent duplicate-write regression: the
  idempotency decision now occurs after async quotation, immediately before the
  single-process commit. The backend repeats order-role checks, rejects invalid
  quantities, and validates aggregated duplicate-option stock. Real backends
  still need an atomic database/provider idempotency contract.
- Passed the full source/type/lint documentation checks, all 343 baseline tests
  plus the two additional contract regressions, the installed package/six-starter
  build matrix, both example builds, performance gates, desktop/mobile Chromium,
  and the real npm dry-run content/size audit. Browser checks reject server-only
  markers and keep expected 409/500 logs confined to the intentional edit
  recovery scenario.

### Administration workflow over the shared store domain — 2026-09-24

- Extended `examples/velodom-store` instead of creating a second admin consumer
  or copying product data. A small application-owned catalog repository now
  supplies both public reads and administration writes; no data grid, CRUD
  directive, persistence layer, or global-store requirement entered Core.
- Added a separate `admin.vd` layout and list/detail/edit routes. Search and
  pagination remain URL-backed; edits use native named controls, `vd-model`,
  `vd-validate`, `vd-request`, and automatic request status. CLI impact is
  `NONE`: C02 validates current public V1 authoring contracts and is not a new
  starter option.
- Administration writes compare an expected revision. Failure and conflict do
  not overwrite the page-owned draft; users can explicitly load the latest
  record and retry. A native dialog gates bulk publish/archive actions. Focused
  status nodes, keyboard-native controls, semantic HTML, and text status labels
  make outcomes observable without relying on color.
- The browser journey exposed a form-test race with static SEO fallback and
  asynchronous page mounting. The gate now waits for the shared mounted
  component before editing model-bound fields. It also verifies the form's
  actual `FormData` before navigation. Expected request failures are ignored
  only inside this recovery scenario; unexpected console errors still fail it.
- C02's application behavior has five deterministic domain tests and a real
  Chromium flow covering search, transport failure, revision conflict, reload,
  success, focus restoration, and bulk confirmation. The milestone remains
  open in the roadmap because its acceptance deliberately delegates real
  authorization denial to C03's HTTP/session fixture.

### Storefront reference consumer and component direction parity — 2026-09-21

- Added `examples/velodom-store` as a separate private workspace consumer. It
  imports only public VeloDom paths and keeps all catalog, cart, checkout,
  persistence, and presentation policy application-owned. CLI impact is
  `NONE`; C01 validates current V1 and deliberately adds no Store starter yet.
- The guest cart stores only a versioned list of product/variant ids and
  quantities. Every display and mutation requotes mock backend records, and
  the checkout handler clearly creates no transaction. Real authorization,
  stock, price, tax, payment, and idempotency remain backend responsibilities.
- Browser validation revealed that the direction controller was attached to
  page context but omitted when component context was derived. Documentation
  already promised page/component access. The runtime now forwards the same
  optional controller and public types describe it; a focused regression proves
  component access and cleanup remains plugin-owned.
- Reused the existing production browser harness instead of adding another
  runner. Desktop and mobile Chromium cover URL filter order, Back/Forward,
  direct product links, keyboard cart entry, refresh persistence, blocked
  storage, cart quotation, mock checkout, horizontal overflow, and RTL.
- Added five deterministic storefront domain tests. The package build, store
  production build, Core direction tests, quality checks, and desktop/mobile
  browser journeys passed. Commerce roadmap progress is 1/10 (10%).

### Development and production parity audit — 2026-09-21

- Replaced the manually duplicated package-consumer beginner fixture with the
  literal two snippets parsed from the educational homepage. The installed CLI
  still creates the documented component, which is appended to that copied
  page before the installed package builds it.
- Added focused production assertions for the public favicon, taught component
  text, scoped component CSS, and actual `src`/`href`/CSS asset URLs. Internal
  `/src/` discovery keys remain valid runtime metadata and are deliberately not
  confused with browser asset URLs.
- Audited existing coverage instead of adding a second environment harness:
  Vite tests cover development transform/cache invalidation and `.vd` virtual
  modules; integration tests cover layouts/scoped CSS/recovery; the production
  browser gate covers imported logo assets, layouts, direct route/hash entry,
  requests, article reload recovery, and lazy `.vd` behavior. The installed
  tarball matrix covers all six starter/language combinations.
- No runtime/compiler/type/export/CLI command/template source behavior changed.
  CLI impact is `NONE`; the repository-only installed consumer became stricter.
  The temporary retained failure fixture used to classify internal keys was
  deleted after the asset-URL rule was corrected.
- The installed package consumer and all six starter builds passed after the
  refinement. Earlier in this sequence, full quality/build/performance and
  desktop/mobile Chromium gates passed. Simplicity progress is now 6/8 (75%).

### Common list and form recipes — 2026-09-21

- Replaced the teaching site's verbose single-record request snippet with a
  common list recipe based on `vd-target` and `vd-auto-state`. Loading, error,
  empty, and success presentation stays in semantic HTML; no directive or
  request engine was added.
- The audit exposed a non-obvious authoring requirement: an inner `vd-for` is
  evaluated independently, so its source must remain iterable before the first
  result. Current teaching uses `result?.items || []` and documents why rather
  than hiding the behavior behind a new runtime abstraction.
- Expanded the progressive-form snippet with native constraints, an associated
  field-error node, and live status text. Server validation and policy remain
  application/backend responsibilities.
- Added integration tests that read, compile, and execute the literal snippets
  shown on `/features`, preventing documentation-only copies from drifting.
  The production playground reuses the same state pattern and exposes success,
  empty, and explicit failure controls; browser release coverage exercises the
  non-error states so expected console errors are not globally ignored.
- Removed the superseded playground `lessonResult`, `lessonLoading`, and
  `lessonError` state and old single-record controls. `articles.getOne` remains
  required by the dynamic article page; `articles.list` reuses the existing
  article collection for the list-state lesson.
- Passed the two new recipe tests, full quality/type/lint checks, installed
  package and six-starter builds, production documentation build, compiler and
  rendering benchmarks, performance budgets, and desktop/mobile Chromium
  journeys. Simplicity progress is now 5/8 (62.5%).

### Verified beginner journey — 2026-09-21

- Made Minimal + JavaScript + ordinary CSS the explicit package Quick Start
  path without changing the interactive Recommended defaults or removing
  TypeScript, Tailwind, folder, `.vd`, or alias choices. The interactive route
  tells beginners exactly which Customize selections produce the same project.
- Generated Minimal READMEs now put an ordered page/component/CSS/build/preview
  journey before optional tooling. Blog and Empty READMEs retain a shorter
  starter-specific editing path instead of teaching files they do not own.
- Extended the installed-tarball consumer gate: the generated Minimal JavaScript
  project runs the installed `vd create component welcome-note`, receives the
  taught page/script, passes the private-import sweep, and builds production
  output. Existing six-case JS/TS/starter matrix and size limits remain intact.
- No directive, runtime, compiler, type, export, dependency, package version,
  starter source, or browser payload changed. The change is scaffolder guidance,
  package documentation, and verification only; CLI impact is
  `DEFAULT_INCLUDED` for generated README content, with no new flag or command.
- Passed the 22 focused CLI tests, strict package typecheck, and installed
  package/starter consumer gate. The six generated builds remain below their
  existing JavaScript budgets. Browser tests were not rerun because the lesson
  changed generated documentation/test fixtures rather than browser runtime.
- Simplicity progress is now 4/8 (50%). Independent user observation remains
  open and is not claimed by automated validation.

### Commerce and large-application roadmap review — 2026-09-17

- Documentation-only planning: added ten prioritized proposals with ownership,
  value, relative complexity, CLI classification, and acceptance criteria in
  `TODO.md`. New progress is 0/10; completed implementation and simplicity
  counters are unchanged. No feature, public API, syntax, starter, or version
  was implemented or changed by this review.
- Existing routing/layouts, optional shared state, requests/auth, cache/retry,
  native validation, localization/RTL, static SEO, diagnostics, and tooling are
  reused rather than re-listed as missing services. The initial work validates
  a store/admin application on current V1, not a redesign of Core.
- `src/api` in a frontend project is not a server security boundary. Backend
  contracts own authorization, session and tenant isolation, authoritative
  prices/stock, idempotency, payment verification, and durable order state.
  OWASP/Stripe primary references are linked in TODO as rationale, not as a
  vendor choice, financial/compliance certification, or new package dependency.
- The full educational blog remains a teaching consumer. New commerce examples
  and optional starter choices are future work; the package feature inventory,
  syntax docs, AI contract and current example content intentionally do not claim
  their existence. C05/C06 extend existing request/forms contracts only after
  real recipes demonstrate missing generic behavior.
- Retained the feature-expansion freeze while beginner validation is incomplete.
  V1.x data/forms/production hooks require tests and runtime budgets; later-major contract
  generation stays build-only. Existing SSR research gained commerce acceptance
  cases rather than a duplicate checklist; realtime and virtual-list exploration
  remain optional research with explicit native/pagination alternatives.

### Repository organization and teaching entry point — 2026-09-17

- Kept the current ownership boundaries: publishable framework and its own build
  scripts under `packages/velodom`, a thin npm-create wrapper next to it, optional
  editor tooling as a private workspace, and the full educational website under
  `examples/velodom-blog`. Moving tests or that site into the npm package would
  increase installed weight rather than simplify consumers.
- Grouped ten maintainer scripts by package, quality, browser, and performance
  responsibility. Updated root npm commands, relative imports, fixtures, and CI;
  public framework/CLI entry points did not move. CI now also runs Node regressions
  and the actual two-artifact size/content audit. No workflow was dispatched here.
- Fixed ESLint globs left over from old root `scripts`/`test` folders. All current
  maintenance scripts/tests/helpers now enter lint. This exposed one ambiguous
  regex-spacing warning and ANSI test regexes; use counted spaces and Node's
  `stripVTControlCharacters` without changing the tested behavior.
- Removed the duplicated rolling history from the root README; existing
  CHANGELOG/NOTES retain the decisions. README decreased from 24,073 to about
  10,131 bytes (approximately 58%). This is documentation reduction, not a claim
  that relocating scripts shrinks application bundles.
- `pack:report` inspects npm's JSON dry-run for both packages, checks manifest
  entry targets and allowlisted content, rejects known nested private/generated
  paths, and applies bounded size/file-count limits. It shares one pure audit
  helper with regression tests. This is not a general credential/content scanner.
  Expanded Git ignores cover tarballs, incremental builds, and browser reports.
- Current measured artifacts: `velodom` 326 files, 658.6 KiB compressed,
  2812.5 KiB unpacked; `create-velodom` 4 files, 1.7 KiB compressed, 3.0 KiB
  unpacked. Small package-doc clarifications slightly increased package bytes;
  no runtime bytes were removed or added. Embedded source maps account for
  1769.4 KiB unpacked and are deliberately retained for useful debugging.
- The homepage now teaches one two-file interaction before the feature catalog,
  distinguishes the full teaching site from the generated Blog starter, and
  states the V1 SSR/hydration boundary honestly. The actual displayed snippets
  are parsed, compiled, mounted, and clicked by a regression test, not copied into
  an unrelated test fixture. Code remains literal-safe under `vd-pre`.
- Root-hash documentation checks now validate the target against actual homepage
  IDs rather than rejecting every `/#...` link, allowing the new lesson link
  while continuing to catch misrouted feature-section anchors.
- CLI impact: `NONE` for the framework CLI and starter prompts. The new npm
  maintainer commands are `pack:report` and `browser:check`. No source APIs,
  syntax, exports, dependencies, version, starter ownership, or legacy aliases
  changed. Templates were inspected unchanged; six generated combinations passed.
- Passed: 326 Node tests, documentation/header checks, normal/strict types, ESLint,
  complete production build, package/installed-consumer checks, all six starter
  builds, packed npm-create wrapper, both artifact audits, compiler/render
  benchmarks, and browser/runtime size budgets. Browser journeys passed for
  Chromium and WebKit desktop/mobile, including literal homepage snippets.
- Browser startup/CI limits remain: Firefox was not rerun in this maintenance
  pass because of the previously recorded local graphics failure; the full
  five-target Linux workflow must still run on the exact release commit. The
  long static feature guide's advisory remains explicit. No push/publication.
- The V1 simplicity track is separately counted at 3/8 (37.5%): remaining work
  covers a beginner journey, common recipes, missing dev/production parity,
  independent-user observation, and an evidence-led lesson split. Research
  proposals remain research instead of being silently added to Core.

### Audit verification — 2026-09-17

- Passed: 320 Node tests (eight new regressions), documentation consistency,
  JSDoc/header checks, normal/strict type checks, ESLint, production build,
  package contracts, both package tarball checks, six installed starter builds,
  compiler/render benchmarks, and runtime/bundle budgets.
- Contract coverage remains 14 package exports, 80 public values, 43 preferred
  directives, and 25 CLI commands. The roadmap export list now participates in
  the documentation gate, including the previously omitted `velodom/pwa`.
- Browser journeys passed for desktop/mobile Chromium and desktop/mobile
  WebKit, including ARIA/CSS binding updates, loaded production logos, navigation,
  and horizontal-overflow checks. Visual inspection also covered a 319px-wide
  page and a 1280x540 desktop sidebar (scrollable and contained in the viewport).
- The full five-target attempt was not green: local Firefox timed out during
  launch with `RenderCompositorSWGL failed mapping default framebuffer`, before
  any application page opened. Do not infer Firefox compatibility from the
  other engines; run the unchanged strict Linux CI workflow on the release commit.
- `vd check --root examples/velodom-blog --json` passes with one non-blocking
  large-template advisory for the approximately 35 kB static feature guide.
  No threshold was raised and no warning was suppressed to obtain that result.
- Source cleanup was evidence-based. Compatibility aliases and unrelated user
  files were preserved; package versions/dependencies/exports did not change.
  These local results are not publication approval or proof of registry state.

### Consistency audit decisions

- CLI impact: `DEFAULT_INCLUDED`. Help/error/presentation fixes need no new
  project option. Starter CSS is generated once by the shared scaffolder for
  Minimal/Blog/Empty, JS/TS and CSS/Tailwind combinations; no copied template
  matrix is introduced. Existing generated applications remain user-owned.
- Navigation analysis reuses compiler attributes to distinguish literal
  `href` values from `vd-bind:href`, aliases, and attribute maps. It does not
  execute user expressions to guess a destination.
- ARIA boolean attributes use string tokens; generic HTML boolean attributes
  retain their established presence/removal semantics. Both preferred syntax
  and compatibility syntax reach the same binding runtime.
- Diagnostic snapshots omit input/option values and textarea content. This is
  not a general secret scrubber: application error messages, expressions, and
  other markup can still contain sensitive data. Do not put secrets there or
  forward raw diagnostics to telemetry without application-owned filtering.
- Cleanup replaces the incorrect navigation regex, duplicate scaffolder flag
  allowlist, and local stale-style bookkeeping; no unknown module or compatibility API is removed. TypeScript
  declarations and public exports require no new application-facing API.

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
  smoke suite defaults to required desktop/mobile Chromium profiles. Firefox
  and desktop/mobile WebKit remain explicit optional local targets and strict
  CI targets, avoiding a leaked local Firefox launch process when a machine's
  compositor cannot start. Selected optional targets are skipped when they
  cannot launch unless `VELODOM_BROWSER_STRICT=1` is set.
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
  `tools/scripts/quality/check-core-docs.mjs` audit is part of the normal quality gate and
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

- Runtime diagnostics use stable `VD_*` identities, five bounded owner groups,
  normalized source frames, and explicit application/page/component/request
  ownership. The reporter retains no history; only an explicitly mounted
  `velodom/devtools` overlay keeps a bounded development list. That overlay is
  observational and intentionally provides no retry or recovery controls, so
  the existing application `errorBoundary` remains the sole recovery owner.

- The showcase performance gate distinguishes the initial entry graph from all
  lazy documentation routes using emitted VeloDom build metadata. Initial code
  stays under a tighter 130 KiB cap; total lazy JavaScript keeps a 256 KiB
  repository ceiling. This prevents educational content from being mistaken
  for startup cost without removing the aggregate regression guard.

- Plugin manifests are optional advanced metadata, not a new plugin registry.
  CLI impact is `NONE`: project creation needs no prompt or generated file.
  Runtime managers statically require a declared `browser` capability only
  when a manifest exists; legacy manifest-free function/object plugins stay
  compatible. Conformance validates a bounded semver range subset, host
  capabilities, duplicates, and named conflicts without importing, installing,
  discovering, or executing third-party packages.

- Browser/performance/starter verification remains repository tooling and adds
  no runtime service. The browser matrix now exercises desktop and mobile
  Chromium separately, while Firefox and desktop/mobile WebKit stay strict CI
  targets; any unexpected page or console error fails its step. The installed
  tarball generates six starter/language combinations and checks their actual
  build sizes. Package runtime budgets traverse imports from `velodom` and
  `velodom/vite`, so optional compiler, Node, CLI, devtools, and build modules
  are no longer misclassified as application startup code.
- The `0f935aa` strict Linux browser run passed, but the next documentation-only
  `7934bba` run failed in the browser step while build, regression tests, and
  package audit passed. This is not enough evidence to classify a framework
  regression or an environmental flake. The public job API exposed only a
  generic exit-code annotation and required authorization for its detailed
  log. Repository browser tooling now emits one concise annotation per failed
  target, excluding page-body snapshots. Diagnose the next strict run from
  those annotations before changing runtime behavior or closing the release
  gate. CLI impact: `NONE`; no generated-project or npm package file changes.
- The follow-up `d98aaac` [strict Linux run](https://github.com/NadiaSalah/VeloDom/actions/runs/36876173251)
  succeeded for build, regression tests, artifact audit, and all five browser
  targets. Local `npm run pack:check` on that clean commit passed the packed
  `velodom` and `create-velodom` consumers, all six generated starter variants,
  and size/content budgets (335 files / 690.8 KiB packed for `velodom`; four
  files / 1.7 KiB for `create-velodom`). The prior one-off browser failure's
  root cause remains unknown; a passing rerun alone does not diagnose it.
  The public npm registry snapshot on 2026-10-01 has an unpublished `velodom`
  tombstone and no active dist-tag; `create-velodom` returns 404. npm's immutable
  name/version policy prevents reusing `velodom@1.0.0`. Do not bump the
  manifests, publish, or tag without the owner's version/release decision;
  rerun the full gate on the selected publishable version. The owner decided
  on 2026-10-01 to keep both local manifests at `1.0.0` and defer publication;
  this is a deliberate release pause, not a passed registry gate.
- A later documentation-only `28a501d` [strict run](https://github.com/NadiaSalah/VeloDom/actions/runs/36878886713)
  failed in WebKit's `storefront-administration` step after navigating to
  `/admin/products/focus-timer`; the public annotation reported a 30-second
  wait for updated page text. One verbose and four repeated local WebKit runs
  passed, so neither a stable runtime defect nor a harmless CI flake is
  established. The browser gate now observes the private detail GET after an
  accepted save, asserts that its response contains the saved name, then waits
  for the matching detail heading. The backend HTTP test separately proves
  post-write detail freshness and `private, no-store` headers. This is a
  diagnostic/contract strengthening, not a timeout increase or a claim that
  the intermittent root cause is fixed. CLI impact: `NONE`; Core, templates,
  package exports, and generated projects are unchanged.
- The test-bearing `7e33aba` [strict Linux run](https://github.com/NadiaSalah/VeloDom/actions/runs/36881005404)
  passed build, regression tests, package audit and all five browser targets.
  This confirms the stronger read/render assertion runs in CI; it does not
  explain the earlier one-off timeout or authorize the deferred npm release.
- The following documentation-only `e0a25c3` [strict Linux run](https://github.com/NadiaSalah/VeloDom/actions/runs/37118083064)
  failed WebKit's Store administration step: the captured private detail GET
  contained an older product after the accepted write. The `requestJson` type
  accepted `RequestInit` options but runtime passed only method, headers,
  signal, credentials, and body, silently dropping `cache`. Forwarding those
  options is a confirmed Core correction. The Store now uses explicit
  `cache: "no-store"` on private reads while retaining server no-store headers.
  The browser gate captures the GET started by detail navigation (rather than
  any earlier matching response) and includes revision/cache source in failure
  diagnostics. This could remove either client HTTP reuse or a false-positive
  response match; only repeated strict CI can establish whether an additional
  stale-read defect remains. CLI impact: `NONE`; templates/generated projects
  require no change, and package exports/versions are unchanged.
  Local verification: 434/434 source tests, production build (including
  declarations, both installed consumers, six starter combinations, and
  performance budgets), plus Chromium and WebKit browser journeys passed.
  This is not a substitute for the Linux five-target gate.
- The correction's `9a8805f` [strict Linux run](https://github.com/NadiaSalah/VeloDom/actions/runs/37120151272)
  passed build, regression tests, npm artifact audit, and all five browser
  targets, including WebKit desktop. This is strong regression evidence, but
  the earlier failure was intermittent; it does not by itself isolate the
  cause conclusively. The [documentation-only follow-up](https://github.com/NadiaSalah/VeloDom/actions/runs/37120747591)
  also passed the full five-target gate. No npm publish or tag occurred.

## Handoff Guidance

1. Read `README.md`, then `TODO.md`, before changing framework APIs.
2. Add framework behavior to `packages/velodom/src` only when it is generic across sites.
3. Keep domain-specific examples in the blog application folders.
4. Add a regression test for every core bug.
5. Run `npm test` and `npm run build` before committing.
6. Update README, TODO, this file, and CHANGELOG when decisions or milestones
   change.
