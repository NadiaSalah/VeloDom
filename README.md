# VeloDom

<p align="center">
  <img src="docs/assets/VeloDom-logo.svg" alt="VeloDom logo" width="260">
</p>

VeloDom is an HTML-first, compiler-first frontend framework for lightweight,
folder-first web applications. Framework internals are TypeScript; application
authors can use Vanilla JavaScript or TypeScript without JSX, TSX, a virtual
DOM, or a required global store.

Repository: [github.com/NadiaSalah/VeloDom](https://github.com/NadiaSalah/VeloDom)

## Documentation

Documentation has one responsibility per location:

- [Repository handbook](docs/README.md): detailed architecture, examples,
  deployment, and framework-development guidance.
- [Package quick start](packages/velodom/docs/QUICK_START.md): smallest verified
  consumer path.
- [Canonical syntax](packages/velodom/docs/SYNTAX_REFERENCE.md): implemented
  public authoring syntax.
- [Feature inventory](packages/velodom/docs/FEATURE_INVENTORY.md): stable,
  supported, partial, and legacy status.
- [AI context](packages/velodom/AI_CONTEXT.md) and
  [AI guide](packages/velodom/docs/AI_GUIDE.md): compact local context shipped
  with npm.
- [Roadmap](docs/TODO.md), [changelog](docs/CHANGELOG.md),
  [decisions](docs/NOTES.md), and [release policy](docs/RELEASING.md):
  repository-only maintenance records.

The old root `docs/AI_CONTEXT.md` was removed. Its authoritative replacement is
inside the publishable package, so humans, generated projects, and AI coding
assistants all resolve to the same installed documentation.

## Technology

- TypeScript framework source and generated ESM declarations
- Vite compiler/build integration
- ESLint and Node.js test runner
- Playwright browser verification
- Tailwind CSS and daisyUI only in the documentation blog consumer
- ordinary CSS only in the separate storefront/administration reference consumer

## Run the Workspace

```bash
npm install
npm run dev
npm run dev:store
```

Verification:

```bash
npm test
npm run check
npm run typecheck:strict
npm run build
npm run pack:check
npm run benchmark:compiler
npm run benchmark:rendering
npm run benchmark:check
```

The root development command builds the package and starts
`examples/velodom-blog`. Generated `lib`, `types`, `dist`, and `node_modules`
content is recreated by npm scripts and is not hand-edited.

## Create a User Project

The repository contains the dedicated `create-velodom` package required by
npm's `create` naming convention. After the first official V1 release makes
both packages available, the primary interactive command will be:

```bash
npm create velodom@latest
```

After release, the `velodom` package also exposes the explicit generator form:

```bash
npx --yes --package velodom create-velodom my-app --no-install
cd my-app
npm install
npm run dev
```

From this source checkout, build the package and invoke the same generator
without relying on registry state:

```bash
npm run package:build
node packages/velodom/bin/create-velodom.js my-app --no-install
```

From a globally/locally available VeloDom CLI, the same engine is used by:

```bash
vd create my-app
```

`vd help` includes a large colored VeloDom wordmark for interactive terminals
(a compact title is used below 64 columns).
Use `--no-logo` or `--no-color` in scripts; JSON and version output stay clean.

Choose Minimal, Blog, or Empty, then use Recommended defaults or customize
JavaScript/TypeScript, CSS/Tailwind, ESLint, Prettier, route examples, i18n,
the opt-in PWA build, testing, Git, installation, and server startup. Every entry point delegates to
one Node-only scaffolder; no creation code enters the browser runtime.
Customize mode can also add the optional local VeloDom Lab command without
adding a separate dependency or changing production output.

## Repository Structure

```text
packages/
  create-velodom/           npm-create wrapper; no duplicate generator logic
  velodom/                  publishable framework, CLI, types, docs, starter
    src/                    framework TypeScript source
      scaffolder/           Node-only composable project creation engine
    docs/                   consumer and AI-readable package references
    templates/default/      common safe files shared by all starters
    templates/starters/     minimal, blog, and empty application layers
  velodom-vscode/           optional private editor tooling
examples/
  velodom-blog/             full documentation application and real consumer
  velodom-store/            storefront/cart/admin/mock-checkout reference consumer
tools/
  scripts/
    package/                artifact audits and installed-consumer checks
    quality/                source comments and documentation contracts
    browser/                production browser verification
    performance/            compiler/render benchmarks and bundle budgets
  tests/                    framework, package, and regression tests
  test-support/             shared test/audit helpers
  test-fixtures/            isolated package consumer input
  type-tests/               compile-time API regression tests
docs/
  README.md                 detailed repository handbook
  TODO.md                   roadmap
  CHANGELOG.md              chronological changes
  NOTES.md                  architecture/release decisions
  RELEASING.md              release gates
```

### GitHub source, npm artifact, and website are different outputs

| Output | What belongs in it | What stays out |
| --- | --- | --- |
| GitHub repository | Source, tests, fixtures, docs, templates, example site, CI, lockfile | Dependencies, generated `lib/types/dist`, browser reports, tarballs, credentials |
| `velodom` npm tarball | Built ESM with source maps, types, binaries, consumer docs, small starter templates, license | Repository tests, full teaching site, development configs, release history |
| Deployed documentation site | `examples/velodom-blog/dist`, produced by the build | Package source, tests, credentials |
| Store/admin reference build | `examples/velodom-store/dist`, produced by `npm run build:store` | Real payments, credentials, server authorization |

Use `npm run package:build` then `npm run pack:report` to inspect **both** npm
artifacts without publishing. Use `npm run pack:check` for installed-consumer
and starter verification too. The workspace root and documentation site are
private; they are not the npm publish target. Do not copy `node_modules` to GitHub
or move repository-only tools into the public package to make the root look smaller.

Source maps are retained intentionally for debugging. Installed package size
includes optional Node tooling, docs, and maps; it is not the JavaScript sent to
a browser. `npm run performance:check` measures that separate concern.

## Current Status

The package source is version `1.0.0`. Its public contract exposes 14 package
entry points, 80 browser/build public values, 43 preferred directive names,
and 25 CLI commands. Release checks cover TypeScript, ESLint, documentation consistency,
the automated test suite, production builds, package boundaries, an installed
tarball consumer, the generated starter, and browser targets.

Registry publication or tag changes remain separate owner-authorized actions;
local checks never publish automatically. Confirm current registry availability
immediately before giving users registry-dependent release instructions.
The normalized changelog currently represents no official release: all
surviving V1 capabilities remain under `Unreleased` until the exact first
release commit is verified, approved, tagged, and published deliberately.

## Completed in the Current Update

- Added `examples/velodom-store` as a separate public-API consumer for catalog,
  direct product routes, URL filters, keyed product components, versioned guest
  cart persistence, authoritative mock quotes, RTL, and a visibly simulated
  checkout. It uses no commerce-specific Core syntax or real transaction.
- Extended the same consumer with a separate administration layout, URL-backed
  server-pagination fixture, detail/edit routes, optimistic revision checks,
  native validation, recoverable failed/conflicting drafts, and confirmed bulk
  publication actions. It reuses the catalog repository rather than copying
  product data or adding a Core data-grid/form abstraction.
- Fixed the optional direction controller so `ctx.direction` reaches component
  lifecycle hooks as documented, with runtime/type regression coverage.
- Extended desktop/mobile browser gates across the store's Back/Forward filters,
  keyboard cart action, refresh and blocked-storage outcomes, mock checkout,
  responsive layout, and RTL direction.
- Aligned the package Quick Start and generated Minimal README around one
  verified beginner journey: edit a page, create/render a component, adjust
  ordinary CSS, then build and preview. Advanced JS/TS, folder/`.vd`, and
  CSS/Tailwind choices remain available after that path.
- Extended the installed-tarball consumer check to execute the documented
  component command and build the taught Minimal JavaScript project; no Core
  runtime, public API, version, dependency, or browser payload changed.
- Simplified the taught list/form recipes around existing `vd-auto-state`,
  native constraints, and progressive form feedback. The displayed snippets
  are now executed as integration fixtures, and the production playground
  visibly covers successful and empty list responses.
- Converted the installed starter check into a real copy-to-project parity
  fixture: it reads the homepage lesson source, adds the documented component,
  builds from the packed package, and rejects source-only asset links while
  verifying public and scoped assets.
- Organized repository checks under `tools/scripts/{package,quality,browser,performance}`
  and kept npm commands stable. CI uses the named browser command.
- Added `npm run pack:report`: audits both real npm file lists, public entry
  targets, accidental private/build files, and compressed/installed size budgets.
  It neither installs nor publishes; run `npm run package:build` first.
- Corrected ESLint's obsolete test/script paths so current maintenance code is
  checked. Generated artifacts remain outside Git.
- Simplified this README into an entry point. Detailed implementation history
  remains in [CHANGELOG](docs/CHANGELOG.md) and [NOTES](docs/NOTES.md), not a
  second rolling changelog here.
- Improved the teaching homepage with a two-file beginner walkthrough and an
  explicit distinction between the documentation site, npm package, and starter.
- No framework APIs, syntax, dependencies, versions, or source maps were removed.

### Verification and limitations

See [maintenance notes](docs/NOTES.md) for this change's checks and measured
artifact sizes. A passing local package check is not npm publication or a
successful remote workflow. The previously observed local Firefox graphics
startup failure still requires verification on the strict Linux CI runner.

## TODO

The **Commerce and Large Applications** track is now **8/10 complete**. The
storefront, administration workflow, and replaceable HTTP/session contract are
implemented and verified, including real server denial, safe mock writes, and
private cache boundaries. The handbook now explains feature-owned organization,
dependency direction, optional app-owned JSDoc/TS contracts, public/server
configuration and deployment paths. The installed-package gate builds and
inspects both real consumers outside the workspace and type-checks the matching
JS/TS lesson; no new runtime API, registry or starter was introduced.
Files changed for this milestone: store HTTP client/contracts/README,
`tools/scripts/package/check-package-consumer.mjs`, blog architecture lesson and
README, package AI/syntax guides, and root handbook/roadmap/change records.
Continue with C08 only after independent starter-usability evidence. C10 API-
contract generation is deferred to
a future major release; realtime,
virtualization, and request-time rendering stay research. These are proposals,
not new npm features. Payment, stock, authorization, and pricing remain
application/server responsibilities; the documentation blog stays the teaching site.

C05 is now partially implemented: the existing opt-in request cache has bounded
LRU retention, coalesced GET reads, independent cancellation, header/credential
identity, explicit session/tenant scope and invalidation fences. Its old cache
implementation/helpers were replaced by one focused Core module; public
imports, custom keys, `clear()` and legacy zero-TTL semantics are preserved.
Updated files include cache/types/constants, regression and installed-consumer
checks, package AI/syntax/inventory guides and the blog's cache lesson.
Retry-wait/middleware cancellation is now verified too: pre-aborted requests,
AbortError, cancelled waits and late completion notifications no longer start
another application operation. The two wait implementations were consolidated;
no API signatures or CLI options changed. Related files: Core request helpers,
middleware/router/cancellation/types/constants, request regression tests and
the handbook/package/blog cancellation guidance.
The administration browser journey now waits for mounted bindings before
editing/selecting, preventing premature actions on visible but unbound markup.
The opt-in public page-data cache now also bounds LRU values and tracked reads
at 100, shares matching loads, prunes expiry and handles background failure
without renewing stale age. Internal invalidation fences late cache writes;
app destruction clears identities. Changed files: page-data/router/types/
constants, page-data unit/public-app/installed checks, root/package/AI guides
and blog/store educational text. The superseded refresh helper was removed.
C05 now adds explicit `app`/page/component `ctx` methods:
`invalidatePageData(page?)` clears variants of a discovered logical page (or
all pages) without fetching; `refetchPageData()` reads the mounted loader,
updates `state.data` and preserves DOM/drafts. Concurrent explicit reads
coalesce, and failed reads retain last good data. The store invalidates public
catalog/product pages after confirmed admin writes, refetches filtered list
rows/totals, and retries a failed read without repeating the accepted write.
Account changes clear public page data; private session/admin loads stay
uncached. No automatic mutation observer, private cache, new CLI prompt,
package export or dependency was added. Changed areas: Core page-data router/
runtime/context/types, store catalog/admin/auth scripts and UI, source/installed
consumer/browser tests, root/package/AI/teaching docs. Superseded manual list
patch/reload code was removed; retained request routes remain supported.
Verification: 380 tests, docs/types/strict/lint, full build, six generated
starter combinations, installed real consumers, package content/size and
performance gates passed. Desktop/mobile Chromium production tests passed.
Other engines and remote CI remain separate release evidence.

The router race is now fixed: accepted navigation owns cancellation across
resource/layout/data/style/module/hooks/fallbacks; stale results cannot overwrite
the newer page. Client loaders receive optional `signal`, cached subscribers
cancel independently and tracked SWR work aborts on app destruction. Captured
component owners replace reused-root cleanup, async directive/loop release is
awaited, and shared read cancellation has one Core implementation. Hash/guard
behavior and destroy-before-onCleanup stay compatible. Related files: Core
router/data/lifecycle/mount/directives/styles/error boundary/shared cancellation,
types, 23 new regressions, installed runtime/TS checks, package/AI references,
handbook and blog/store teaching content. All 403 tests, docs/types/lint, full
build, six starter combinations, installed real consumers, npm content/size
and performance gates pass. Desktop/mobile Chromium production checks also
pass, including delayed catalog → cart cancellation. Other browser engines
and remote CI remain release gates. The explicit public
invalidation/refetch and mutation-success recipe are now complete in C05
(5/10); focus moves to C06. The C05 test/build/browser/pack results are
recorded in [engineering notes](docs/NOTES.md). No source, starter, or
package version has been published by this work.
Current local evidence: 418 source tests, docs/types/strict/lint, full build,
six generated JS/TS starters, both installed consumers, package size/content
and desktop/mobile Chromium production checks pass. Firefox, WebKit and remote
CI remain distinct release gates, not implied by these results.

C06 is complete: the Store edit now uses an
application-owned dirty baseline plus the existing router guard for app links
and Back, with a best-effort unload prompt removed on cleanup. The optional
progressive form plugin now aborts detached uploads, fences late ignored-abort
success, associates server errors with fields accessibly, and distinguishes an
accepted submit from redirect failure. The package syntax guide no longer
combines `vd-form` and `vd-request` on one form. Files changed: Store bootstrap,
edit script and form guard, progressive forms Core, source/browser tests,
handbook/package/AI/blog/store docs, roadmap, notes and changelog. No new
directive/export/dependency/CLI prompt/version. The blog's `/forms` lesson
now demonstrates keyed repeatable contacts, two native editing steps,
touched feedback and cancellable latest-only async validation without a form
DSL. Its browser test exposed a real mismatch: documented `$event` was not
resolved by the expression evaluator. The alias now resolves to the current
event and cannot be updated as state. Direct DOM and browser regressions prove
input, submission, and repeatable rows. A schema adapter remains deferred
until repeated real integrations justify it. The form lesson is a lazy route;
the measured total blog JS budget changed from 256 to 264 KiB while the
initial 130 KiB limit stays fixed. Updated files include the blog page/helper,
Core evaluator, form/event/source/browser tests, budget check, root/package/AI
guides, roadmap and engineering notes. C06 passes 426 source tests,
docs/types/strict/lint, full build, six starter variants, both installed
consumers, package budget and desktop/mobile Chromium production checks.

C07 now has reproducible large-project evidence. The existing compiler-cache
benchmark includes 80 nested pages and 32 shared components, verifies cold/
warm reuse and targeted invalidation, and records local timings without
machine-specific speed claims. A generated consumer receives first, repeated
and `/preview/`-base production builds; all retain 124 JavaScript chunks in
the local fixture. A 160-visit runtime test checks deep links, auth-guard
changes, component rendering, event listener removal and page-owner cleanup.
Existing cache-bound tests and the Store browser journey remain in the gate.
The fixture also samples 100 small local catalog/admin reads; this is not a
database, browser-throughput or concurrent-shopper benchmark. Files changed:
compiler/build benchmark scripts, integration regression, root npm scripts,
README and the roadmap/engineering records. No framework runtime, public
API, CLI option, starter or package version changed.

C09 adds an optional Store-owned diagnostics recipe, deliberately not wired
into the default app. Explicit public request hooks and recoverable boundary
context can send sampled metadata to a caller-selected sink; raw params,
sessions, cart/payment values, messages, stacks and URLs are excluded. Abort
and teardown remove pending listeners, and sink failures cannot fail the user
action. The handbook and teaching site explain private source-map handling
and the client-only correlation ID. Changed files: Store diagnostics helper/
README, blog production lesson/README, source tests, handbook and roadmap/
engineering records. No Core API, mandatory collector, network traffic,
CLI prompt, starter change, dependency or version bump.
Current C09 verification: 431 source tests, full build and installed consumers,
six JS/TS starter variants, desktop/mobile Chromium, and npm dry-run content/
size checks pass. Other browser engines and remote CI are separate release gates.
The strict local browser audit also passed desktop/mobile WebKit after its form
scenario waited for the reactive step marker before typing; the static SEO
heading alone can appear before handlers bind. Firefox did not reach any test:
its local headless graphics compositor timed out (`RenderCompositorSWGL`), so
the required strict Linux CI result remains independent release evidence.

See [docs/TODO.md](docs/TODO.md) for release gates and the separately counted
V1 simplicity/organization follow-up, now **6/8 complete (75%)**. Prioritize
independent developer observation and evidence-led guide navigation before
splitting documentation. Real developer
feedback before adding capabilities. Near-term work includes:

- preserve source-backed Vite/Rollup chunk attribution and regression coverage;
- run the complete package and browser gates on the final commit;
- inspect both npm dry-run tarballs for unexpected files or size growth;
- publish `velodom` first and `create-velodom` second only after explicit owner
  approval, then verify `npm create velodom@latest` from the registry;
- keep advanced SSR, islands, migrations, and optional AI providers behind
  separate architecture and runtime-budget reviews.
- keep the experimental Lab read-only; evaluate a full playground, flame
  charts, browser extension, or source-writing tools only as separate bounded
  follow-up work.

## Handoff Notes

- Keep generic reusable framework behavior in `packages/velodom/src`.
- Keep business pages, components, layouts, APIs, assets, and auth policy in
  user applications or examples.
- Import only documented package entry points; never `velodom/lib/*` or
  repository source internals.
- Folder mode remains the default; `.vd` is optional and additive.
- JavaScript and TypeScript must remain independent authoring choices.
- Update this README, TODO, CHANGELOG, NOTES, tests, and package docs when the
  public contract changes.
- Do not push, publish, retag, or change package access without explicit user
  authorization for that external action.
