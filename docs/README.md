# VeloDom

VeloDom is a compiler-first, HTML-first frontend framework for folder-first
single-page applications with optional `.vd` single-file modules. Pages and
components use ordinary HTML, reactive state, declarative directives,
route-aware lifecycle hooks, and an optional request layer without JSX or TSX.

The framework source is TypeScript. Application authors may choose Vanilla
JavaScript or TypeScript independently for every page and component.

Source repository: [github.com/NadiaSalah/VeloDom](https://github.com/NadiaSalah/VeloDom).

> Project status: the VeloDom package source is version `1.0.0` and lives at
> `packages/velodom`; public API names are protected by package-boundary tests.
> Registry publication is a separate owner-authorized action. The earlier
> unpublished `velodom@1.0.0` cannot be republished under npm's immutable
> name/version policy. The owner chose to retain local `1.0.0` and postpone
> publication; a future release needs a separate version decision. Verify the
> current [npm package page](https://www.npmjs.com/package/velodom) immediately
> before giving registry-dependent release instructions.

## Contents

- [Package AI Context](../packages/velodom/AI_CONTEXT.md)
- [Canonical Syntax Reference](../packages/velodom/docs/SYNTAX_REFERENCE.md)
- [Feature Inventory](../packages/velodom/docs/FEATURE_INVENTORY.md)
- [What Works Today](#what-works-today)
- [Five-Minute Start](#five-minute-start)
- [V1 Feature Matrix](#v1-feature-matrix)
- [Source-Verified Public Feature Catalog](#source-verified-public-feature-catalog)
- [Authoring Reference](#authoring-reference)
- [First Page Walkthrough](#first-page-walkthrough)
- [Requirements and Commands](#requirements-and-commands)
- [CLI and Project Intelligence](#cli-and-project-intelligence)
- [Testing Utilities](#testing-utilities)
- [Project Structure](#project-structure)
- [Package and Import Boundaries](#package-and-import-boundaries)
- [Folder Conventions](#folder-conventions)
- [Layouts](#layouts)
- [Optional Single-File Modules](#optional-single-file-modules)
- [Application Bootstrap](#application-bootstrap)
- [Pages](#pages)
- [Routing](#routing)
- [Reactive State](#reactive-state)
- [Directives](#directives)
- [Components](#components)
- [Lifecycle, Refs, and Events](#lifecycle-refs-and-events)
- [Requests](#requests)
- [Middleware](#middleware)
- [Authentication](#authentication)
- [RTL and Multilingual CSS](#rtl-and-multilingual-css)
- [SEO and Static Route HTML](#seo-and-static-route-html)
- [Build-Time Asset Quality](#build-time-asset-quality)
- [Deployment and Static Hosting](#deployment-and-static-hosting)
- [Plugins](#plugins)
- [Compiler and Vite Integration](#compiler-and-vite-integration)
- [Adapter Contract and Optional Types](#adapter-contract-and-optional-types)
- [Editor Intelligence](#editor-intelligence)
- [Rendering, Localization and Server Boundaries](#rendering-localization-and-server-boundaries)
- [JavaScript and TypeScript](#javascript-and-typescript)
- [Error and Security Model](#error-and-security-model)
- [Consolidated Architecture and Integration Reference](#consolidated-architecture-and-integration-reference)
- [Public Package Boundaries](#public-package-boundaries)
- [Showcase Routes](#showcase-routes)
- [Storefront Reference Consumer](#storefront-reference-consumer)
- [Organizing Larger Applications](#organizing-larger-applications)
- [Verification](#verification)
- [Release Decision](#release-decision)
- [Browser Support](#browser-support)
- [Best Practices](#best-practices)
- [Current Limitations](#current-limitations)
- [Roadmap and Handoff](#roadmap-and-handoff)
- [Documentation and Maintenance](#documentation-and-maintenance)

AI assistants generating VeloDom applications should begin with the package-local
[AI_CONTEXT.md](../packages/velodom/AI_CONTEXT.md), then confirm exact syntax in
the [syntax reference](../packages/velodom/docs/SYNTAX_REFERENCE.md) and status
in the [feature inventory](../packages/velodom/docs/FEATURE_INVENTORY.md). This
guide remains the complete repository handbook; the package files are the
portable consumer contract and are not duplicated in the root `docs` folder.

## What Works Today

### Repository and distribution ownership

The full source checkout is a maintainer workspace. `packages/velodom` is the
publishable framework; `packages/create-velodom` is its thin creation wrapper.
`examples/velodom-blog` is the actual educational website, while
`examples/velodom-store` is the independent storefront/cart/admin/mock-checkout
reference consumer. Neither is part of the npm framework payload. The documentation
homepage starts with a two-file interaction before the full feature catalog.
The generated Blog starter is intentionally much smaller.

Maintenance checks are grouped under `tools/scripts/package`, `quality`,
`browser`, and `performance`; use the root npm commands rather than depending
on their internal file paths. Tests, fixtures, and type tests stay under `tools`.
The package's own build/declaration scripts stay inside `packages/velodom/scripts`
so it can build without repository tooling. Root config and the lockfile remain
at the workspace root for normal tool discovery and reproducible installs.

After `npm run package:build`, `npm run pack:report` audits both real npm pack
manifests, reports compressed and unpacked bytes by category, and rejects missing
entry points, non-allowlisted paths, known private/generated artifacts, and size
budget regressions. It does not publish and is not a general secret scanner.
`npm run pack:check` also installs tarballs and builds generated consumers.
Source maps, declarations, small starter layers, and portable AI/human references
are intentionally shipped; repository histories and this website are not.

### Supported capabilities

VeloDom currently provides:

- folder-discovered pages and nested components
- one-call Vite startup through `mountVeloDom()` with convention-discovered
  request routes and application middleware
- optional `.vd` single-file pages and components for small co-located modules
- optional page layouts with shared nav/footer shells and per-page selection
- static, nested, and dynamic client-side routes
- route params, query values, metadata, and navigation guards
- shallow reactive state with inherited component state
- conditionals, loops, text, visibility, model, attribute, class, and style
  directives
- event directives with lifecycle and keyboard modifiers
- page and component `init`, `mounted`, `destroy`, cleanup, and abort signals
- DOM refs, component refs, grouped refs, keyed instances, and `expose`
- named and unnamed slots plus folder-scoped CSS
- optional application-owned shared state through `createSharedState()`
- declarative requests with params, result/loading/error state, events, auth,
  auth-failure redirects, lifecycle hooks, success callbacks, middleware,
  debounce, throttle, retry, and cancellation
- optional request cache, retry wrapper, and devtools bridge helpers
- optional native-form validation plugin for `vd-validate` request forms
- optional direction plugin for document `lang`/`dir` and RTL-aware templates
- optional build-time localization with typed message keys, native `Intl`
  formatting, locale-aware links, and canonical/`hreflang` SEO records
- configurable server-session and demonstration localStorage auth providers
- runtime head management and static SEO HTML generated from page
  `config.js` or optional `config.ts`
- optional build-time content helpers through `velodom/content` for Markdown
  collections, SEO entries, sitemap records, RSS XML, and local search indexes
- optional `velodom/node` bridge for application-owned Fetch-style responses in
  Node HTTP servers; it does not add SSR, sessions, hydration, or streaming
- optional `velodom/localization` helpers for typed dictionaries, native `Intl`,
  locale paths, and static locale SEO without a browser translation runtime
- optional `velodom/devtools` read-only development inspector and
  `velodom/testing` DOM mount helpers
- a safe expression parser/evaluator with no `eval` or `new Function`
- a Vite template compiler, source-aware diagnostics, optimizer hooks, and
  runtime feature manifests
- source-aware adapter and user-file loader errors for pages, layouts,
  components, and page config files
- a repeatable local rendering benchmark for common page bindings and loops
- enforced JavaScript performance budgets for generated route chunks and
  package runtime modules
- local static CLI tooling for project inspection, doctor diagnostics, route
  listing, graphs, health reports, build intelligence, generated docs,
  benchmarks, and convention-first scaffolding
- public `velodom/testing` utilities for mounting pages and components in
  browser-like test environments
- compiler accessibility warnings for common image, form-control, anchor,
  click-target, and heading mistakes
- generated ESM and TypeScript declarations for the intended package surface

VeloDom deliberately does not currently provide a mandatory global store,
virtual DOM, JSX, schema-heavy validation system, full SSR/hydration, or a full
browser devtools panel.

The current build-time content helper layer and future content improvements are
documented in the Content and Assets section below. It is intentionally
tooling-oriented, not a mandatory browser runtime layer.

## Five-Minute Start

The usual Vite application needs one bootstrap call:

```js
// src/main.js
import { mountVeloDom } from "velodom/vite";

await mountVeloDom();
```

Then create a page as ordinary HTML and a small state file:

```html
<!-- src/pages/hello/index.html -->
<main>
  <h1>{{ title }}</h1>
  <button type="button" vd-on:click="count++">Count: {{ count }}</button>
</main>
```

```js
// src/pages/hello/script.js
export const state = { title: "Hello VeloDom", count: 0 };
```

VeloDom discovers the folder, compiles the template, and mounts only the
needed runtime features. No route registration, component registration, JSX,
render function, or global-store setup is required.

## V1 Feature Matrix

| Surface | V1 capabilities |
| --- | --- |
| Authoring | Folder pages/components/layouts, optional `.vd`, JavaScript or TypeScript, shallow state, typed config |
| UI | `vd-*` directives, interpolation, loops, components, slots, refs, events, lifecycle, scoped CSS |
| Routing | Static and nested routes, dynamic params, query values, guards, hashes, focus, scroll restoration, prefetch |
| Data | Page data loaders, request bindings, middleware, auth providers, cancellation, debounce, throttle, retry, cache helpers, validation, progressive forms |
| Build | Compiler diagnostics, feature manifests, SEO/static output, content collections, localization helpers, asset inspection |
| Tooling | `vd` CLI, doctor, graph, health, benchmark, build report, generated docs/types, editor helpers, testing, devtools bridge |
| Server boundary | Optional `velodom/node` Fetch-style Node adapter owned by the application; no automatic SSR or hydration |

Project intelligence belongs to build and development tooling. It should not
become application runtime weight. Advanced hybrid rendering, islands,
streaming, and Edge work are planned or research-only and are not part of the
normal V1 browser model.

## Source-Verified Public Feature Catalog

This catalog is generated conceptually from the public package entry modules,
the compiler directive contract, and the CLI command dispatcher. Repository
verification checks that every public value, preferred directive family, and
CLI command remains named in this single guide. This makes the rest of this
document the canonical detailed reference rather than a manually maintained
marketing list.

| Import | Public values |
| --- | --- |
| `velodom` | `createApp`, `computed`, `effect`, `watch`, `definePageConfig`, `definePlugin`, `defineRequestRoute`, `defineResourceAdapter`, `assertResourceAdapterConformance`, `createDirectionPlugin`, `createRtlFlipStyles`, `createSharedState`, `createDevtoolsPlugin`, `createRequestCache`, `withRequestRetry`, `createValidationPlugin`, `createProgressiveFormsPlugin`, `assertPluginConformance`, `inspectPluginConformance`, `createPluginManager`, `ApiError`, `createAuthRuntime`, `createLocalStorageAuthProvider`, `createServerSessionAuthProvider`, `defineRequestMiddleware`, `normalizeAuthSession`, `requestJson`, `VD_AUTH`, `VD_MIDDLEWARE`, `VD_REQUEST` |
| `velodom/compiler` | `analyzeVeloDomDocument`, `compileTemplate`, `createRuntimeFeatureManifest`, `defineTemplateOptimizer`, `getVeloDomDirectiveCompletions`, `runTemplateOptimizers` |
| `velodom/content` | `loadContentCollection`, `loadExternalContentCollection`, `createContentCollection`, `createContentIndex`, `parseMarkdownContent`, `createContentSeoEntries`, `createContentSitemap`, `createContentSearchIndex`, `createContentRssFeed` |
| `velodom/localization` | `defineLocaleDictionary`, `definePluralMessage`, `createLocalization`, `generateLocaleKeyDeclaration`, `getLocaleKeyCompletions`, `extractLocaleKeyUsage`, `createLocaleFormatter`, `inspectLocalization` |
| `velodom/assets` | `inspectImageAsset`, `inspectImageDirectory`, `createResponsiveImageAttributes` |
| `velodom/pwa` | `definePwaManifest`, `inspectPwaManifest`, `definePwaCacheStrategies`, `createPwaServiceWorker`, `createPwaRegistrationScript`, `velodomPwa` |
| `velodom/node` | `createNodeRequestAdapter` |
| `velodom/devtools` | `mountDevtoolsInspector`, `mountVeloDomLab`, `mountVeloDomErrorOverlay`, `groupVeloDomErrorReports`, `VELODOM_DEVTOOLS_PROTOCOL_VERSION` |
| `velodom/vite` | `createViteAdapter`, `createViteApp`, `mountVeloDom` |
| `velodom/vite-plugin` | `createTemplateModule`, `velodom` |
| `velodom/testing` | compiler/route/request/event/a11y fixtures plus page/component mounts |
| `velodom/cli` | `runVeloDomCli` (Node only) |
| `velodom/scaffolder` | `createVeloDomProject`, `detectPackageManager` (Node only) |

The preferred template vocabulary is grouped by purpose below. Attribute
compatibility forms such as `data-vd-text` remain accepted, but new code should
use the shorter names.

| Purpose | Preferred directives |
| --- | --- |
| Content and conditions | `vd-text`, `vd-if`, `vd-elseif`, `vd-else`, `vd-show`, `vd-for`, `vd-key`, `vd-pre` |
| Values and attributes | `vd-model`, `vd-value`, `vd-checked`, `vd-disabled`, `vd-alt`, `vd-src`, `vd-href`, `vd-class`, `vd-style`, `vd-attr` |
| Components and references | `vd-component`, `vd-props`, `vd-prop-*`, `vd-child`, `vd-get-child`, `vd-ref`, `vd-state` |
| Routing | `vd-nav`, `vd-path`, `vd-prefetch` |
| Requests and forms | `vd-request`, `vd-request-config`, `vd-request-state`, `vd-params`, `vd-target`, `vd-auto-state`, `vd-loading`, `vd-error`, `vd-form`, `vd-form-status`, `vd-form-error`, `vd-validate`, `vd-debounce`, `vd-throttle` |
| Direction | `vd-rtl-flip` |

Event bindings use the documented `vd-on:*` family. Dynamic supported HTML
bindings use `vd-bind:*`; these families are compiler syntax rather than fixed
entries in the preferred-name array. Continue through the sections below for
semantics, constraints, and executable examples rather than copying the catalog
without context.

## Authoring Reference

VeloDom has one authoring model with two file layouts. Both layouts compile to
the same internal page, component, or layout resource. Choose the layout that
keeps the feature easiest to read; no runtime capability is lost by using
folder mode.

### Folder mode

Use a folder when a feature has more than one concern or is likely to grow:

```text
src/pages/about/
  index.html       # required template
  script.js        # optional state and lifecycle
  style.css        # optional scoped style
  data.js          # optional route data loader
  config.js        # optional route, layout, guards, and SEO
```

The TypeScript variant uses the same filenames with `.ts`. Do not create both
JavaScript and TypeScript variants for one convention slot; VeloDom reports the
ambiguity so the beginner path stays deterministic.

### One-file mode

Use `.vd` for a small page, component, or layout that benefits from co-location:

```html
<template>
  <main>
    <h1>{{ title }}</h1>
    <button type="button" vd-on:click="count++">
      Count: <span vd-text="count"></span>
    </button>
  </main>
</template>

<script>
export const state = { title: "About", count: 0 };
</script>

<style>
main { padding: 2rem; }
</style>

<config>
export default {
  path: "/about",
  seo: {
    title: "About VeloDom",
    description: "A concise HTML-first page."
  }
};
</config>
```

The `<template>` block is required. `<script>`, `<style>`, and `<config>` are
optional. Folder mode and `.vd` mode may coexist in the same project, but one
logical resource should have one source of truth.

### Template syntax at a glance

| Need | Preferred syntax | Notes |
| --- | --- | --- |
| Render text | `{{ title }}` or `vd-text="title"` | Interpolation is compiled to a safe text binding. |
| Keep braces literal | `\\{{ title }}` or `vd-pre` | Useful in documentation and examples. |
| Conditional DOM | `vd-if`, `vd-elseif`, `vd-else` | Branch expressions are safe and source-checked. |
| Toggle visibility | `vd-show="isOpen"` | Keeps the element and changes display state. |
| Repeat content | `vd-for="post in posts"` | Add `vd-key="post.id"` when identity matters. |
| Two-way form value | `vd-model="draft.title"` | Works with ordinary named form controls. |
| Bind an attribute | `vd-bind:href="post.url"` | `vd-bind:*` accepts the supported HTML binding names. |
| Events | `vd-on:click="save()"` | Modifiers include keyboard and lifecycle-safe behavior. |
| Requests | `vd-request="posts.get"` | Add `vd-params`, `vd-target`, and `vd-auto-state`. |
| Components | `<vd-component name="blog/post-card">` | Name follows the path below `src/components`. |
| Navigation | `<a href="/about" vd-nav>` | Same-page hashes scroll without a full reload. |
| Refs | `vd-ref="dialog"` | Read the ref from the page/component context. |

The compiler accepts preferred `vd-*` names and keeps `data-vd-*` as a
compatibility input. Prefer the `vd-*` form in new application code. Expressions
are deliberately smaller than JavaScript: state, props, route values, event,
element, literals, operators, optional access, arrays, objects, and approved
calls are supported. `eval`, `new Function`, arbitrary globals, and unsafe
members are not used.

### Small state versus lifecycle code

For plain defaults, export a shallow `state` object:

```js
export const state = {
  query: "",
  posts: [],
  loading: false
};
```

Use `init({ state, ctx, data, params, query, props })` when behavior is needed:

```js
export function init({ state, ctx }) {
  state.announce = () => {
    ctx.emit("notice", { message: "Saved" });
  };

  ctx.onCleanup(() => {
    // release application-owned resources here
  });
}
```

The state seed is merged before `init()`. This is why `vd-on:click="count++"`
works for simple counters while async work, cleanup, and complex logic remain
visible in `init()`.

## First Page Walkthrough

For this repository workspace, these commands build the local `velodom`
package and run the independent VeloDom documentation application at
`examples/velodom-blog`:

```bash
npm install
npm run dev
```

The beginner entry point is intentionally one call:

```js
// src/main.js
import "./style.css";
import { mountVeloDom } from "velodom/vite";

await mountVeloDom();
```

Add a page with ordinary HTML:

```html
<!-- src/pages/hello/index.html -->
<main>
  <h1>{{ title }}</h1>
  <button type="button" vd-on:click="count++">
    Count: {{ count }}
  </button>
</main>
```

For simple initial values, export `state` directly. It is merged before
`init()`, so a button can use the concise safe `count++` form without a helper
function:

```js
// src/pages/hello/script.js
export const state = {
  title: "Hello VeloDom",
  count: 0
};
```

Add route and SEO metadata:

```js
// src/pages/hello/config.js
export default {
  path: "/hello",
  seo: {
    title: "Hello VeloDom",
    description: "A small HTML-first page."
  }
};
```

VeloDom discovers these files. No component registration, route import, render
function, JSX, or store setup is required. Folder mode is the clearest default;
the optional `.vd` format is available when keeping a small page in one file is
more readable.

## Requirements and Commands

Required Node.js version:

```text
^20.19.0 or >=22.12.0
```

Install the repository dependencies and start development:

```bash
npm install
npm run dev
```

Common commands:

```bash
npm test
npm run docs:check
npm run typecheck
npm run typecheck:strict
npm run lint
npm run check
npm run package:check
npm run pack:check
npm run benchmark:rendering
npm run benchmark:compiler
npm run performance:check
npm run test:browser
npm run build
npm run preview
```

What the main checks do:

| Command | Purpose |
| --- | --- |
| `npm test` | Runs compiler, core, request, package, and DOM integration tests. |
| `npm run docs:check` | Enforces module headers, exported API JSDoc, named-function JSDoc, and source-derived documentation consistency. |
| `npm run typecheck:strict` | Enforces TypeScript `strict` over every package source below `packages/velodom/src`, including runtime, compiler, optional subpaths, Vite integration, CLI intelligence, and scaffolding. |
| `npm run check` | Runs documentation, baseline and migrated-slice strict TypeScript, and ESLint checks. |
| `npm run package:check` | Builds ESM/types and tests an installed local tarball consumer. |
| `npm run pack:check` | Runs package checks and inspects the npm tarball dry-run contents. |
| `npm run benchmark:rendering` | Runs local happy-dom page-binding and loop-rendering benchmarks. |
| `npm run benchmark:compiler` | Reports cold template compilation, warm incremental-cache reuse, and one explicitly invalidated rebuild. Timings are diagnostic rather than a machine-specific release threshold. |
| `npm run benchmark:check` | Runs both deterministic compiler-cache and rendering benchmark workloads; timings remain local diagnostics while correctness failures stop the gate. |
| `npm run performance:check` | Enforces separate initial-entry, total lazy-route, largest-chunk, and public-browser-entry JavaScript budgets after build artifacts exist. Package runtime size follows modules reachable from `velodom` and `velodom/vite`, so optional Node/build tooling is not misclassified as startup code. Set `VELODOM_CSS_BUDGET_KB` to optionally enforce a project-owned total CSS budget too. |
| `npm run test:browser` | Builds both example consumers and runs required desktop/mobile Chromium smoke checks. Strict CI selects Firefox and desktop/mobile WebKit too; any unexpected page or console error fails its step. |
| `npm run build` | Runs all quality/package gates, builds the documentation and storefront consumers, executes benchmark workloads, then checks performance budgets. |

Generated `examples/*/dist`, `packages/velodom/lib`, and
`packages/velodom/types` folders are build output and should not be edited manually.

## CLI and Project Intelligence

VeloDom includes package binaries for local, static developer tooling:

```bash
vd help
vd lab --check
vd inspect
vd inspect css
vd inspect assets
vd doctor
vd check
vd fix
vd fix --write
vd explain routing
vd explain VD_PROJECT_COMPONENT_MISSING
vd stats
vd routes
vd graph --mermaid
vd health --min-score 80
vd benchmark
vd build-report --json
vd docs
vd types
vd add i18n
vd add tests --unit
vd features
vd remove tests
vd upgrade all
vd preset export
vd preset apply .velodom/preset.json
vd test
vd test unit
vd test --browser
vd i18n extract
vd i18n check
vd version
vd create my-site --recommended
vd init my-site --recommended
vd create page blog/posts/[id] --ts
vd create page counter --demo counter
vd create component shared/post-card --single-file
vd create feature articles --blog
vd create api posts
vd create demo features/demo
vd create middleware
vd create plugin analytics
npm create velodom@latest
npx --yes --package velodom create-velodom my-site --no-install
```

Inside this repository, run `npm run package:build` first, then use
`node packages/velodom/bin/vd.js ...` because the wrappers load the generated
`packages/velodom/lib/cli.js`.
Every creation entry point calls one Node-only scaffolder. The dedicated
`create-velodom` package enables npm's conventional `npm create velodom`
resolution after it is published. The existing `velodom` package binaries and
`vd create` remain compatible interfaces to the same engine.

### CLI identity and output

`vd help` and `vd create --help` show a large colored VeloDom wordmark in an
interactive terminal:

```text
██╗   ██╗███████╗██╗      ██████╗ ██████╗  ██████╗ ███╗   ███╗
╚██╗ ██╔╝██╔════╝██║     ██╔═══██╗██╔══██╗██╔═══██╗████╗ ████║
 ╚████╔╝ █████╗  ██║     ██║   ██║██║  ██║██║   ██║██╔████╔██║
  ╚██╔╝  ██╔══╝  ██║     ██║   ██║██║  ██║██║   ██║██║╚██╔╝██║
   ╚═╝   ███████╗███████╗╚██████╔╝██████╔╝╚██████╔╝██║ ╚═╝ ██║
◇  VeloDom CLI · HTML-first · compiler-first · vanilla-friendly
```

The wordmark uses plain text in piped output and CI unless color is explicitly
requested. `--no-color` and `NO_COLOR` take precedence; `--no-logo` hides the
wordmark entirely. Below 64 terminal columns a compact title avoids wrapping.
JSON and version responses never include branding. Presentation flags are
accepted during project creation without becoming project settings.
`vd <command> --help` (or `-h`) displays help without performing the command.
Malformed arguments and rejected asynchronous commands return exit code 1
through the same concise error channel.

The flow selects Minimal, Blog, or Empty, then Recommended or Customize.
Optional feature installers compose JavaScript/TypeScript, CSS/Tailwind,
ESLint, Prettier, route examples, English/Arabic localization, unit/E2E tests,
Git, dependency installation, and server startup. The package stores shared
safe files in `templates/default` and starter-specific application files in
`templates/starters`; it does not maintain a copy for every combination.

The CLI is intentionally static and local. Its Node-only Project Index reads
each discovered template, paired script, page config, and compiler result once
per command, then shares that snapshot across diagnostics and reports without
exposing source bodies or AST data in normal output. `vd inspect` and `vd stats` read
folders, `.vd` files, API route registrations, middleware files, template
directives, CSS files, refs, events, state keys, exposed names, compiler
feature manifests, SEO configs, and test-file signals without adding any
browser runtime behavior.
`vd inspect routes|components|config|css|assets|build` narrows that same
source-derived report without introducing parallel analyzers. The CSS view
attributes resource styles to routes, finds repeated declaration blocks and
possibly unused selectors, and reuses the RTL logical-property analyzer. The
asset view hashes local files and reports size, literal usage, duplicate
content, missing image dimensions, incomplete responsive markup, and possible
LCP candidates. Usage and LCP results are advisory because dynamic strings and
above-the-fold layout cannot be proven from source alone. `vd explain
<file|topic|code>` uses
the compiler and maintained framework facts to explain a template, state,
routing, requests, components, compiler behavior, or Lab locally; it does not
require AI, a network request, or an API key.
`vd doctor` adds actionable checks for compiler diagnostics, missing component
references, broken request references, broken `$refs` usage, duplicate
declarative `vd-state` names, unknown event handlers, unsafe dynamic
directive expressions, unused components/request routes/middleware,
unreachable showcase files, circular component dependencies, large templates,
simple page config mistakes, non-app-relative `vd-nav` links, unwritable request
targets, typed component-prop contracts, child-ref/expose calls, and
conservatively unused exported state. Prop mismatch checks require an explicit
`ComponentInitContext<Props>` interface or type; dynamic props and control flow
are not inferred.
Every doctor item has a stable `code`, a bounded `category` (`compiler`,
`accessibility`, `component`, `configuration`, `maintainability`, `request`,
`routing`, `security`, `state`, or `tooling`), and a remediation suggestion.
When the source relationship is statically provable, JSON output also includes
one-based `location.line` and `location.column`. Component, request, and
unknown-directive names receive a suggestion only when a close known name
passes a conservative typo threshold.
`vd check` composes these source diagnostics with in-memory generated-type
validation and package/Vite build-entry sanity. It prints every step it actually
ran and leaves the browser step visibly `not-run`; run the project's real E2E
command separately when browser evidence is required. The command is
non-destructive and does not write `src/velodom.generated.d.ts` or invoke a
production build.
`vd fix` is preview-only unless `--write` is supplied. Its fixed allowlist
migrates legacy `data-vd-*` attributes, `data-vd-on-<event>` to
`vd-on:<event>`, and `vd-request-state` to `vd-auto-state`. It reports every
file and line/column, refuses to overwrite a file changed since indexing, edits
only template regions, and never changes JavaScript business logic or deletes
resources.
`vd build-report` summarizes project counts, SEO coverage, compiler features,
unused directive families, optional runtime features not requested by current
templates, largest pages/components, and generated JavaScript/CSS chunks. A
production build using `velodom/vite-plugin` emits the source-free, versioned
`dist/velodom-build-meta.json`; with it, the command attributes initial, route,
component, shared, and lazy-feature chunks and measures duplicated dependencies
from Rollup rendered-module bytes. Without the artifact it reports attribution
as unavailable instead of inferring ownership from minified output.
`vd graph` exports page-route, page/component dependency, request, and
middleware relationships plus statically provable refs, events, state keys, and
exposed names as text, JSON, or Mermaid.
`vd health` summarizes doctor issues, SEO coverage, accessibility/compiler
warnings, security link checks, generated bundle size, and optional runtime
feature-selection signals into a non-blocking score. It fails only when `--min-score` or
`.velodom-health.json` config asks it to enforce a threshold.
`vd docs` generates Markdown or JSON documentation for routes, components,
requests, middleware, plugins, refs, events, state, exposed names, slots, and
SEO coverage where static analysis can prove the relationship.
`vd types` generates `src/velodom.generated.d.ts` from conventional pages,
routes, request names, individual/static-object component prop usage, and
required/optional keys from an explicit `ComponentInitContext<Props>`
interface/type. Prop value types remain `unknown` when they cannot be proven
without executing application code. It is optional: JavaScript
projects do nothing, while TypeScript projects may import the generated
`velodom/app` module for `VeloDomPageParamsFor`, `VeloDomRequestRouteName`, and
`VeloDomComponentPropsFor` without a runtime dependency.
`vd add i18n|pwa|tests|lab` installs only existing first-party optional capabilities
into an application. Unit tests are the small default; use `--e2e` or `--all`
explicitly. The installer preflights generated paths and package/Vite changes,
refuses conflicts, writes `.velodom/features.json` with created-file hashes,
and becomes a no-op when the same feature is already recorded. It never runs a
package install, deletes files, or manages third-party plugins.
`vd features` verifies generated and controlled-file hashes, including the
reverse installation chain when features share `package.json`. New controlled
mutations retain exact before/after sources and hashes. `vd remove` preflights
then deletes only unchanged generated files and restores exact controlled
sources; user changes, missing controlled files, and legacy non-reversible
entries stop the operation. `vd upgrade` removes/reinstalls clean features
through current generators and restores its snapshot on failure.
`vd preset export` writes versioned JSON with only first-party feature names and
bounded options; `vd preset apply <file>` validates that data and reuses the
normal conflict-safe installer. Presets contain no source, credentials,
third-party packages, or executable hooks.
`vd test` is a thin selector for tests already owned by the application. With
no filter (or `all`) it runs `test`; `unit`, `browser`, `compiler`, `route`,
`request`, `component`, and `a11y` select the corresponding focused package
script. Browser accepts `test:browser` or the common `test:e2e` alias, and
accessibility accepts `test:a11y` or `test:accessibility`. Missing or recursive
scripts fail visibly—VeloDom never replaces an unconfigured layer with a green
placeholder.
`vd benchmark` delegates to the project's `benchmark:rendering` script so
performance checks stay repeatable and outside the browser runtime.

`vd lab` starts the project's existing Vite `dev` script with the optional
local inspector enabled. Run `vd lab --check` to validate setup without
starting a server. The command respects the declared package manager or lock
file, and `vd doctor` reports a configured Lab script whose Vite/dev setup is
incomplete.

### Feature Scaffolding

Create the smallest feature with one command:

```bash
vd create feature articles
```

It creates only a static page and its SEO config. When a blog-shaped vertical
slice is useful, add `--blog`:

```bash
vd create feature articles --blog
```

The blog template additionally creates a page script, `articles/post-card`
component, application-owned API source, and a small Node test placeholder.
It never edits a central route registry or overwrites existing files.

### Project scaffolder

`vd create` is the readable CLI form of the project generator; `vd init`
remains a compatible alias:

```bash
vd create my-site
```

Recommended mode selects TypeScript, plain CSS, ESLint, Prettier, Git, and
dependency installation without adding route examples, i18n, tests, or an
auto-started server. Customize exposes each layer. Scriptable flags include
`--template`, `--javascript`/`--typescript`, `--css`/`--tailwind`, paired
`--feature`/`--no-feature` switches, `--lab`/`--no-lab`, test modes, and
`--package-manager`. Selecting Lab adds only a `lab` script; selecting No adds
no dependency, configuration, or production code.

The beginner path is deliberately explicit rather than tied to those defaults:
choose Minimal, Customize, JavaScript, and Plain CSS, or run
`create-velodom my-app --template minimal --javascript --css --yes`. The shipped
Quick Start and generated README then lead through one page, one component,
ordinary CSS, build, and preview before presenting advanced alternatives.

### Focused Page Demos

Use `--demo` when learning one capability instead of starting with a full
starter. Each command creates only the files it needs:

```bash
vd create page welcome --demo static
vd create page counter --demo counter
vd create page articles --demo request
vd create page newsletter --demo form
vd create page discover --demo seo
```

- `static` creates HTML and SEO config only.
- `counter` adds a small `export const state` script using `count++`.
- `request` adds a state script and `src/api/articles/get.js`, available as
  `articles.get` through file API discovery.
- `form` adds a local state script with `vd-model` and a native submit handler.
- `seo` creates visible fallback content plus title, description, and keyword
  metadata in the page config.

`--demo` keeps folder mode so the generated files remain easy to inspect. It
cannot be combined with `--single-file`.

### Optional CSS Budget

VeloDom does not choose a CSS limit for an application. A documentation site,
an admin system, and a design system have different valid CSS needs. If a
project wants CI protection, enable one explicit total budget without adding
any runtime code:

```bash
VELODOM_CSS_BUDGET_KB=100 npm run build
```

In PowerShell:

```powershell
$env:VELODOM_CSS_BUDGET_KB = 100
npm run build
```

When unset, VeloDom reports CSS size through `vd build-report` but does not
fail the build for it.

## Testing Utilities

Use `velodom/testing` in happy-dom, jsdom, or real-browser tests when you want
to mount small VeloDom units without importing internal core files:

```js
import {
  compileTestFixture,
  createRequestMock,
  dispatchTestEvent,
  inspectAccessibilitySmoke,
  mountTestComponent,
  mountTestPage,
  resolveTestRoute
} from "velodom/testing";

const page = await mountTestPage("<h1 vd-text=\"title\"></h1>", {
  state: {
    title: "Hello tests"
  }
});

page.state.title = "Updated";
await page.cleanup();

const route = resolveTestRoute("/posts/42", ["posts/[id]"]);
const request = createRequestMock({ ok: true });
await request.handler({ id: route.params.id });

const fixture = compileTestFixture("<img src=\"cover.webp\">");
const a11y = inspectAccessibilitySmoke(fixture.html);
```

`mountTestPage()` compiles preferred `vd-*` syntax, creates reactive state,
applies directives, and returns `{ root, state, cleanup }`.
`mountTestComponent()` mounts one in-memory component definition with optional
props, slots, module hooks, style, and manifest overrides.
`compileTestFixture()` and `resolveTestRoute()` exercise the same compiler and
ranked route matcher as applications. `createRequestMock()` records calls while
avoiding network I/O, `dispatchTestEvent()` drives ordinary DOM interactions,
and `inspectAccessibilitySmoke()` returns only deterministic `VD_A11Y_*`
compiler diagnostics. Import these from the test-only subpath; they add no
application runtime service.

## Project Structure

```text
packages/
  create-velodom/             npm-create wrapper using velodom/cli
  velodom/                    publishable npm package named "velodom"
    package.json              public exports, peers, binaries, publish guard
    scripts/                  private package build helpers
    tsconfig.base.json        shared package compiler settings
    tsconfig.build.json       package ESM build configuration
    tsconfig.types.json       package declaration build configuration
    bin/                      vd, velodom, and create-velodom CLI wrappers
    src/                      framework-owned TypeScript
      adapters/               build-tool resource discovery
      cli/                    static analysis, reporters, resource scaffolds
      scaffolder/             project prompts, validation, and feature layers
      compiler/               HTML compiler and optimizer contracts
      directives/features/    lazy directive runtime modules
      errors/                 structured error reporting
      expression/             safe expression tokenizer/parser/evaluator
      requests/               HTTP, auth, middleware, request runtime
      shared/                 generic validation and path helpers
      vite-plugin/            template compilation and static SEO rendering
    templates/default/        shared generator files
    templates/starters/       minimal, blog, and empty layers
  velodom-vscode/             optional VS Code extension package

examples/
  velodom-blog/               independent VeloDom consumer application
    src/
      pages/                  application-owned pages
      layouts/                optional application-owned page shells
      components/             application-owned components
      api/                    application-owned handlers and middleware
      assets/                 application-owned static assets
      main.js                 one-call application bootstrap
  velodom-store/              independent storefront/admin reference consumer
    src/
      pages/                  public commerce plus administration workflows
      components/             navigation and reusable product presentation
      api/                    stable application request names
      domain/                 shared repository plus app-owned cart/admin policy
      layouts/                separate public and administration shells

docs/                         DX, future research, and identity notes
tsconfig.json                 workspace type-check configuration
tools/
  scripts/                    workspace release and quality checks
  tests/                      automated framework test suites
  test-support/               reusable test environment helpers
  test-fixtures/package-consumer/
                              installed-package verification fixture
```

Ownership rule:

- Framework behavior that is generic across sites belongs in
  `packages/velodom/src` and is packaged only as built `lib` plus `types`.
- Business pages, components, route handlers, and custom middleware stay in
  the consuming application's `src/pages`, `src/components`, and `src/api`.
- The documentation application is a real workspace consumer under
  `examples/velodom-blog`; it does not import framework source or carry a
  private copy of Core.
- The storefront reference under `examples/velodom-store` also imports public
  package paths only. Its `src/domain` folder is an explicit application module,
  not a new framework discovery convention or a commerce service in Core.
- `tools/test-fixtures/package-consumer` verifies the packed npm artifact; it is not
  an application example or an artifact file.
- `packages/velodom-vscode` is an optional editor integration with its own
  lifecycle. It consumes the public compiler API and is never a runtime
  dependency of a VeloDom site.
- Repository-wide TypeScript, ESLint, tests, and release scripts stay under
  `tools/`. Application Vite/Tailwind configuration belongs to the app.

Use the sections in this guide to distinguish shipped V1 capabilities from
optional tooling and approved future research. Operational checklists and
history remain in the small companion files listed at the end of this guide.

## Package and Import Boundaries

Applications install one npm package named `velodom`. They never copy
`packages/velodom/src` into their own source tree. Choose the narrowest public
entry that matches the task:

```js
// General runtime and public contracts.
import { createApp, createSharedState } from "velodom";

// Recommended convention-first Vite bootstrap.
import { mountVeloDom } from "velodom/vite";

// Build configuration only.
import { velodom } from "velodom/vite-plugin";

// Optional focused tooling.
import { compileTemplate } from "velodom/compiler";
import { mountTestPage } from "velodom/testing";
```

Inside application code, imports can use whichever style is clearest:

```js
// Portable relative import; needs no alias configuration.
import { listArticles } from "../../api/posts.js";

// Short Vite/editor alias configured by the starter and documentation application.
import { listArticles } from "@/api/posts.js";

// Standards-based package import alias declared in package.json#imports.
import { listArticles } from "#app/api/posts.js";
```

`@` and `#app` point to the consuming application's `src` directory, not to
VeloDom internals. The `velodom/*` subpaths are the stable framework boundary;
deep imports such as `velodom/lib/router.js` or workspace source paths are not
supported.

## Folder Conventions

Pages:

```text
src/pages/example/
  index.html          required
  script.js           optional, preferred
  script.ts           optional TypeScript alternative
  config.js           optional route, policy, and SEO config
  config.ts           optional typed config alternative
  *.css               optional scoped styles
```

Components:

```text
src/components/example/
  index.html          required
  script.js           optional, preferred
  script.ts           optional TypeScript alternative
  *.css               optional scoped styles
```

Layouts:

```text
src/layouts/default.vd        optional default page shell
src/layouts/blog.vd           optional named page shell

src/layouts/dashboard/
  index.html                  folder-mode layout template
  style.css                   optional scoped layout styles
```

Compatibility filenames `page.js`, `page.config.js`, `page.config.ts`, and
`component.js` are still discovered. New application code should prefer
`script.js` plus `config.js`, or `script.ts` plus `config.ts` when typing is
wanted. If variants coexist, TypeScript config has priority; keep one config
file per page so the source of route and SEO policy stays obvious.

## Layouts

Layouts are optional application-owned page shells for shared structure such as
navigation, sidebars, and footers. They live in `src/layouts/`, support folder
mode and `.vd` single-file mode, and are selected from page config.

If `src/layouts/default.vd` or `src/layouts/default/index.html` exists, pages
use it automatically unless their config opts out or chooses another layout.

```html
<!-- src/layouts/default.vd -->
<template>
  <div class="min-h-screen">
    <vd-component name="nav"></vd-component>

    <main>
      <vd-page></vd-page>
    </main>

    <vd-component name="footer"></vd-component>
  </div>
</template>
```

Each layout must contain exactly one `<vd-page></vd-page>` placeholder. The
router replaces that placeholder with the active page HTML before directives
and components are mounted, so layout components and page content share the
same page state and lifecycle.

Choose a named layout from `config.js`:

```js
export default {
  path: "/blog",
  layout: "blog",
  seo: {
    title: "Blog",
    description: "Latest articles."
  }
};
```

Disable layouts for focused pages such as login screens:

```js
export default {
  path: "/login",
  layout: false
};
```

## Optional Single-File Modules

Folder mode remains the default and keeps priority. VeloDom also supports an
optional `.vd` file format for pages, layouts, and components when a small module reads
better in one file.

Both forms are valid:

```text
src/pages/about/
  index.html
  script.js
  style.css
  config.js

src/pages/about.vd
```

Example page:

```html
<template>
  <main>
    <h1 vd-text="title"></h1>
    <button type="button" vd-on:click="increment()">
      Count: <span vd-text="count"></span>
    </button>
  </main>
</template>

<script>
export function init({ state }) {
  state.title = "About";
  state.count = 0;
  state.increment = () => {
    state.count += 1;
  };
}
</script>

<style>
main {
  padding: 2rem;
}
</style>

<config>
export default {
  path: "/about",
  seo: {
    title: "About",
    description: "About this VeloDom application."
  }
};
</config>
```

Supported blocks:

- `<template>` is required and is compiled by the same VeloDom compiler used for
  `index.html`.
- `<script>` is optional. Prefer named exports such as `init`, `mounted`, and
  `destroy`.
- `<style>` is optional and is scoped through the existing folder-style engine.
- `<config>` is optional for pages and follows the same shape as `config.js`.
  V1 `.vd` blocks use JavaScript; choose folder mode for TypeScript page config.

For page routing, Vite extracts only the `.vd` `<config>` block into eager
build metadata. The template, script, scoped style, and feature manifest remain
one lazy route chunk and load on first navigation, matching folder-page
behavior without changing the public `.vd` format.

Components can also use `.vd`:

```text
src/components/badge.vd
src/components/shared/card.vd
```

If `src/pages/about/` and `src/pages/about.vd` both exist, the folder version
wins. This keeps `.vd` additive instead of replacing the folder-first model.
The showcase includes `/single-file` and
the `/single-file` page as a working example. The component form uses the same
blocks and is shown below.

## Application Bootstrap

The recommended Vite bootstrap delegates framework wiring to Core:

```js
// src/main.js
import "./style.css";
import { mountVeloDom } from "velodom/vite";

await mountVeloDom();
```

`mountVeloDom()` automatically supplies the Vite resource adapter. Explicit
options always win. For advanced request rules it discovers default exports
from `src/api/routes.js|ts` and `src/api/middleware.js|ts`; keep only one
extension for each registry.

Applications can opt into middleware, auth providers, plugins, and router
guards when they need them:

```js
import { createValidationPlugin } from "velodom";
import { mountVeloDom } from "velodom/vite";

const app = await mountVeloDom({
  auth: {
    providers: {}
  },
  router: {
    notFoundPage: "404",
    beforeEach({ to, from }) {
      console.info("navigation", from?.path, "->", to.path);
      return true;
    }
  },
  plugins: [
    createValidationPlugin()
  ]
});
```

Programmatic navigation and teardown:

```js
await app.navigate("/features");
await app.destroy();
```

Advanced integrations may keep full explicit composition:

```js
import { createApp } from "velodom";
import { createViteAdapter } from "velodom/vite";
import routes from "./api/routes.js";

const app = createApp({
  adapter: createViteAdapter(),
  routes
});

await app.mount();
```

The page shell must provide the mount element:

```html
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```

## Pages

### Minimal Page

```html
<!-- src/pages/counter/index.html -->
<main>
  <h1 vd-text="title"></h1>
  <button type="button" vd-on:click="count++">
    Count: <span vd-text="count"></span>
  </button>
</main>
```

```js
// src/pages/counter/script.js
export const state = {
  title: "Counter",
  count: 0
};
```

The Vite adapter discovers the folder automatically. No route-registration
array is required.

### Page Hooks and Context

```js
export function init({ el, refs, state, ctx }) {
  state.message = `Post ${ctx.params.id}`;
  state.preview = ctx.query.preview === "true";
  state.routeTitle = ctx.meta.title || "Post";

  refs.titleInput?.focus();

  const unsubscribe = ctx.on("post:updated", payload => {
    state.message = payload.message;
  });

  ctx.onCleanup(unsubscribe);
}

export function mounted({ state, ctx }) {
  state.ready = true;

  ctx.onCleanup(() => {
    console.info("page cleanup");
  });
}

export async function destroy({ state }) {
  await saveDraftIfNeeded(state);
}
```

Page hook arguments:

- `el`: the `#app` element
- `refs`: elements collected from `vd-ref`
- `state`: the page's persistent reactive state
- `ctx.page`: logical page folder name
- `ctx.route`: resolved route record
- `ctx.params`: dynamic route params
- `ctx.query`: parsed query values
- `ctx.meta`: metadata from page config
- `ctx.components`: mounted component ref groups
- `ctx.on`, `off`, `once`, `emit`: page-scoped events
- `ctx.signal`: lifecycle `AbortSignal`
- `ctx.onCleanup(callback)`: reverse-order cleanup registration

Forward `ctx.signal` to async I/O in page and component hooks. A newer accepted
navigation cancels the pending replacement; a rejected newer guard does not.
Core stops awaiting cancelled imports, data, styles, hooks and error fallbacks,
observes late rejections, and prevents their late results from committing to a
newer page. Same-page hash navigation keeps the visible page's lifecycle alive.
Component cleanup captures its own instances rather than querying the reused
`#app` after an await. `destroy()` still runs before `ctx.onCleanup()`.
Application code that ignores its signal can still mutate state, DOM or a backend;
Core does not undo these effects. Check `ctx.signal.aborted` before direct writes
after an awaited operation. A hanging user cleanup cannot be forcibly completed.

Page state is preserved when navigating away and returning during the same app
runtime. Mounted component state is recreated.

### Page Data

Add an optional `data.js` or `data.ts` beside a page when its initial data is
part of the page rather than an event-driven request:

```js
// src/pages/blog/[slug]/data.js
export async function load({ params, query, mode, signal }) {
  const response = await fetch(`/api/articles/${params.slug}`, { signal });
  if (!response.ok) throw new Error("Article read failed");

  return {
    article: await response.json(),
    preview: query.preview === "true",
    source: mode
  };
}
```

For public, repeat-visited content, a page may opt into a small in-memory
browser cache. Without this export VeloDom always runs `load()`, exactly as it
did before:

```js
// Cache only public data. Do not enable this for account or session data.
export const cache = {
  maxAgeMs: 30_000,
  staleWhileRevalidateMs: 120_000
};
```

The cache belongs to one running VeloDom app, is keyed by page, route, and
query, and disappears on a full refresh. During the optional stale window the
current navigation receives the previous public value while VeloDom refreshes
the value for the next visit. Cached reads of the same route/query share one
pending load; uncached pages still load independently. Each app retains at
most 100 LRU values and tracks at most 100 pending reads. Expired values are
pruned, and excess distinct reads run uncached rather than being discarded.
Destroying the app clears stored/pending cache identities.

Client `load()` receives an optional `signal`; forward it to `fetch` or the
existing request helper as shown above. Build/server contexts may omit it.
An uncached read receives its navigation signal. A cached read uses a shared
transport signal: cancelling one subscriber does not cancel another, and the
last cancellation aborts/fences the pending read. SWR background reads are owned
by the cache, survive a page departure, and tracked reads are aborted on app
destruction. Cancelling navigation never commits a late loader result, even if
the application transport ignores abort. No cache, controller or prompt needs
to be configured for normal client navigation.

A failed background refresh keeps the previous value only within its original
stale window; it does not reset that value's age or produce an unhandled promise
rejection. After expiry, navigation waits for a new load and propagates failures
to the normal page error boundary. Background success updates the next visit,
not the already-mounted page. `createRequestCache().clear()` does not invalidate
this separate page-data cache.

For explicit freshness after a **confirmed** write, use the public app or
page/component `ctx` controls:

```js
// src/pages/catalog/script.js
export function init({ state, ctx }) {
  state.readError = "";
  state.afterSaveSuccess = async () => {
    ctx.invalidatePageData("catalog"); // discovered page name, not /catalog
    try {
      await ctx.refetchPageData(); // current page's data.js; updates state.data
    } catch (error) {
      if (!ctx.signal.aborted) state.readError = error.message;
    }
  };
}
```

Call that handler only from a successful mutation callback. A failed write
must not invalidate; an accepted write followed by a failed read remains an
accepted write. Keep the last good `state.data` and user draft, show a separate
read error, and retry only `ctx.refetchPageData()`, never the write. Invalidation
alone clears stored/pending route-and-query variants but does not fetch, remount,
or patch the visible page. Pass no argument to invalidate all discovered pages;
an unknown name/URL is rejected. A refresh coalesces concurrent explicit calls
even for uncached loaders; it returns the new loader result and updates only the
mounted `state.data`, without rerunning `init()`, `mounted()`, guards or navigation.
If the page has no loader, refresh resolves to `undefined`. Refresh before mount
or after departure/destroy rejects; cancellation prevents late Core commits.
Forward `signal` into I/O and check `ctx.signal` before application-owned writes
after awaits. Derived application fields initialized from old `data` do not
magically recompute: update those from the returned value if needed. Private
session/admin loaders remain uncached; never infer cookie or tenant scope from
this public-only page cache. Request-cache and page-data invalidation are distinct.

Page-data caching never reads or stores cookies, headers,
credentials, or secrets. Keep user-specific data uncached or own that policy
in an application server/API.

VeloDom loads this module before `init()`. Its return value is available as
`data` in page hooks and as `data` in page templates:

```html
<h1 vd-text="data.article.title"></h1>
```

```js
export function init({ data, state }) {
  state.title = data.article.title;
}
```

The same loader context is intentionally shaped for future build and server
adapters. Today the browser runtime passes `mode: "client"`. When a static
prerender entry supplies `data`, VeloDom safely transfers that JSON for the
matching direct route and skips the first client reload. Never return secrets,
cookies, tokens, or user-specific private data from a static entry.

### Page Config

```js
// src/pages/login/config.js
export default {
  path: "/login",
  meta: {
    title: "Login",
    requiresGuest: true
  },
  beforeEnter({ to, from }) {
    if (!canOpenLogin()) {
      return "/";
    }

    return true;
  },
  allowExternalWrite: [
    "loginResult",
    "loginLoading",
    "loginError"
  ]
};
```

`config.js` may:

- override the folder-generated URL with `path`
- expose route metadata through `meta`
- allow, block, or redirect through `beforeEnter`
- allow named cross-page request destinations with `allowExternalWrite`
- declare page SEO through `seo`
- opt into build-only route generation through `prerender`

## Routing

Folders become routes:

```text
src/pages/home/index.html                    -> /
src/pages/features/index.html                -> /features
src/pages/single-file.vd                     -> /single-file
src/pages/blog/posts/[id]/index.html         -> /blog/posts/:id
```

Static routes are ranked ahead of dynamic routes, so `/features` and
`/single-file` stay independent from dynamic article routes.

### Navigation Links

```html
<a href="/" vd-nav>Home</a>
<a href="/blog/posts/42?preview=true" vd-nav>Preview post</a>
```

`vd-nav` prevents a full document reload and sends the URL to the VeloDom
router.

### Params, Query, and Metadata

```js
export function init({ state, ctx }) {
  state.postId = ctx.params.id;
  state.preview = ctx.query.preview === "true";
  state.title = ctx.meta.title || "Post";
}
```

Repeated query keys become arrays; a single key becomes a string.

### Guards

Global guard:

```js
createApp({
  adapter,
  router: {
    beforeEach({ to, from }) {
      if (to.meta.requiresLogin && !sessionExists()) {
        return "/login";
      }

      return true;
    }
  }
});
```

Page guard in `config.js`:

```js
export default {
  beforeEnter({ to, from }) {
    if (to.query.blocked === "true") {
      return false;
    }
  }
};
```

Guard results:

- `true` or `undefined`: continue
- `false`: cancel
- an absolute app path such as `"/login"`: redirect

`router.beforeEach` also accepts an array. Global guards run sequentially in
array order, followed by the matched page's `beforeEnter`. Both forms may be
asynchronous. VeloDom validates the configuration for Vanilla JavaScript users:
non-function guards and redirects such as `"login"`, `"//external.test"`, or
external URLs fail clearly instead of silently bypassing policy.

Guards are scoped to one navigation. If a slow asynchronous guard finishes
after the user has already completed a newer navigation, its stale result is
ignored. When a guard blocks browser back/forward navigation, the router
restores the active URL so the address bar continues to describe the visible
page. Guards are a client-navigation convenience and never replace server-side
authorization for protected data.

### Hash Navigation, Scroll Restoration, and Focus

Routes may include hash fragments:

```html
<a href="/features#requests" vd-nav>Requests</a>
```

After navigation, VeloDom scrolls to the matching `id` or named anchor when it
exists. Browser scroll restoration is managed manually so back/forward
navigation restores the previous scroll position. `ctx.route.hash` exposes the
current fragment without the leading `#`. When only the hash changes on the
current path and query, VeloDom updates browser history and scrolls directly
without remounting the current page or rerunning route guards. Since intercepted
`history.pushState()`
does not produce a native event itself, VeloDom dispatches `hashchange` after
scroll and focus restoration with the standard `oldURL` and `newURL` values.
Route-aware tabs can therefore listen to one browser event:

```js
window.addEventListener("hashchange", () => {
  selectSection(window.location.hash.slice(1));
});
```

After route navigation, VeloDom moves keyboard and screen-reader focus to the
most useful target without changing the current scroll position. Hash routes
focus the matching `id` or named anchor. Normal route changes prefer
`data-vd-focus`, then `h1`, then the main page landmark, then `#app`.

```html
<h1 data-vd-focus>Blog</h1>
```

### Opt-in Route Prefetch

Route prefetch is intentionally opt-in per link. Add `vd-prefetch` beside
`vd-nav` when a route is likely to be opened soon:

```html
<a href="/blog" vd-nav vd-prefetch>Blog</a>
```

The compiler normalizes this to `data-vd-prefetch`. The router listens for
lightweight user intent events such as hover, keyboard focus, and touch start.
It warms the matched page resources, but it does not mount the page, run page
`init()`, change state, or navigate until the user actually opens the route.

## Reactive State

VeloDom state is a shallow reactive `Proxy`. Assigning a top-level state key
notifies dependent directives:

```js
state.count += 1;
state.user = {
  ...state.user,
  name: "Nadia"
};
```

For predictable updates, replace a nested object or array instead of mutating
it directly:

```js
// Preferred
state.items = [...state.items, newItem];

// A direct nested mutation is not independently proxied.
state.user.name = "Nadia";
```

`vd-model` and VeloDom's state-path writers notify correctly when writing a
nested path.

Components create local shallow reactive state that inherits missing reads
from their parent. Component writes remain local unless the component calls a
parent-owned function or uses another explicit communication API.

### Small State Seeds

Pages and components may export a plain `state` object from `script.js|ts` or
the `<script>` block of a `.vd` file. VeloDom merges it before `init()`, which
is ideal for static defaults and compact interactions:

```js
export const state = {
  count: 0,
  label: "Clicks"
};
```

```html
<button vd-on:click="count++">{{ label }}: {{ count }}</button>
```

`++` and `--` may update only application state values; props, events, globals,
and optional-chain targets cannot be changed. Keep `init({ state, ctx })` for
route data, refs, cleanup, asynchronous work, props-derived values, and other
lifecycle behavior. State seeds must be plain objects and cannot replace
VeloDom's protected internal keys.

### Optional Derived State

Most pages only need plain state assignments. When a value is derived or an
integration needs a small synchronization hook, import the optional helpers:

```js
import { computed, effect, watch } from "velodom";

export function init({ state, ctx }) {
  state.quantity = 1;
  state.price = 12;

  const total = computed(state, current => (
    current.quantity * current.price
  ));

  const stopWatching = watch(
    state,
    current => current.quantity,
    (quantity, previousQuantity) => {
      console.info("Quantity changed", previousQuantity, quantity);
    },
    { immediate: true }
  );

  const stopEffect = effect(state, current => {
    document.title = `Cart (${current.quantity})`;

    return () => {
      // Clean up work from the previous run when needed.
    };
  });

  state.total = total;
  ctx.onCleanup(() => {
    total.dispose();
    stopWatching();
    stopEffect();
  });
}
```

Use `total.value` in a template. These helpers subscribe only to the state you
pass to them; they do not add automatic dependency tracking, a global store, or
a new template syntax.

## Directives

Write preferred `vd-*` syntax in application HTML. The compiler converts it to
internal `data-vd-*` attributes. Legacy `data-vd-*` templates continue to run,
but new examples should use `vd-*`.

### Text

```html
<h1 vd-text="title"></h1>
<p vd-text="user?.bio || 'No biography'"></p>
```

Text is assigned through `textContent`, not HTML injection.

For inline text, use compiler-first interpolation instead of adding extra
elements only to print one value:

```html
<p>{{ name }} is {{ age }} years old.</p>
```

The compiler turns each `{{ expression }}` into the same safe reactive text
binding used by `vd-text`. Expressions are validated during compilation and
are ignored inside `<script>` and `<style>` content.

When documenting VeloDom syntax or showing mustache text literally, escape the
opening braces with a backslash:

```html
<p>Write \{{ name }} to show the syntax literally.</p>
```

For larger literal examples, mark the container with `vd-pre`. The compiler
normalizes it to `data-vd-pre` and leaves the whole element body untouched:

```html
<pre vd-pre><code>{{ name }} remains literal here.</code></pre>
```

### Conditionals

```html
<p vd-if="status === 'loading'">Loading…</p>
<p vd-elseif="status === 'error'">Request failed.</p>
<p vd-else>Ready.</p>
```

`vd-if` and `vd-elseif` expressions must return booleans. Follow-up branches
must be adjacent siblings. Inactive branches suspend dependent expression
evaluation, so unavailable data is not accessed prematurely.

### Visibility

```html
<aside vd-show="panelOpen">Settings</aside>
```

`vd-show` keeps the node mounted and preserves its layout slot by toggling
`visibility` and pointer events. It does not behave like `display: none`.

### Loops

```html
<article vd-for="post in posts">
  <h2 vd-text="post.title"></h2>
</article>

<li vd-for="(item, index) in items">
  <span vd-text="index + 1"></span>
  <span vd-text="item"></span>
</li>
```

`$index` is also available when only the item name is declared. Arrays and
other iterable values are accepted. A component can own the loop and receive
the current loop scope through `vd-props`:

```html
<vd-component
  vd-for="post in posts"
  vd-key="post.id"
  name="blog/post-card"
  vd-props="{ post }"
  vd-ref="postCards"
></vd-component>
```

Use `vd-key` when an item has a stable, unique, non-empty string or finite
number identity. Reorders of the same item objects move their existing DOM
ranges and component instances, preserving focus, form values, and local
component state. Inserts mount only new items and removals dispose only removed
listeners, subscriptions, lifecycle resources, and keyed refs.

VeloDom deliberately takes the conservative path when a loop is unkeyed, a key
is missing/invalid/duplicated, or the object behind an existing key is replaced:
the affected list item is rebuilt so stale component props cannot survive.

### Two-Way Model

```html
<input type="text" vd-model="profile.name">
<input type="checkbox" vd-model="accepted">
```

Text-like controls write strings. Checkboxes write booleans.

### Attribute and Property Bindings

```html
<img
  vd-bind:src="avatarUrl"
  vd-bind:alt="avatarAlt"
>

<a vd-bind:href="postUrl">Open post</a>

<input
  vd-bind:value="search"
  vd-bind:disabled="searching"
  vd-bind:checked="selected"
>
```

Supported `vd-bind:*` targets:

- `src`
- `href`
- `alt`
- `value`
- `disabled`
- `checked`
- `class`
- `style`
- `attr`

The shorthand forms `vd-src`, `vd-href`, `vd-alt`, `vd-value`,
`vd-disabled`, and `vd-checked` are also compiled.

### Class, Style, and Generic Attributes

```html
<section
  vd-class="{
    active: enabled,
    'opacity-50': disabled
  }"
  vd-style="{
    color: accent,
    fontSize: size
  }"
  vd-attr="{
    title: tooltip,
    'aria-busy': loading,
    'data-kind': kind
  }"
></section>
```

Class bindings accept a string, array, or truthy object map. Style bindings
accept a CSS string or object; switching formats removes declarations owned by
the previous binding. Object keys support camelCase and case-sensitive CSS
variables such as `'--BrandColor'`. Generic attribute values of `false`, `null`,
or `undefined` remove the attribute; `true` creates an empty presence attribute.
ARIA attributes are different: `vd-attr="{ 'aria-busy': loading }"` writes the
literal tokens `"true"` and `"false"`. Use `null` or `undefined` to remove an ARIA
attribute. No extra application helper or compiler option is required.

### Event Directives

```html
<button
  type="button"
  vd-on:click.prevent.stop.once="save()"
>
  Save once
</button>

<input vd-on:keydown.enter="submitSearch()">
<button vd-on:click="select($event)">Select</button>
```

Supported lifecycle modifiers:

- `.prevent`
- `.stop`
- `.once`

Supported key modifiers:

- `.enter`
- `.tab`
- `.delete`
- `.esc`
- `.space`
- `.up`
- `.down`
- `.left`
- `.right`

The event is available as `$event`. Handlers and listeners are removed when
their page/component subtree is disposed.

### Refs

```html
<input vd-ref="searchInput">
<button vd-on:click="focusSearch()">Focus</button>
```

```js
export function init({ state, refs }) {
  state.focusSearch = () => {
    refs.searchInput?.focus();
  };
}
```

Repeated DOM ref names resolve to arrays.

### Safe Expression Grammar

Supported template expression features include:

- literals and identifiers
- arrays and objects
- member access and optional chaining
- arithmetic, comparison, logical, nullish, and conditional operators
- safe function and method calls
- template literals supported by the parser

Unsafe prototype members, function constructors, unrestricted host globals,
`call`, `apply`, and `bind` are blocked.

Assignments, variable declarations, arrow functions, `new`, statements, and
complex application logic do not belong in template expressions. Put that
logic in `script.js` or `script.ts`.

## Components

### Basic Component

```html
<!-- src/components/status-badge/index.html -->
<span
  vd-text="label"
  vd-class="{ online: active, offline: !active }"
></span>
```

```js
// src/components/status-badge/script.js
export function init({ props, state }) {
  state.label = props.label || "Unknown";
  state.active = props.active === "true";
}
```

Use it from a page or another component:

```html
<vd-component
  name="status-badge"
  vd-prop-label="Online"
  vd-prop-active="true"
></vd-component>
```

`<vd-component>` is hostless: after mounting, its rendered children replace the
custom host element.

To preserve a wrapper, use attribute syntax:

```html
<section
  vd-component="status-badge"
  vd-prop-label="Online"
></section>
```

### Static and Dynamic Props

Static string props:

```html
<vd-component
  name="user-card"
  vd-prop-title="Editor"
></vd-component>
```

Dynamic object props:

```html
<vd-component
  name="user-card"
  vd-props="{
    title: pageTitle,
    user: selectedUser
  }"
></vd-component>
```

Component `props` are initial values. Copy values into local state when the
component needs to change them. When the component also owns `vd-for`, dynamic
props and its `vd-key` expression use the current item/index scope.

### Nested Component Folders

```text
src/components/blog/post-card/
```

```html
<vd-component name="blog/post-card"></vd-component>
```

The compatibility `path` form is also supported:

```html
<vd-component name="post-card" path="blog"></vd-component>
```

### Expose

An exposed method is available both to the component template and to parent
component refs:

```js
// src/components/modal/script.js
export function init({ state }) {
  state.opened = false;

  function open() {
    state.opened = true;
  }

  function close() {
    state.opened = false;
  }

  return {
    state,
    expose: {
      open,
      close
    }
  };
}
```

The V1 component public API pattern is frozen as `return { state, expose }`.
`expose` must be a plain object. Its function members are called with the
component state as `this`, and non-function values are copied as public values.
Protected framework state names cannot be replaced through `expose`.

For TypeScript component scripts, type the public API with `ComponentExpose`:

```ts
import type { ComponentExpose, ComponentScriptContext } from "velodom";

type ModalState = {
  opened: boolean;
};

export function init({ state }: ComponentScriptContext<ModalState>) {
  state.opened = false;

  const expose: ComponentExpose = {
    open() {
      state.opened = true;
    },
    close() {
      state.opened = false;
    }
  };

  return {
    state,
    expose
  };
}
```

```html
<!-- src/components/modal/index.html -->
<dialog vd-bind:attr="{ open: opened }">
  <button type="button" vd-on:click="close()">Close</button>
</dialog>
```

```html
<!-- Parent page -->
<vd-component name="modal" vd-ref="editorModal"></vd-component>
<button vd-on:click="openEditor()">Open</button>
```

```js
export function init({ state }) {
  state.openEditor = () => {
    state.components.editorModal?.open?.();
  };
}
```

### Grouped and Keyed Component Refs

```html
<vd-component
  name="event-card"
  vd-ref="cards"
  vd-key="primary"
></vd-component>

<vd-component
  name="event-card"
  vd-ref="cards"
  vd-key="secondary"
></vd-component>
```

```js
state.components.cards.open(); // calls open() on every instance
state.components.cards.first?.open();
state.components.cards.byKey.primary?.close();
state.components.cards.all.forEach(card => card.open());
```

### Slots

Component template:

```html
<!-- src/components/panel/index.html -->
<section>
  <header vd-get-child="header"></header>
  <div vd-get-child="default"></div>
  <footer vd-get-child="footer"></footer>
</section>
```

Consumer:

```html
<vd-component name="panel">
  <vd-child name="header">
    <h2>Profile</h2>
  </vd-child>

  <vd-child name="default">
    <p>Main content</p>
  </vd-child>

  <vd-child name="footer">
    <button type="button">Save</button>
  </vd-child>
</vd-component>
```

### Component Lifecycle

Components support the same `init`, `mounted`, `destroy`, `ctx.signal`, and
`ctx.onCleanup` lifecycle pattern as pages. Component context additionally
includes:

- `ctx.ref`
- `ctx.key`
- page route params/query/meta
- page event functions
- access to page component groups

Nested components clean up before their parent.

### Scoped Styles

Any CSS discovered under a mounted page/component folder is loaded lazily and
prefixed with a generated scope attribute.

```css
/* src/components/status-badge/style.css */
:scope {
  display: inline-flex;
}

.online {
  color: green;
}

@media (width >= 48rem) {
  .online {
    font-weight: 700;
  }
}
```

Supported nested at-rules include media, supports, container, and layer blocks.

## Lifecycle, Refs, and Events

Lifecycle order for a normal page:

1. clean up the previous page
2. load page HTML and compiled feature manifest
3. apply page SEO and scoped styles
4. run `init`
5. mount directives and components
6. run `mounted`
7. on navigation, run component cleanup, page `destroy`, lifecycle cleanup,
   and event cleanup

The lifecycle signal aborts before registered cleanup callbacks execute.
Cleanup callbacks execute in reverse registration order.

Page-scoped events:

```js
export function init({ state, ctx }) {
  const unsubscribe = ctx.on("cart:changed", cart => {
    state.cart = cart;
  });

  ctx.once("welcome", message => {
    state.notice = message;
  });

  state.notifyCartChanged = cart => {
    ctx.emit("cart:changed", cart);
  };

  ctx.onCleanup(unsubscribe);
}
```

The event hub is cleared when the page is destroyed. It is useful for
communication among a page and its mounted components; it is not a global
application event bus.

### Ref vs Expose vs Emit vs Request

Choose the smallest communication mechanism that matches the relationship:

| Need | Use |
| --- | --- |
| Focus/read a DOM element owned by the same template | `vd-ref` and `refs` |
| Ask a known child component to perform an action | component `vd-ref` and `expose` |
| Notify a page or multiple listeners about something that happened | `ctx.emit` / `ctx.on` |
| Run async application/API work with loading/error/auth policy | `vd-request` |

Child component event:

```js
// src/components/select-card/script.js
export function init({ props, state, ctx }) {
  state.select = () => {
    ctx.emit("card:selected", {
      id: props.id
    });
  };
}
```

```html
<!-- src/components/select-card/index.html -->
<button type="button" vd-on:click="select()">Select</button>
```

Page listener:

```js
export function init({ state, ctx }) {
  ctx.on("card:selected", ({ id }) => {
    state.selectedId = id;
  });
}
```

## Requests

VeloDom separates:

- application API handlers in `src/api`
- a named route registry
- declarative request triggers in HTML
- generic request/auth/middleware execution in Core

`src/api` is compiled into the browser application. Its name means
"application request layer," not "trusted server route." Never place database
credentials, signing keys, payment secrets, authorization decisions, or
authoritative price/stock/tax logic there. Keep those in a separately deployed
backend and let `src/api` call it with `requestJson`.

For private resources, the backend must independently verify the session,
resource owner, role, and tenant; enforce CSRF/session expiry; and send
`Cache-Control: private, no-store` plus an appropriate `Vary` header. Client
guards and request `roles` remain navigation/UX policy only. Sensitive writes
need explicit idempotency semantics; do not apply automatic retry to order or
payment transitions unless the server contract makes repetition safe.

### HTTP Handler

```js
// src/api/posts.js
import { requestJson } from "velodom";

export async function getOne({ id }, { signal } = {}) {
  return requestJson(`/api/posts/${id}`, {
    signal
  });
}

export async function create(payload, { signal } = {}) {
  return requestJson("/api/posts", {
    method: "POST",
    body: payload,
    signal
  });
}
```

`requestJson`:

- sets `Accept: application/json`
- adds JSON content type only when a body is present
- forwards standard `fetch` options such as `cache`, `credentials`, `redirect`,
  and `signal` when supplied; private reads can request `cache: "no-store"`
- returns `null` for HTTP 204
- throws `ApiError` with `status`, `url`, and parsed `body`

### File Routes (Simplest)

For a straightforward handler, use a nested file with one default export. Its
folder path becomes the `vd-request` name, so no central registry is needed:

```js
// src/api/posts/get-one.js
import { requestJson } from "velodom";

export default function getOne({ id }, { signal } = {}) {
  return requestJson(`/api/posts/${id}`, { signal });
}
```

```html
<button vd-request="posts.get-one" vd-params="{ id: selectedId }">
  Load post
</button>
```

Only files below a folder are discovered. A root file such as
`src/api/posts.js` remains an ordinary helper that page scripts can import.
Use `src/api/routes.js` when a route needs auth, middleware, roles, or a name
that does not match a file path.

### Route Registry (Advanced)

```js
// src/api/routes.js
import * as posts from "./posts.js";

export default {
  "posts.getOne": posts.getOne,
  "posts.create": {
    handler: posts.create,
    middleware: ["trimStrings"],
    auth: true,
    roles: ["editor", "admin"]
  }
};
```

The explicit registry takes precedence over file routes. A route is either a
handler function or:

```js
{
  handler,
  auth,
  roles,
  middleware
}
```

### Simple Declarative Request

```html
<button
  type="button"
  vd-request="posts.getOne"
  vd-params="{ id: selectedId }"
  vd-target="postResult"
  vd-loading="postLoading"
  vd-error="postError"
>
  Load post
</button>

<span vd-show="postLoading">Loading…</span>
<p vd-if="postError !== ''" vd-text="postError"></p>
<h2 vd-if="Boolean(postResult)" vd-text="postResult?.title || ''"></h2>
```

### Request Config and Automatic Status Names

```html
<button
  vd-request="posts.getOne"
  vd-request-config="{
    params: { id: selectedId },
    target: 'postResult',
    autoState: true
  }"
>
  Load
</button>
```

With target `postResult`, automatic state uses:

```text
postResult
postLoading
postError
```

If the target does not end with `Result`, VeloDom appends `Loading` and
`Error` to the target name.

This naming convention is frozen for V1:

- `Result` marks the result-state suffix that can be replaced.
- `Loading` is the derived loading-state suffix.
- `Error` is the derived error-state suffix.

Nested targets preserve their parent path. For example,
`article.currentResult` derives `article.currentLoading` and
`article.currentError`.

`vd-auto-state` is the preferred attribute equivalent of `autoState: true`.
It compiles to the stable runtime attribute `data-vd-request-state`.
`vd-request-state` / `data-vd-request-state` remain supported for existing
templates and direct data-attribute usage.

### Recipe: List Loading, Error, Empty, and Success

Use one result target and `vd-auto-state`; do not assign loading/error fields
manually in a click handler. Keep the loop expression iterable before the first
response because nested directives are evaluated independently:

```html
<button
  type="button"
  vd-request="products.list"
  vd-target="productsResult"
  vd-auto-state
>Load products</button>

<p vd-show="productsLoading" aria-live="polite">Loading products…</p>
<p vd-if="productsError !== ''" role="alert">{{ productsError }}</p>
<p vd-if="!productsLoading && productsError === '' && productsResult?.items?.length === 0">
  No products found.
</p>
<ul vd-if="!productsLoading && productsError === '' && Boolean(productsResult?.items?.length)">
  <li vd-for="product in (productsResult?.items || [])" vd-key="product.id">
    {{ product.name }}
  </li>
</ul>
```

The documentation site executes this exact displayed recipe against success,
empty, and failure responses. No list-specific directive or second request
state abstraction is required.

### Request Debounce

Use debounce for search forms, autosave buttons, and other actions where rapid
repeated triggers should collapse into one request. The latest scheduled
trigger wins, and loading/error/result state updates start when the request
actually runs after the delay.

Config form:

```html
<button
  type="button"
  vd-request="posts.search"
  vd-request-config="{
    params: { q: query },
    target: 'searchResult',
    autoState: true,
    debounceMs: 300
  }"
>
  Search
</button>
```

Attribute shorthand:

```html
<button
  type="button"
  vd-request="posts.search"
  vd-debounce="searchDelay"
  vd-params="{ q: query }"
  vd-target="searchResult"
  vd-auto-state
>
  Search
</button>
```

`vd-debounce` is compiled to `data-vd-debounce` and accepts a safe expression
that must resolve to a non-negative number of milliseconds.

### Request Throttle

Use throttle for save buttons, destructive actions, refresh controls, and any
request that should run immediately but not repeatedly during a short time
window. VeloDom uses leading throttle: the first trigger runs, repeated
triggers inside the window are ignored, and a later trigger can run after the
window expires.

Config form:

```html
<button
  type="button"
  vd-request="posts.save"
  vd-request-config="{
    params: { title: draft.title },
    target: 'saveResult',
    throttleMs: 1000
  }"
>
  Save
</button>
```

Attribute shorthand:

```html
<button
  type="button"
  vd-request="posts.save"
  vd-throttle="saveDelay"
  vd-params="{ title: draft.title }"
  vd-target="saveResult"
>
  Save
</button>
```

`vd-throttle` is compiled to `data-vd-throttle` and accepts a safe expression
that must resolve to a non-negative number of milliseconds.

### Request Retry

Use retry for transient failures such as short network interruptions or
temporary API instability. Retry is disabled by default and must be enabled
per request in `vd-request-config`.

```html
<button
  type="button"
  vd-request="posts.save"
  vd-request-config="{
    params: { title: draft.title },
    target: 'saveResult',
    error: 'saveError',
    retry: 2,
    retryDelayMs: 100
  }"
>
  Save
</button>
```

`retry: true` performs one extra attempt. `retry: 2` or `retries: 2` performs
up to two retries after the first failed attempt. `retryDelayMs` / `delayMs`
adds an optional delay between attempts. Auth and configuration failures are
not retried; retry applies only after a request is configured and authorized.

### Auth Failure Redirects

Use auth redirects when a protected request should send the visitor to a login
or sign-in page after frontend auth fails. Redirects are disabled by default
and must use an application path that starts with `/`.

Route config form:

```js
export default {
  "posts.secure": {
    handler: loadSecurePosts,
    auth: true,
    authRedirect: "/login"
  }
};
```

Per-request override:

```html
<button
  type="button"
  vd-request="posts.secure"
  vd-request-config="{
    target: 'securePostsResult',
    error: 'securePostsError',
    redirectOnAuthFailure: '/signin'
  }"
>
  Load secure posts
</button>
```

VeloDom still writes request error state and emits the request error event
before navigating. External URLs and protocol-relative values are rejected to
avoid unsafe open redirects.

### Request Hooks and Success Callbacks

Use global request hooks for app-wide analytics, progress indicators, or
policy checks:

```js
createApp({
  adapter,
  routes,
  requestHooks: {
    beforeRequest(payload) {
      console.log("before", payload.route, payload.params);
    },
    afterRequest(payload) {
      console.log("after", payload.route, payload.ok);
    }
  }
});
```

`beforeRequest` runs after config/auth succeeds and before middleware/handler
execution. Returning `false` cancels that request. `afterRequest` runs after a
completed success or reported failure.

For one request, use an `onSuccess` callback in `vd-request-config`:

```html
<button
  type="button"
  vd-request="posts.save"
  vd-request-config="{
    target: 'saveResult',
    onSuccess: rememberSavedPost
  }"
>
  Save
</button>
```

The callback receives the same payload shape as request hooks and runs after
the target state is written.

### Forms

```html
<form
  vd-validate
  vd-request="posts.create"
  vd-request-config="{
    target: 'createPostResult',
    autoState: true
  }"
>
  <input name="title" vd-model="draft.title" required>
  <textarea name="body" vd-model="draft.body"></textarea>
  <button type="submit" vd-bind:disabled="createPostLoading">
    Create
  </button>
</form>
```

Form values are collected with `FormData`. Explicit `params` are merged over
form values.

Validation remains optional. Install `createValidationPlugin()` and mark only
the forms that should be checked with `vd-validate`. The plugin uses native
browser validation attributes such as `required`, `minlength`, `maxlength`, and
`min`, `max`, and `pattern`. Invalid validated forms are stopped before
declarative request handlers run, and the plugin marks invalid forms/fields
with `data-vd-invalid` and `data-vd-field-invalid`.

The validation API is intentionally small:

- `vd-validate` opts a form into validation.
- `createValidationPlugin()` installs the native validation bridge.
- `data-vd-invalid` marks an invalid validated form.
- `data-vd-field-invalid` marks each invalid control.

This keeps common forms HTML-first while leaving schema validation and custom
business rules to application code or optional future extensions.

### Progressive Native Forms

For a server-backed form that must still submit normally without JavaScript,
keep standard HTML `action`, `method`, named controls, and hidden CSRF input.
Then install the optional enhancement plugin and add `vd-form`:

```js
import { createProgressiveFormsPlugin } from "velodom";

createApp({
  adapter,
  plugins: [createProgressiveFormsPlugin()]
});
```

```html
<form vd-form action="/contact" method="post">
  <label>Email <input name="email" type="email" required></label>
  <input type="hidden" name="csrf" value="application-issued-token">
  <small id="email-error" vd-form-error="email"></small>
  <button type="submit">Send</button>
  <p vd-form-status aria-live="polite"></p>
</form>
```

With no JavaScript or no plugin, this is an ordinary browser form. With the
plugin, VeloDom validates native constraints, sends the form with the original
GET/POST semantics, preserves hidden CSRF fields, and applies these optional
markers:

- `data-vd-form-state`: `loading`, `success`, or `error` on the form.
- `data-vd-form-loading`: present only while the request is active.
- `vd-form-status`: receives a safe text status message.
- `vd-form-error="fieldName"`: receives a server field error from
  `{ errors: { fieldName: "message" } }` JSON responses. The plugin connects
  that message with `aria-errormessage` (assigning a unique ID if omitted).
- `data-vd-form-field-error` and `aria-invalid`: applied to invalid controls;
  the first invalid field receives focus. Existing `aria-describedby` remains.

`vd-form` and `vd-request` are alternative submission paths: do not put both on
the same form. The progressive plugin owns native `action`, GET/POST and
`FormData`. For a file upload use ordinary HTML
`<form vd-form method="post" enctype="multipart/form-data">` with a named
file input and a server endpoint; the plugin passes the original `FormData`
to `fetch` without a JSON or manual multipart content type. An application
can supply its own transport via the plugin's `fetch` option. Pending enhanced
submissions are aborted on app teardown or form removal (including route
replacement). A transport ignoring abort cannot emit late success/redirect
effects. Neither abort nor a failed redirect rolls back a server-accepted
write; a redirect failure retains success with a navigation warning. Browser
upload progress/resume and backend file policy are not supplied by VeloDom.

The server keeps ownership of validation, session cookies, CSRF policy, and
redirect responses. A standard HTTP redirect or a successful JSON
`{ redirect: "/thanks" }` follows normally. For custom CSRF headers or a
custom redirect integration, pass `headers` or `onRedirect` to
`createProgressiveFormsPlugin()`.

For a dirty edit, use the existing `router.beforeEach` guard in application
bootstrap and a page-owned draft tracker rather than a global framework form
store. The store reference implements `confirmEditDeparture` in
`src/domain/forms/unsaved-edit.js`: it asks before app links and Back while
the edit is dirty, returns `false` when the user keeps editing, and registers
`beforeunload` only for a dirty mounted draft. Save/reload/discard removes the
prompt. Native unload dialogs are best-effort and browser-controlled; never
rely on them to save data. Its product form compares only real edit fields, not
the fixture response selector. A failed/conflicting write keeps that draft.

### Recipe: Repeatable Fields, Steps, and Latest-Only Validation

The `/forms` teaching page is a runnable, local-only example of a larger form.
It uses two ordinary HTML forms for the editable steps and a final review
section. Native `required`, `minlength` and `type="email"` constraints remain
visible; `reportValidity()` prevents advancing an invalid step. The page keeps
`step`, a small touched map and draft values in page state, without a Core
form store. Repeated contacts have stable IDs and immutable array updates:

```html
<div vd-for="contact in contacts" vd-key="contact.id">
  <input type="email" name="email" required vd-value="contact.email"
    vd-on:input="updateContact(contact.id, $event.target.value)">
</div>
```

```js
state.updateContact = (id, email) => {
  state.contacts = state.contacts.map(contact =>
    contact.id === id ? { ...contact, email } : contact
  );
};
```

A small application-owned `createLatestValidation(check, ctx.signal)` aborts
the previous field check. It also checks ownership after the await, so even a
transport that ignores abort cannot display an old result over a newer value.
Register its `cancel()` with `ctx.onCleanup`; do not hold a validation promise
or listener past page departure. The lesson's 100 ms reserved-name check is
local and intentionally does **not** prove uniqueness. A real backend must
validate again on submit. This pattern composes native constraints, the optional
validation plugin and server field errors rather than requiring a schema
package. We evaluated a schema adapter for V1.x but did not add one: the
current reference cases need no new dependency or form DSL. Revisit only with
concrete repeated schema-integration demand.

### Recipe: Create, Update, and Delete Forms

Use the same small pattern for CRUD screens:

1. keep draft values in page state with `vd-model`
2. point the form/button at an application-owned API route with `vd-request`
3. use `target` plus `autoState` so VeloDom derives result/loading/error names
4. install `createValidationPlugin()` only when native form validation is needed
5. include an expected revision for collaborative edits, preserve the draft on
   failure, and let the user explicitly reload before retrying a conflict

API routes stay in `src/api`:

```js
// src/api/posts.js
import { requestJson } from "velodom";

export function create(params, { signal } = {}) {
  return requestJson("https://dummyjson.com/posts/add", {
    method: "POST",
    body: params,
    signal
  });
}

export function update(params, { signal } = {}) {
  const { id, ...body } = params;

  return requestJson(`https://dummyjson.com/posts/${id}`, {
    method: "PUT",
    body,
    signal
  });
}

export function remove({ id }, { signal } = {}) {
  return requestJson(`https://dummyjson.com/posts/${id}`, {
    method: "DELETE",
    signal
  });
}
```

Register names once:

```js
// src/api/routes.js
import * as posts from "./posts.js";

export default {
  "posts.create": posts.create,
  "posts.update": posts.update,
  "posts.delete": posts.remove
};
```

Create form:

```html
<form
  vd-validate
  vd-request="posts.create"
  vd-target="createResult"
  vd-auto-state
>
  <input name="title" vd-model="createDraft.title" required>
  <textarea name="body" vd-model="createDraft.body" required></textarea>

  <button type="submit" vd-bind:disabled="createLoading">Create</button>
  <p vd-show="createLoading">Creating...</p>
  <p vd-if="createError !== ''" vd-text="createError"></p>
  <p vd-if="Boolean(createResult?.id)">
    Created #{{ createResult.id }}
  </p>
</form>
```

Update form:

```html
<form
  vd-validate
  vd-request="posts.update"
  vd-request-config="{
    params: {
      id: editDraft.id,
      title: editDraft.title,
      body: editDraft.body
    },
    target: 'updateResult',
    autoState: true
  }"
>
  <input name="id" vd-model="editDraft.id" required>
  <input name="title" vd-model="editDraft.title" required>
  <textarea name="body" vd-model="editDraft.body"></textarea>

  <button type="submit" vd-bind:disabled="updateLoading">Update</button>
<p vd-if="Boolean(updateResult?.id)">
    Updated #{{ updateResult.id }}
  </p>
</form>
```

For an edit that can race another writer, send the revision loaded with the
draft. The backend must compare it atomically; a disabled button alone cannot
prevent stale writes. Request failures update `updateError` without replacing
`editDraft`, so keep the fields mounted and offer an explicit reload action:

```html
<input type="hidden" name="expectedRevision" vd-value="editDraft.revision">

<p vd-if="updateError !== ''" role="alert" tabindex="-1">
  {{ updateError }}
</p>

<button type="button" vd-on:click="reloadFromServer()">
  Reload server version
</button>
```

```js
// Optional page data.js loads the server record for this edit page.
export function init({ state, ctx }) {
  state.reloadFromServer = async () => {
    const record = await ctx.refetchPageData();
    if (ctx.signal.aborted) return;
    state.editDraft = { ...record }; // explicit user choice replaces the draft
  };
}
```

The administration route in `examples/velodom-store` uses this explicit
reload choice against a real local HTTP fixture and restores focus to the
result. Refresh alone updates `state.data`, not a user's edit fields; only the
button handler copies the authoritative record into the draft. Its backend
enforces session/role/tenant policy; a client route guard is not authorization.

Delete actions can be buttons because they usually need only one parameter:

```html
<input vd-model="deleteId" required>

<button
  type="button"
  vd-request="posts.delete"
  vd-request-config="{
    params: { id: deleteId },
    target: 'deleteResult',
    autoState: true
  }"
  vd-bind:disabled="deleteLoading"
>
  Delete
</button>

<p vd-show="deleteLoading">Deleting...</p>
<p vd-if="deleteError !== ''" vd-text="deleteError"></p>
<p vd-if="Boolean(deleteResult?.id)">
  Deleted #{{ deleteResult.id }}
</p>
```

Initialize draft state in the page script:

```js
// src/pages/studio/script.js
export function init({ state }) {
  state.createDraft = {
    title: "",
    body: ""
  };
  state.editDraft = {
    id: "1",
    title: "",
    body: ""
  };
  state.deleteId = "1";
}
```

This recipe is intentionally generic. The current V1 site keeps its application
surface smaller and demonstrates request state through local article routes
instead of shipping a CRUD studio page.

### Cross-Page State Writes

Destination page:

```js
// src/pages/home/config.js
export default {
  allowExternalWrite: [
    "externalPostResult",
    "externalPostLoading",
    "externalPostError"
  ]
};
```

Request from another page:

```html
<button
  vd-request="posts.getOne"
  vd-params="{ id: selectedId }"
  vd-target="home"
  vd-state="externalPostResult"
  vd-auto-state
>
  Load into home state
</button>
```

Nested page folders can be addressed through a full target or `vd-path`.
Prototype keys, framework-owned keys, unknown pages, and destinations missing
from `allowExternalWrite` are rejected.

### Request Events

```js
import { VD_REQUEST } from "velodom";

export function init({ state, ctx }) {
  ctx.on(VD_REQUEST.EVENTS.SUCCESS, payload => {
    state.lastCompletedRoute = payload.route;
  });

  ctx.on(VD_REQUEST.EVENTS.ERROR, payload => {
    state.lastErrorStage = payload.stage;
  });
}
```

Requests are automatically aborted when:

- the same element starts a newer request
- another request replaces the same result destination
- the owner page/component is unmounted

### Recipe: Common Framework Error Examples

VeloDom reports most user-facing problems with a title, source location,
directive or route context when available, and a hint. These examples show the
usual cause and the fastest fix.

Unknown directive at compile time:

```html
<!-- Problem -->
<button vd-click="save()">Save</button>

<!-- Fix -->
<button vd-on:click="save()">Save</button>
```

The compiler reports `VD_COMPILER_UNKNOWN_DIRECTIVE` because preferred
directives must use known `vd-*` names. Event handlers use `vd-on:event`.

Invalid expression:

```html
<!-- Problem -->
<p vd-text="user &&"></p>

<!-- Fix -->
<p vd-text="user?.name || 'Guest'"></p>
```

Expressions are parsed safely during compilation. Syntax errors fail early
instead of becoming browser `eval` failures.

Condition accessed data before it existed:

```html
<!-- Problem -->
<a vd-if="Boolean(post?.id)" vd-bind:href="'/posts/' + post.id"></a>

<!-- Fix -->
<a vd-if="Boolean(post?.id)" vd-bind:href="'/posts/' + post?.id"></a>
```

Inactive conditional branches suspend their own expression updates, but
attributes on the same active element should still use optional access when
data may be loading.

Missing page state function:

```html
<!-- Problem -->
<button vd-on:click="announce()">Emit</button>
```

```js
// Fix: define the function in the page or component state.
export function init({ state, ctx }) {
  state.announce = () => {
    ctx.emit("demo:announce", {
      message: "Hello"
    });
  };
}
```

Runtime event expressions run against explicit page/component state, `props`,
`event`, and `el`. If a function is not defined there, VeloDom reports an
Expression Evaluation Error.

Invalid layout:

```html
<!-- Problem: no page placeholder -->
<template>
  <main>Shared shell</main>
</template>

<!-- Fix -->
<template>
  <main>
    <vd-page></vd-page>
  </main>
</template>
```

Every layout must contain exactly one `<vd-page></vd-page>` placeholder so the
router can compose the shared shell and the active page deterministically.

Invalid component path:

```html
<!-- Problem -->
<vd-component name="post-card"></vd-component>

<!-- Fix when the component lives in src/components/blog/post-card/ -->
<vd-component name="blog/post-card"></vd-component>
```

Component names follow the folder path below `src/components`. Single-file
components follow the same rule, so `src/components/blog/post-card.vd` is also
loaded as `blog/post-card`.

Invalid request target:

```html
<!-- Problem: writes to another page without permission -->
<button
  vd-request="posts.getOne"
  vd-target="home"
  vd-state="externalPostResult"
>
  Load into home
</button>
```

```js
// Fix: opt in from the destination page config.
export default {
  allowExternalWrite: [
    "externalPostResult",
    "externalPostLoading",
    "externalPostError"
  ]
};
```

Cross-page writes are blocked unless the destination page explicitly allows
the target state keys. This keeps request side effects visible in page config.

Invalid request config:

```html
<!-- Problem -->
<button vd-request="posts.getOne" vd-request-config="{ target: 42 }">
  Load
</button>

<!-- Fix -->
<button
  vd-request="posts.getOne"
  vd-request-config="{ target: 'postResult', autoState: true }"
>
  Load
</button>
```

Request config values are validated before the handler runs. Targets and state
paths must be strings; params must resolve to a plain object.

When an error looks surprising, check the file, directive, expression, and hint
shown by VeloDom first. The fix is usually in the page/template/config that the
error names, not inside Core.

## Middleware

For one small middleware, place a default export in a named file. The filename
is its middleware name:

```js
// src/api/middleware/auth.js
export default function requireUser(params, { session }) {
  if (!session?.user) {
    throw new Error("Sign in is required");
  }

  return params;
}
```

```js
// src/api/routes.js
export default {
  "posts.create": {
    handler: createPost,
    middleware: ["auth"]
  }
};
```

Nested names remain visible (`src/api/middleware/security/csrf.js` becomes
`security.csrf`). For an advanced central map, use
`src/api/middleware.js|ts`; that registry takes precedence over file-based
middleware and keeps only one JavaScript/TypeScript extension.

### Transform Middleware

The common form receives params and returns transformed params:

```js
export function trimStrings(params = {}) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value
    ])
  );
}

export default {
  trimStrings
};
```

This registry form is useful when several middleware functions belong together:

```js
export default {
  "posts.create": {
    handler: createPost,
    middleware: ["trimStrings"]
  }
};
```

Transform middleware may return `undefined` to keep the existing params. Any
other return value must be a plain object.

### Advanced Pipeline Middleware

`next()` is optional and reserved for middleware that wraps downstream work:

```js
import {
  defineRequestMiddleware,
  VD_MIDDLEWARE
} from "velodom";

async function requestLogger(params, context, next) {
  const startedAt = performance.now();

  try {
    return await next(params);
  } finally {
    console.info(
      context.routeName,
      Math.round(performance.now() - startedAt),
      "ms"
    );
  }
}

export default {
  requestLogger: defineRequestMiddleware(requestLogger, {
    mode: VD_MIDDLEWARE.MODES.PIPELINE
  })
};
```

Pipeline middleware must call `next()` once or return its own response. Calling
`next()` more than once is rejected.

Middleware references accept registered names, `app:name`, or inline
functions. Unknown names fail with available application middleware names.

## Authentication

Authentication is provider-based and applies to declarative request routes.
It does not replace backend authorization.

### Server Session Provider

```js
import {
  createApp,
  createServerSessionAuthProvider
} from "velodom";

createApp({
  adapter,
  auth: {
    defaultProvider: "server",
    providers: {
      server: createServerSessionAuthProvider({
        sessionUrl: "/api/auth/session",
        credentials: "include"
      })
    }
  },
  routes
});
```

The endpoint should return JSON such as:

```json
{
  "authenticated": true,
  "user": {
    "id": 7,
    "roles": ["editor"]
  }
}
```

Route policies:

```js
export default {
  "profile.read": {
    handler: readProfile,
    auth: true,
    authRedirect: "/login"
  },
  "posts.update": {
    handler: updatePost,
    auth: "server",
    roles: ["editor", "admin"]
  },
  "reports.read": {
    handler: readReport,
    auth: {
      provider: "server",
      sessionUrl: "/api/report-session"
    }
  }
};
```

When roles are configured, authentication is enabled automatically and uses the
application's configured default auth provider.

### Custom Provider

```js
async function customAuthProvider({ signal, routeName, options }) {
  const response = await fetch(options.url, {
    signal,
    credentials: "include"
  });

  if (!response.ok) return null;

  return response.json();
}
```

A provider returns an object containing `authenticated`/`loggedIn`, `token`,
`roles`, or `user.roles`; alternatively it returns `null`/`false`.

### localStorage Demonstration Provider

```js
createLocalStorageAuthProvider({
  storageKey: "vd-user-session",
  requireToken: true
});
```

This helper is for demonstrations and local prototypes. Secure applications
must use server-controlled sessions/tokens and enforce authorization on the
backend.

## RTL and Multilingual CSS

VeloDom separates language translation from presentation direction. It does
not provide a full i18n translation system yet, but it does provide a small
optional direction plugin and compiler support for explicit RTL presentation
markers.

Install the direction plugin only when an application needs runtime locale or
direction changes:

```js
import {
  createApp,
  createDirectionPlugin
} from "velodom";

createApp({
  adapter,
  plugins: [
    createDirectionPlugin({
      defaultLocale: "en",
      locales: {
        en: {
          lang: "en",
          direction: "ltr"
        },
        ar: {
          lang: "ar",
          direction: "rtl"
        }
      }
    })
  ]
});
```

The plugin updates the document root:

```html
<html lang="ar" dir="rtl">
```

It also exposes a controlled application API:

```js
app.direction.setLocale("ar");
app.direction.setDirection("ltr");
console.log(app.direction.locale);
console.log(app.direction.lang);
console.log(app.direction.direction);
console.log(app.direction.isRTL);
```

Pages and components can read direction through `ctx.direction`, and templates
can use the reactive `$direction` state handle:

```html
<aside vd-class="{ 'is-rtl': $direction.isRTL }"></aside>
<p vd-text="$direction.direction"></p>
```

Prefer logical CSS properties so most layouts adapt automatically:

```css
.card {
  margin-inline-start: 1rem;
  padding-inline-end: 1rem;
  border-inline-start: 4px solid currentColor;
  text-align: start;
}
```

Avoid physical directional properties when the layout must work in both LTR
and RTL:

```css
.card {
  margin-left: 1rem;
  padding-right: 1rem;
  border-left: 4px solid currentColor;
  text-align: left;
}
```

Use browser-native direction selectors when a real visual difference is needed:

```css
.card:dir(rtl) {
  border-inline-start-width: 0;
  border-inline-end-width: 4px;
}
```

During development and production builds, VeloDom emits advisory warnings for
physical directional CSS inside `src/pages`, `src/components`, `src/layouts`,
and `.vd` `<style>` blocks. For example, `margin-left` suggests
`margin-inline-start`, and `text-align: right` suggests `text-align: end`.
These warnings do not block the build; they exist to make RTL review cheaper
without adding runtime CSS rewriting.

The Vite plugin also checks the app shell for `<meta charset="UTF-8">`, which
is required for reliable multilingual content delivery.

Scoped page/component styles support `:global(...)` escapes for document-level
direction selectors:

```css
:global(html[dir="rtl"]) .card {
  border-inline-start-width: 0;
  border-inline-end-width: 4px;
}
```

For directional icons, opt in explicitly:

```html
<svg vd-rtl-flip aria-hidden="true"></svg>
```

The compiler normalizes this to `data-vd-rtl-flip` and records the
`rtl-flip` manifest feature. VeloDom does not flip icons automatically because
logos, play icons, clocks, search icons, images, and text should not be
mirrored blindly.

Use a project stylesheet that composes transforms safely:

```css
[data-vd-rtl-flip] {
  --vd-icon-transform: scaleX(1);
  transform: var(--vd-icon-transform);
}

html[dir="rtl"] [data-vd-rtl-flip] {
  --vd-icon-transform: scaleX(-1);
}
```

Or generate the same project-owned CSS from JavaScript and write it into your
own stylesheet/build step:

```js
import { createRtlFlipStyles } from "velodom";

const css = createRtlFlipStyles();
```

If an icon already needs a transform, compose it through a project-owned custom
property rather than relying on hidden framework rewriting.

### Build-time Translation and Locale Routes

For static multilingual sites, use the optional `velodom/localization` build
helper. It has no browser runtime and accepts ordinary JavaScript or TypeScript
objects. The default dictionary is the key baseline, so missing keys are found
before a production build:

```js
// src/localization.js
import {
  createLocalization,
  defineLocaleDictionary,
  definePluralMessage
} from "velodom/localization";

export const localizationOptions = {
  defaultLocale: "en",
  locales: {
    en: {
      lang: "en",
      direction: "ltr",
      messages: defineLocaleDictionary({
        nav: { home: "Hello {name}" },
        results: definePluralMessage({
          one: "{count} result",
          other: "{count} results"
        }),
        seo: { title: "VeloDom" }
      })
    },
    ar: {
      lang: "ar",
      direction: "rtl",
      messages: defineLocaleDictionary({
        nav: { home: "مرحبًا {name}" },
        results: definePluralMessage({
          one: "نتيجة واحدة",
          other: "{count} نتائج"
        }),
        seo: { title: "فيلو دوم" }
      })
    }
  }
};

export const i18n = createLocalization(localizationOptions);
```

Pass the same options to the Vite plugin. Missing default keys fail the build by
default; set `failOnMissing: false` only while incrementally translating an
application. Extra keys are warnings so locale-specific copy remains possible:

```js
// vite.config.js
import { defineConfig } from "vite";
import { velodom } from "velodom/vite-plugin";
import { i18n, localizationOptions } from "./src/localization.js";

export default defineConfig({
  plugins: [
    velodom({
      localization: localizationOptions,
      seo: {
        siteUrl: "https://example.com",
        entries: () => i18n.createSeoEntries([
          {
            path: "/",
            seo: ({ t }) => ({
              title: t("seo.title"),
              description: t("nav.home", { name: "visitor" })
            })
          }
        ])
      }
    })
  ]
});
```

This emits `/` for the default locale and `/ar` for Arabic by default; set
`prefixDefaultLocale: true` when every locale should have a prefix. Generated
SEO entries include each locale's `lang`, localized canonical URL, and
`hreflang` alternate links, so they work with VeloDom's static SEO and sitemap
generation. `i18n.t("ar", "nav.home", { name: "Nadia" })` is available for build hooks and
application scripts, but it is deliberately not a template directive or a
required runtime locale system.

Pass named primitive values as the third argument and call `plural()` only for
an explicit plural leaf. The platform chooses the locale category; VeloDom
falls back to the required `other` form:

```js
i18n.t("en", "nav.home", { name: "Nadia" });
i18n.plural("en", "results", 1);  // 1 result
i18n.plural("en", "results", 12); // 12 results
i18n.direction("ar");              // rtl
```

Placeholders use `{name}` and accept strings, finite numbers, or booleans as
plain text. Double braces in a dictionary string (`{{` and `}}`) render literal
braces. This is intentionally not a general expression or HTML interpolation
engine.

In TypeScript, `createLocalization()` infers the default dictionary's leaf
keys, so an unknown `i18n.t("ar", "nav.missing")` is a type error. For code
outside the controller, generate an application-owned declaration in any small
build script:

```js
import { writeFile } from "node:fs/promises";
import {
  defineLocaleDictionary,
  generateLocaleKeyDeclaration
} from "velodom/localization";

const messages = defineLocaleDictionary({
  nav: { home: "Home" },
  seo: { title: "VeloDom" }
});

await writeFile(
  "src/localization.generated.d.ts",
  generateLocaleKeyDeclaration(messages, "TranslationKey")
);
```

The helper only returns text; it never writes application files on its own.
Use `createLocaleFormatter(locale)` for native date, number, currency, and
relative-time formatting. It delegates directly to `Intl`, so time zones and
the browser or Node locale data remain platform-owned:

```js
import { createLocaleFormatter } from "velodom/localization";

const format = createLocaleFormatter("ar-EG");
format.formatCurrency(1200, "EGP");
format.formatDate("2026-08-24T12:00:00Z", { timeZone: "Africa/Cairo" });
```

Use `inspectLocalization()` in a build script when diagnostics should be
reported without creating the localization controller:

```js
import { inspectLocalization } from "velodom/localization";
import { localizationOptions } from "./src/localization.js";

const diagnostics = inspectLocalization(localizationOptions, [
  "nav.home",
  "results",
  "seo.title"
]);

for (const diagnostic of diagnostics) {
  console.warn(`${diagnostic.severity}: ${diagnostic.message}`);
}
```

The optional second argument activates unused- and unknown-key checks in
addition to missing/extra dictionaries and RTL/LTR validation. The CLI extracts
only statically quoted calls, then checks a static `localizationOptions` object
without importing it:

```bash
vd i18n extract
vd i18n check
vd i18n check --json
```

Dynamic config remains valid for application code, but the static command says
it cannot prove it. Editor integrations can call
`getLocaleKeyCompletions(dictionary)`; build scripts can use
`extractLocaleKeyUsage(sources)` directly.

`localizePath()` preserves a query string and hash. For an accessible language
switcher, use ordinary links and the explicit `switchLocalePath()` helper:

```js
const current = `${location.pathname}${location.search}${location.hash}`;

languageLink.href = i18n.switchLocalePath("ar", current);
languageLink.lang = "ar";
languageLink.hreflang = "ar";
```

Use a normal `<nav aria-label="Language">` and visible language names; the
framework does not inject a picker or decide the visitor's locale. Full ICU
message parsing, locale negotiation, cookies, domains, CMS loading, and server
rendering remain adapter or application concerns. Their deferred request-time
policy is recorded in the [Rendering, Localization and Server Boundaries](#rendering-localization-and-server-boundaries)
section below.

## SEO and Static Route HTML

SEO is declared in each page's `config.js` or optional `config.ts`:

```js
export default {
  seo: {
    title: "Articles | Example",
    description: "Practical articles built with VeloDom.",
    canonical: "/articles",
    alternates: {
      en: "/articles",
      ar: "/ar/articles"
    },
    lang: "en",
    robots: "index,follow",
    keywords: ["VeloDom", "HTML-first"],
    openGraph: {
      type: "website",
      title: "Articles",
      image: "/images/articles.jpg",
      imageAlt: "Article collection"
    },
    twitter: {
      card: "summary_large_image"
    },
    summary: {
      heading: "Practical articles",
      text: "A concise server-delivered introduction for visitors and crawlers."
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Articles"
    }
  }
};
```

At runtime, VeloDom updates:

- document title and language
- description and robots meta tags
- optional keywords
- canonical link
- Open Graph metadata
- Twitter Card metadata
- JSON-LD structured data

On production build, the Vite plugin creates route-specific `index.html`
documents containing the metadata and a visible concise summary in `#app`.
Client mounting replaces that summary with the interactive page.

### Dynamic Routes

VeloDom never invents dynamic content. Known build-time entries are explicit:

```js
export default {
  seo: {
    title: "Articles",
    description: "Article archive",
    entries: [
      {
        path: "/articles/hello-velodom",
        title: "Hello VeloDom",
        description: "A concise introduction.",
        canonical: "/articles/hello-velodom",
        summary: {
          heading: "Hello VeloDom",
          text: "A concise introduction."
        }
      }
    ]
  }
};
```

For API/CMS-backed sites, `entries` may also be an async build-time hook:

```js
export default {
  seo: {
    title: "Articles",
    description: "Article archive",
    entries: async () => {
      const response = await fetch("https://cms.example.com/articles");
      const articles = await response.json();

      return articles.map(article => ({
        path: `/articles/${article.slug}`,
        title: article.title,
        description: article.description,
        canonical: `/articles/${article.slug}`,
        summary: {
          heading: article.title,
          text: article.excerpt
        }
      }));
    }
  }
};
```

The hook runs only during production static SEO generation. It is not bundled
into the browser runtime, and it should return concrete route metadata rather
than full interactive page HTML. The current V1 site uses this pattern for
local framework article detail pages.

Parameterized folders without entries are handled by the client router but are
not emitted as fake static paths.

### Sitemap and Robots

Set the production site origin:

```js
// vite.config.js
import { velodom } from "velodom/vite-plugin";

export default {
  plugins: [
    velodom({
      seo: {
        siteUrl: "https://example.com",
        generateSitemap: true,
        generateRobots: true,
        entries: async ({ page }) => (
          page === "blog/posts/[id]"
            ? loadEntriesFromCms()
            : []
        )
      }
    })
  ]
};
```

Routes marked `robots: "noindex,nofollow"` are excluded from the sitemap.
Static SEO generation can be disabled with `seo: false`.

Meta keywords are supported as supplemental metadata, but they should not be
treated as a modern ranking strategy.

For richer no-JavaScript content, the Vite plugin also accepts an optional
build-time `seo.renderPage` hook. It can return route-specific HTML for the
initial `#app` content while the browser runtime still performs normal client
takeover when JavaScript loads.

```js
// vite.config.js
import { velodom } from "velodom/vite-plugin";

export default {
  plugins: [
    velodom({
      seo: {
        renderPage({ route, seo }) {
          if (!route.startsWith("/blog/posts/")) return null;

          return {
            html: `
              <article>
                <h1>${seo.title}</h1>
                <p>${seo.description}</p>
              </article>
            `,
            hydration: "client-takeover"
          };
        }
      }
    })
  ]
};
```

The hook runs only after production build output exists. It is not bundled into
the browser runtime. Returned content is wrapped with
`data-vd-static-content` and `data-vd-static-hydration="client-takeover"`.
If the hook returns `null`, VeloDom keeps the existing concise
`seo.summary` fallback. Script tags are rejected from returned content; use
`seo.jsonLd` for structured data and the application shell for scripts.

For dynamic content routes, page-owned `config.js` or `config.ts` can use the
build-only `prerender` contract. It emits one complete route document per
concrete entry and passes entry data only to the build renderer:

```js
export default {
  path: "/blog/:slug",
  seo: {
    title: "Blog",
    description: "VeloDom article"
  },
  prerender: {
    entries: async () => [
      { path: "/blog/html-first", data: { title: "HTML First" } }
    ],
    render: ({ data }) => ({
      html: `<article><h1>${data.title}</h1></article>`,
      mode: "replace",
      hydration: "client-takeover"
    })
  }
};
```

The `prerender` block runs only after the production build, is removed from
browser page configuration, rejects dynamic or unsafe output, and requires
page SEO metadata. It does not create an SSR server or reconcile a server DOM.

### SSR and Hydration Policy

VeloDom remains browser-first and compiler-first. `seo.renderPage` and
`config.prerender` provide optional build-time static content plus client
takeover, not a React/Vue-style SSR reconciliation engine. `renderToString`-
style APIs and persistent server runtime APIs are intentionally not part of the
public package surface yet. Broader SSR/hydration can be reconsidered only
after a proven design, browser coverage, and runtime stability are mature
enough to protect the HTML-first authoring model.

### Optional Node Request Adapter

`velodom/node` is an explicit server bridge for request-time pages and APIs. It
converts Node's HTTP request into the standard Fetch `Request` object and sends
the application's `Response` back to Node. The application still owns HTML,
authentication, cookies, headers, and error policy:

```js
import { createServer } from "node:http";
import { createNodeRequestAdapter } from "velodom/node";

const adapter = createNodeRequestAdapter({
  origin: "https://example.com",
  async handle(request) {
    const user = await readSession(request.headers.get("cookie"));

    if (!user) {
      return new Response("Sign in required", { status: 401 });
    }

    return new Response(renderAccountHtml(user), {
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  },
  onError() {
    return new Response("Unavailable", { status: 503 });
  }
});

createServer(adapter.listener).listen(3000);
```

This is not automatic VeloDom SSR: it does not discover pages, render templates,
reconcile DOM, or hydrate markup. It is an optional adapter boundary for teams
that need a small Node server beside static output. Responses are intentionally
buffered; streaming and Edge transport remain deferred until a separate
optional contract is proven.

### Content Mode Helpers

`velodom/content` is an optional Node/build-time subpath for Markdown and local
content workflows. It can parse frontmatter, generate safe HTML, produce SEO
entries, sitemap records, RSS XML, and search-index records without adding a
mandatory browser runtime feature.

```js
// src/pages/blog/[slug]/config.js
import { loadContentCollection } from "velodom/content";

export default {
  path: "/blog/:slug",
  seo: {
    entries: async () => {
      const posts = await loadContentCollection({
        root: "src/content",
        collection: "posts",
        basePath: "/blog"
      });

      return posts.seoEntries;
    }
  }
};
```

```js
import {
  createContentRssFeed,
  loadContentCollection
} from "velodom/content";

const posts = await loadContentCollection({
  root: "src/content",
  collection: "posts",
  basePath: "/blog"
});

const rss = createContentRssFeed(posts.entries, {
  title: "VeloDom Blog",
  siteUrl: "https://example.com"
});
```

For a CMS, database, or build-only API, adapt the application's typed records
into the same source shape. VeloDom owns normalization and generated lookup
indexes; the application owns credentials, fetching, and vendor-specific
fields:

```ts
import { loadExternalContentCollection } from "velodom/content";

const posts = await loadExternalContentCollection({
  collection: "posts",
  basePath: "/blog",
  load: () => cmsClient.posts.list(),
  toSource: post => ({
    collection: "posts",
    slug: post.slug,
    source: `---\ntitle: ${post.title}\ntags: ${post.tags.join(", ")}\n---\n${post.body}`
  })
});

posts.index.byPath["/blog/html-first"];
posts.index.byTag.framework;
```

`loadExternalContentCollection()` runs only in Node/build code. It does not
ship a CMS SDK, send credentials to the browser, or prescribe a vendor.

The loader is the convenient filesystem boundary; the smaller pure helpers are
available when a build tool already has source strings or normalized entries:

```js
import {
  createContentCollection,
  createContentIndex,
  createContentSearchIndex,
  createContentSeoEntries,
  createContentSitemap,
  parseMarkdownContent
} from "velodom/content";

const first = parseMarkdownContent({
  collection: "posts",
  slug: "html-first",
  source: `---\ntitle: HTML First\ntags: framework, html\n---\n# Visible UI`
}, { basePath: "/blog" });

const collection = createContentCollection({
  collection: "posts",
  basePath: "/blog",
  files: [
    {
      collection: "posts",
      slug: "html-first",
      source: `---\ntitle: HTML First\n---\n# Visible UI`
    }
  ]
});

const entries = [first];
const byRouteAndTag = createContentIndex(entries);
const searchRecords = createContentSearchIndex(entries);
const seoRoutes = createContentSeoEntries(entries);
const sitemapRecords = createContentSitemap(entries, "https://example.com");
```

`createContentCollection()` already returns `entries`, `index`, `seoEntries`,
`sitemap`, and `searchIndex`; call the individual helpers only when composing a
custom build pipeline. Markdown HTML is deliberately conservative. Sanitize or
extend application-specific Markdown through an application-owned content
adapter rather than adding CMS policy to the browser runtime.

## Deployment and Static Hosting

The provider-neutral recipes are collected in the deployment section below.
The short version is:

Build the application with:

```bash
npm run build
```

The production output is written to `dist/`. VeloDom emits the normal SPA shell
as `dist/index.html` and, when SEO generation is enabled, extra route-specific
documents such as:

```text
dist/index.html
dist/features/index.html
dist/single-file/index.html
dist/404/index.html
dist/sitemap.xml
dist/robots.txt
```

The hosting rule is simple:

1. Serve real files and generated route directories first.
2. Fall back unknown client routes to `/index.html`.

That lets direct visits to generated SEO routes receive their static metadata,
while non-generated dynamic routes still load through the client router.

### Local Preview

```bash
npm run preview
```

For route-specific SEO, open a generated route directly and inspect the HTML
source before JavaScript runs.

### Vite Base Path

If the site is deployed under a subpath, configure Vite's `base` option:

```js
// vite.config.js
import { velodom } from "velodom/vite-plugin";

export default {
  base: "/docs/",
  plugins: [
    velodom({
      seo: {
        siteUrl: "https://example.com/docs"
      }
    })
  ]
};
```

Use app-relative route paths in VeloDom navigation, such as `/features`; Vite
handles asset URLs through `base`.

### Netlify and Cloudflare Pages

Create a `_redirects` file in the published output or public assets:

```text
/* /index.html 200
```

Static files and generated directories are served before the fallback on these
hosts, so `/features/` can still resolve to `dist/features/index.html`.

### Vercel

Use a fallback rewrite:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Vercel serves static assets before rewrites. Verify direct generated routes
after deployment because project-level settings can affect clean URLs.

### Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

This tries real files, then generated route directories, then the SPA fallback.

### Apache

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### GitHub Pages

GitHub Pages does not provide server rewrite rules for SPA routes. For a simple
deployment, copy the built `index.html` to `404.html` after build so unknown
client routes can recover:

```bash
cp dist/index.html dist/404.html
```

Generated SEO route folders still work when visited exactly, but unknown
dynamic routes will use the 404 fallback shell.

### Cache Headers

Prefer long-lived immutable caching for hashed assets and no-cache behavior for
HTML:

```text
/assets/*  Cache-Control: public, max-age=31536000, immutable
/*.html    Cache-Control: no-cache
```

Generated `sitemap.xml` and `robots.txt` can be cached, but keep the cache short
while content is changing often.

### Deployment SEO Checklist

- Set `velodom({ seo: { siteUrl } })` for canonical, sitemap, and robots output.
- Add `seo.entries` for dynamic routes that must be crawlable at build time.
- Mark private/action pages with `robots: "noindex,nofollow"`.
- Confirm direct route HTML contains the expected title, description, canonical,
  and visible summary before the app hydrates.
- Confirm unknown routes load the SPA fallback instead of returning a server
  404 page.

## Plugins

Function plugin:

```js
function analyticsPlugin({ app, navigate }) {
  const onVisibilityChange = () => {
    console.info(document.visibilityState);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    document.removeEventListener(
      "visibilitychange",
      onVisibilityChange
    );
  };
}
```

Object plugin:

```js
const monitoringPlugin = {
  setup({ app, navigate }) {
    console.info("monitoring installed");
  },
  cleanup() {
    console.info("monitoring removed");
  }
};
```

```js
createApp({
  adapter,
  plugins: [
    analyticsPlugin,
    monitoringPlugin
  ]
});
```

Optional native validation plugin:

```js
import {
  createValidationPlugin
} from "velodom";

createApp({
  adapter,
  plugins: [
    createValidationPlugin()
  ]
});
```

```html
<form vd-validate vd-request="posts.create">
  <input name="title" required minlength="3">
  <button type="submit">Create</button>
</form>
```

Optional shared state:

```js
import {
  createSharedState
} from "velodom";

export const uiState = createSharedState({
  theme: "light"
}, {
  name: "ui"
});

createApp({
  adapter,
  plugins: [
    uiState.plugin
  ]
});

uiState.state.theme = "dark";
```

Creating the handle does not mutate the app. The state becomes available as
`app.shared.ui` only after its plugin is explicitly registered. This keeps
shared state application-owned instead of turning it into a mandatory global
store.

Optional request cache, retry wrapper, and devtools bridge:

```js
import {
  createDevtoolsPlugin,
  createRequestCache,
  withRequestRetry
} from "velodom";

const apiCache = createRequestCache({
  ttlMs: 30_000,
  maxEntries: 40,
  scope: "public-posts"
});

export const routes = {
  posts: {
    getOne: withRequestRetry(
      (params, context) => apiCache.requestJson(`/api/posts/${params.id}`, {
        signal: context.signal
      }),
      { retries: 2 }
    )
  }
};

createApp({
  adapter,
  plugins: [
    createDevtoolsPlugin()
  ]
});
```

The cache wrapper and retry wrapper are application-owned helpers. They do not
change declarative request behavior unless the user explicitly uses them in an
API route or request module. The devtools bridge only installs a browser global
when its plugin is registered.

Both the optional retry wrapper and declarative `retry` use an abortable wait.
They never retry `AbortError` or start another attempt for an aborted context.
Middleware checks cancellation before each next operation and preserves aborts
instead of wrapping them as ordinary middleware failures. The optional wrapper
also rejects a late result from a handler that ignored its signal; declarative
bindings suppress late success notifications after an awaited `onSuccess`
callback if that binding was disposed or replaced. Timer/abort listeners are
released when a retry wait settles.

Always forward `context.signal` to your actual I/O. Framework cancellation does
not forcibly stop custom work that ignores the signal, undo an already-written
state value, or roll back a write accepted by the backend. Use authoritative
status/refetch and backend idempotency for ambiguous write outcomes; do not
blindly retry checkout/create actions. `shouldRetry(error, attempt)` still lets
an application narrow the explicit retry policy; cancellation is excluded even
when that predicate would return true.

The request cache is opt-in and memory-only. It coalesces identical concurrent
GET reads; headers and credentials are part of identity. Each consumer can
cancel independently; the transport is aborted only when all consumers cancel.
Results and tracked in-flight reads are bounded by `maxEntries` (default 100);
saturated tracking passes new requests through uncached. `maxEntries: 0`
disables caching. Expired entries are pruned on access and `size` inspection;
retained results use LRU eviction. Configure a finite TTL for ordinary reads:
the compatibility default `ttlMs: 0` retains a value until clear/eviction, not
until a freshness timeout.

Invalidate only after the backend confirms an intentional mutation, then
explicitly refresh the relevant UI. Failed writes leave the last good read
untouched; the cache never implements optimistic updates or confirms stock or
payment ownership.

```js
import { createRequestCache, requestJson } from "velodom";

const catalogCache = createRequestCache({ ttlMs: 5_000, maxEntries: 40 });

export function list(params, context) {
  return catalogCache.requestJson("/api/catalog", { signal: context.signal });
}

export async function save(params, context) {
  const saved = await requestJson("/api/catalog", {
    method: "PUT", body: params, signal: context.signal
  });
  catalogCache.clear(); // only after success; UI reload remains explicit
  return saved;
}
```

`clear()` also fences pending completion writes: an older caller still receives
its awaited result, but that result cannot repopulate the invalidated cache or
overwrite a newer read. `clear("GET /api/catalog")` retains the legacy default
base-key convention and clears every header/credential variant. With a custom
`key`, pass that returned base key to `clear`.

Do not wrap private session/no-store endpoints in this helper. It uses the
existing JSON transport and does **not** infer HTTP cache policy or see HttpOnly
cookie changes. If the backend/application explicitly permits private read
caching, supply an application-owned scope, for example
`scope: () => tenantId + ':' + userId + ':' + sessionEpoch`, and clear on
login/logout/account changes. A changed scope clears old entries and fences
pending reads, including switch-back to a previous scope. Scope observation
occurs on request/completion/size access, not via a global auth listener. Abort
old page work and check current identity before updating UI; invalidation alone
is not a guard against displaying a result already awaited by a caller.

Request-cache policy is separate from page-data freshness. Keep page-data
caching public-only; use explicit `invalidatePageData()` on its own after a
confirmed write. Request-cache invalidation never clears router page data.

For local development only, an application that registered the bridge can
explicitly import `mountDevtoolsInspector` from `velodom/devtools`. It renders a
small read-only inspector and fails if the bridge is absent, so it cannot add a
hidden production panel.

Runtime reports use stable `VD_*` IDs and one of five owner groups:
`compiler`, `router`, `request`, `component`, or `runtime`. Page/component/
request failures attach a bounded ownership trail and normalized source stack.
The application error-boundary callback receives this record as
`context.diagnostic` and remains responsible for fallback, retry, navigation,
and user-facing recovery.

Custom development hosts may explicitly observe those reports without taking
over recovery:

```js
import {
  groupVeloDomErrorReports,
  mountVeloDomErrorOverlay
} from "velodom/devtools";

const overlay = mountVeloDomErrorOverlay({ limit: 25 });
const grouped = groupVeloDomErrorReports(overlay.reports);
// overlay.clear(); overlay.destroy();
```

The reporter stores no history. Only the explicitly mounted overlay keeps a
bounded local list, and the normal `velodom` import neither mounts nor styles
it. The overlay has no state mutation, retry, or recovery controls.

Plugins set up in registration order and clean up in reverse order. Future
devtools should remain optional plugins rather than mandatory runtime behavior.

## Compiler and Vite Integration

### Vite Plugin

The blog is a real workspace package consumer and uses the same public plugin
subpath as an npm-installed application:

```js
import { defineConfig } from "vite";
import { velodom } from "velodom/vite-plugin";

export default defineConfig({
  plugins: [
    velodom()
  ]
});
```

The plugin:

- compiles raw page/component HTML
- compiles optional `.vd` single-file pages and components into the same
  internal resource shape
- extracts only page `<config>` blocks for eager route discovery while keeping
  each `.vd` page runtime in one lazy route chunk
- converts preferred directive names
- reports compiler errors through Vite with the original file and offset, so
  Vite's development overlay/HMR cycle points to the source that needs repair
- keeps baseline accessibility diagnostics as non-blocking compiler warnings
- emits development metadata by default in development
- emits deterministic runtime feature manifests
- lets the runtime load only required directive feature modules
- generates static SEO route documents after a normal client production build

Within one Vite plugin instance, repeated compilation is reused through a
bounded incremental cache keyed by normalized template source and effective
compiler options. File changes and Vite hot updates invalidate only the
affected source variants. This behavior is automatic, build-time only, and
adds no application setting, browser cache, or runtime module. Direct calls to
the standalone compiler remain uncached and deterministic.

### Standalone Compiler

```js
import { compileTemplate } from "velodom/compiler";

const result = compileTemplate(
  '<button vd-on:click="save()">Save</button>',
  {
    filename: "save-button.html",
    mode: "development"
  }
);

console.log(result.html);
console.log(result.diagnostics);
console.log(result.manifest.features);
```

Accessibility warnings are intentionally static and advisory. The compiler can
catch cheap HTML-first mistakes such as missing image alt text, unlabeled form
controls, anchors without static or bound `href`, click handlers on
non-semantic elements, and skipped heading levels. Router navigation also moves
runtime focus to hash targets or page-level focus targets after route changes.
Broader keyboard-flow checks remain intentionally small and roadmap-driven.

The same compiler also catches a small set of high-confidence security
regressions before build output: `javascript:` URLs are errors; password forms
must use POST; `_blank` links should include `rel="noopener"`; and Vite
environment names containing `SECRET`, `TOKEN`, `PASSWORD`, or `PRIVATE_KEY`
are warned because they are bundled for the browser. These are source-level
signals, not a replacement for server authorization, CSRF, secret management,
or a deployment security review.

Compile result:

```js
{
  html,
  ast,
  metadata,
  diagnostics,
  manifest
}
```

### Optimizers

Optimizers are synchronous and run in registration order:

```js
import {
  defineTemplateOptimizer
} from "velodom/compiler";
import { velodom } from "velodom/vite-plugin";

const addProjectFeature = defineTemplateOptimizer(
  "project-feature",
  (result, context) => {
    context.addRuntimeFeature("project:analytics");

    return {
      html: result.html.replaceAll("data-track", "data-project-track")
    };
  }
);

export default {
  plugins: [
    velodom({
      compiler: {
        optimizers: [addProjectFeature]
      }
    })
  ]
};
```

An optimizer may patch only `html`, `ast`, `metadata`, or `diagnostics`.
Returning a Promise or unsupported field is rejected.

## JavaScript and TypeScript

Vanilla JavaScript page:

```js
// src/pages/example/script.js
export function init({ state }) {
  state.message = "JavaScript page";
}
```

Typed page with the same HTML/lifecycle API:

```ts
// src/pages/example/script.ts
import type {
  PageScriptContext,
  StateRecord
} from "velodom";

interface ExampleState extends StateRecord {
  message: string;
  count: number;
}

export function init({
  state,
  ctx
}: PageScriptContext<ExampleState>) {
  state.message = "TypeScript page";
  state.count = 0;

  ctx.onCleanup(() => {
    console.info("typed page cleaned");
  });
}
```

Typed component:

```ts
import type {
  ComponentExpose,
  ComponentScriptContext,
  StateRecord
} from "velodom";

interface BadgeState extends StateRecord {
  label: string;
}

interface BadgeProps extends StateRecord {
  label?: string;
}

export function init({
  props,
  state
}: ComponentScriptContext<BadgeState, BadgeProps>) {
  state.label = props.label || "Badge";

  const expose: ComponentExpose = {
    rename(label: string) {
      state.label = label;
    }
  };

  return {
    state,
    expose
  };
}
```

Typed page configuration is also optional:

```ts
// src/pages/example/config.ts
import type { PageConfig } from "velodom";

export default {
  path: "/example",
  seo: {
    title: "Typed page config",
    description: "Checked by TypeScript and rendered into static SEO HTML."
  }
} satisfies PageConfig;
```

Framework implementation strictness is separate from application authoring.
Maintainers run `npm run typecheck:strict` for every package TypeScript source,
including Core/runtime, compiler/optimizer, safe expressions, requests,
adapters, optional public subpaths, Vite build integration, CLI/project
intelligence, and scaffolding. New package modules are included automatically.
None of this requires application authors to convert Vanilla JavaScript pages
to TypeScript.

`config.ts` is compiled only by build tooling and requires `typescript` as an
application dev dependency. Keep it self-contained and use type-only imports;
runtime imports belong in `script.ts` or application API modules. Vanilla
projects using `config.js` do not install or execute TypeScript.

```bash
npm install --save-dev typescript
```

Framework Core enforces `@typescript-eslint/no-explicit-any`. Application
authors are not forced to use TypeScript.

## Error and Security Model

VeloDom provides:

- compiler diagnostics with filename, offset, line, and column
- structured runtime errors with directive/expression/element context
- request errors with request/auth/middleware stages
- an application `errorBoundary` hook for recoverable page and component
  crashes
- safe text rendering in the fatal error screen
- a single fatal-screen guard
- automatic cleanup of listeners, subscriptions, and request abort controllers

Diagnostic element snapshots remove input/option values and textarea content
without mutating the application DOM. Unusual thrown values (including
`undefined`, symbols, or cyclic objects) remain reportable. This is not general
secret redaction: application messages, expressions, and other markup still
need application-owned filtering before being sent to a logging service.

Security invariants:

- template expressions do not use dynamic JavaScript compilation
- unsafe object members and prototype traversal are blocked
- request destinations reject protected state keys
- cross-page writes require target-page permission
- middleware names resolve only from owned application registries
- auth provider results are normalized before role checks

Application-level recoverable boundaries are configured through `createApp`.
The same hook receives `phase: "navigation"` for page failures and
`phase: "component"` for component failures:

```js
createApp({
  adapter,
  errorBoundary({ title, page, retry }) {
    const section = document.createElement("section");
    const heading = document.createElement("h1");
    const description = document.createElement("p");
    const retryButton = document.createElement("button");

    section.setAttribute("role", "alert");
    heading.textContent = title;
    description.textContent = `Page ${page || "unknown"} could not be loaded.`;
    retryButton.type = "button";
    retryButton.textContent = "Try again";
    retryButton.addEventListener("click", () => {
      retry();
    });

    section.append(heading, description, retryButton);

    return section;
  }
});
```

Returning a string renders safe text inside a generated `role="alert"`
fallback. Returning a DOM node lets the application own buttons and recovery
actions. For component failures, the fallback is rendered inside the component
host so the rest of the page remains mounted. Returning `false`, throwing
inside the hook, or omitting the hook keeps the existing fatal error screen
behavior.

The current global `error` and `unhandledrejection` handlers still treat
unexpected failures as fatal.

### Optional production diagnostics recipe

The Store reference includes an application-owned
`src/domain/diagnostics/production-diagnostics.js` helper. Merely importing it
starts no collector and sends no request. If a real application chooses a
trusted sink, compose its request hooks and boundary reporter explicitly:

```js
import { mountVeloDom } from "velodom/vite";
import { createProductionDiagnostics } from "./domain/diagnostics/production-diagnostics.js";

const diagnostics = createProductionDiagnostics({
  sampleRate: 0.05,
  sink: report => navigator.sendBeacon(
    "/your-owned-diagnostics-endpoint",
    JSON.stringify(report)
  )
});

await mountVeloDom({
  requestHooks: diagnostics.requestHooks,
  errorBoundary(context) {
    diagnostics.recordBoundary(context);
    return "This page could not load. Please try again.";
  }
});
window.addEventListener("pagehide", () => diagnostics.destroy(), { once: true });
```

The copied recipe emits only an ephemeral local correlation ID, static logical
route/page names, a stable diagnostic code/group, request stage/outcome, and
duration. It does **not** forward params, session/cart/payment values, error
messages, stacks, form bodies, responses, raw URLs, or credentials. Aborted
requests lose their pending timer; `destroy()` releases remaining listeners.
Sink failure never breaks request or boundary recovery. The ID correlates
client-side before/after hooks only; passing an ID to a backend is a separate
application/backend contract. Application source maps should be retained/uploaded to a
private monitoring system with access controls, not published as public
artifacts merely to improve diagnostics. VeloDom Lab remains development-only.
This recipe covers request hooks and recoverable boundaries, not every global
fatal error. A real service needs its own retention, consent, and sampling
policy; no telemetry account or network call is configured by VeloDom.

Frontend auth and roles improve application UX only. A backend must enforce
real access control.

## Consolidated Architecture and Integration Reference

This section combines the former identity, adapter, browser, editor, devtools,
and future-research notes so the framework guide is the single technical source
for the VeloDom site.

### Framework identity

VeloDom is for content sites, blogs, documentation, marketing pages, dashboards,
CRUD tools, and small-to-medium SPAs where readable HTML, SEO, static analysis,
and a small browser runtime matter. It removes repetitive wiring for reactive
text, conditions, lists, routing, components, slots, request status, middleware,
auth coordination, SEO, and project inspection while keeping application code
in visible folders.

Choose VeloDom when you want declarative productivity without JSX/TSX, a virtual
DOM, a mandatory global store, universal SSR, or a large compatibility runtime.
Those exclusions are architectural boundaries, not missing beginner setup.

### Adapter and plugin contract

The Core runtime does not inspect folders or depend on Vite. An adapter supplies
lazy page, component, layout, script, data, style, config, and compiler-manifest
resources. `createViteAdapter()` implements contract version `1`:

```ts
import {
  assertResourceAdapterConformance,
  defineResourceAdapter
} from "velodom";

const adapter = defineResourceAdapter({
  version: 1,
  capabilities: ["resource-discovery", "page-config", "page-data"],
  pages: {
    html: { home: async () => "<main>Home</main>" },
    modules: {},
    data: {},
    styles: {},
    configs: {}
  }
});

assertResourceAdapterConformance(adapter);
```

Adapters must keep discovery outside the router, return lazy loaders, validate
their own contract, and never add sessions, cookies, server rendering, or
request-time policy to the browser runtime. Plugins are setup functions or
objects with `setup()` and optional `cleanup()`; setup order is preserved and
cleanup runs in reverse order.

### Browser policy and real-browser verification

The V1 target is the latest two stable versions of Chrome, Edge, Firefox,
macOS Safari, iOS Safari, and Android Chrome. Internet Explorer, EdgeHTML,
Opera Mini, and browsers without native ES modules, `Proxy`, `AbortController`,
`URL`, `fetch`, history, or DOM events are outside the default policy.

Run the local smoke matrix with:

```bash
npm run test:browser
VELODOM_BROWSER_STRICT=1 npm run test:browser
VELODOM_BROWSER_TARGETS=chromium,mobile-chromium,firefox,webkit,mobile-webkit npm run test:browser
```

Desktop and mobile Chromium are the default required local targets. Select
Firefox, WebKit, or mobile WebKit explicitly through
`VELODOM_BROWSER_TARGETS`; release CI uses strict mode and selects all five
targets. The suite covers direct routes, client
navigation, dynamic params, forms, requests, cleanup, focus, no-JavaScript SEO,
and rejects unexpected `pageerror`/`console.error` output. `happy-dom` tests are
fast checks, not a replacement for real browsers. VeloDom does not ship browser
polyfills by default.

When a selected target fails in GitHub Actions, the test prints a concise
annotation with the browser, failed step, URL, and root error. Page-body
snapshots stay in the detailed job log and are not copied into annotations.
The annotation improves diagnosis; it does not turn a failed matrix green.
The Store administration journey additionally checks that an accepted save
is followed by a successful private detail GET containing the new revision
and by a matching visible detail heading. This distinguishes stale backend
data from a client navigation/rendering failure without relaxing the browser
gate or increasing its timeout.

### Editor intelligence

The compiler API can power any editor without making an editor mandatory:

```ts
import {
  analyzeVeloDomDocument,
  getVeloDomDirectiveCompletions
} from "velodom/compiler";

const analysis = analyzeVeloDomDocument({
  filename: "src/pages/about.vd",
  source: editorText
});
```

Diagnostics retain source offsets and remap `.vd` template locations to the
original file. Completions use preferred `vd-*` names. The optional workspace
VS Code package consumes this API, but is excluded from the browser package and
is not required by applications.

### VeloDom Lab and development inspection

VeloDom Lab is an experimental, optional V1 development surface built on the
existing Vite workflow. It is not a browser extension, hosted service, AI
requirement, or production dependency. The beginner path is:

```bash
vd lab --check
vd lab
```

When enabled, the Vite plugin injects a development-only bootstrap and a
local, read-only compiler-metadata endpoint. `mountVeloDom()` then installs
the same explicit bridge produced by `createDevtoolsPlugin()`. The isolated
panel shows the active route, a nested page/component ownership tree, bounded
safe state snapshots and recent shallow diffs, directive/DOM bindings, a
payload-free request waterfall, correlated route transitions, the complete
bounded event stream, and compiler directive/source diagnostics with copyable
local `vd explain` commands. It supports search, element highlighting, light/dark/
system themes, keyboard focus with <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd>,
responsive sizing, and compiler refresh after Vite hot updates.

```ts
import {
  mountVeloDomLab,
  VELODOM_DEVTOOLS_PROTOCOL_VERSION
} from "velodom/devtools";

console.log(VELODOM_DEVTOOLS_PROTOCOL_VERSION);
const lab = mountVeloDomLab({ open: true });
// lab.close(); lab.open(); await lab.refresh(); lab.destroy();
```

Ordinary applications do not need this manual import: `vd lab` performs the
development bootstrap. `mountDevtoolsInspector()` remains the smaller manual
read-only view for custom hosts. The underlying protocol is versioned; event
history is bounded; serialization limits depth, entries, and string size;
getters are never invoked; request bodies, credentials, and response payloads
are not collected. Only retained scope roots/bindings can be highlighted, and
the bridge exposes no state mutation API.

Production safety is enforced twice: the Vite plugin never injects Lab during
build, and `npm run performance:check` scans emitted JavaScript for Lab
bootstrap markers. Full visual code editing, a browser extension, source
writing, performance flame charts, and migration UI remain deferred until
they have bounded, tested designs.

### Static rendering and server boundary

`config.prerender` and `seo.renderPage` are explicit build-only contracts.
Applications own data loading, escaping, authorization, and concrete dynamic
paths. `hydration: "client-takeover"` means the router replaces initial static
content after JavaScript loads; it is not DOM reconciliation. Universal SSR,
server components, database sessions, `renderToString`, streaming, and Edge
runtime policy are not V1 capabilities.

### Future research boundaries

AI, migrations, CMS, and hosting integrations remain external tools. If AI is
ever explored, it must be an optional provider interface supporting local or
custom providers, explicit file/secret boundaries, prompt previews, and code
review. It must never be required for build, inspection, or deployment.

Migration assistants are acceptable only when they output reviewable normal
VeloDom folders; JSX compatibility runtimes and hidden render functions remain
rejected. CMS and deployment adapters may map typed external records through
`velodom/content`, but Core must never own credentials, remote browser fetching,
or a provider marketplace.

### Master architecture rules

The framework source is TypeScript and must ship declarations, lint cleanly,
and keep framework-owned logic under `packages/velodom/src`. Applications may
choose JavaScript or TypeScript in each page or component with no API difference;
JSX and TSX are never required. Folder conventions remain the source of truth:
pages, components, layouts, and API code belong to the consuming project, while
filesystem discovery belongs to adapters and never to the runtime router.

The compiler owns HTML parsing, source-aware diagnostics, preferred `vd-*`
normalization, safe-expression validation, runtime feature manifests,
optimizers, accessibility warnings, and static SEO output. The browser runtime
only mounts the resources supplied by an adapter: routing, state, components,
directives, requests, middleware, auth coordination, lifecycle, refs, and
runtime SEO. Template expressions never use `eval` or `new Function`; complex
logic stays in the page or component script.

Requests should be declarative for common cases (name, params, result/loading/
error state, auth policy, and middleware names). The Core owns contracts and
orchestration; application handlers and business middleware stay under
`src/api`, and advanced `next()` pipelines are optional. SEO remains explicit
and build-aware: static output may provide crawler content and client takeover,
but it must not be described as universal SSR or hydration reconciliation.

Accessibility starts with static HTML and compiler diagnostics, including image
alt text, form names, anchor targets, keyboard-safe interactive elements, and
heading order. Development favors warnings and source locations; production
favors small metadata, lazy modules, tree-shaking, static SEO, and package
boundary correctness. Application assets stay under `src/assets` and should not
be duplicated at the repository root without a deployment reason.

Every framework TypeScript source file begins with an English responsibility
header. Every exported framework API and named function declaration has
adjacent JSDoc; callbacks remain uncluttered, while complex comments explain
architectural reasons rather than obvious operations. JavaScript builds remove
comments to protect runtime size, while source and generated declarations keep
their documentation. New features are first
classified as V1 — Implemented, Current, Planned, Research, Deferred /
Experimental, or Rejected; features that imitate
other frameworks, require JSX, mandate global state, or add runtime cost for a
static-tooling problem are deferred or rejected.

## Public Package Boundaries

Intended public imports:

### `velodom`

Runtime:

- `createApp`
- `definePageConfig`
- `defineRequestRoute`
- `definePlugin`
- `defineResourceAdapter`
- `assertPluginConformance`
- `inspectPluginConformance`
- `assertResourceAdapterConformance`
- `createDevtoolsPlugin`
- `createDirectionPlugin`
- `createPluginManager`
- `createRequestCache`
- `createRtlFlipStyles`
- `createSharedState`
- `createValidationPlugin`
- `createProgressiveFormsPlugin`
- `computed`
- `watch`
- `effect`
- `withRequestRetry`
- `requestJson`
- `ApiError`
- `defineRequestMiddleware`
- `createAuthRuntime`
- `createServerSessionAuthProvider`
- `createLocalStorageAuthProvider`
- `normalizeAuthSession`
- `VD_AUTH`
- `VD_MIDDLEWARE`
- `VD_REQUEST`

Public types include page/component contexts, page-data cache policy,
route/auth/request/plugin
contracts, request hook payloads, optional cache/retry/devtools contracts,
direction plugin contracts, shared-state contracts, validation plugin options,
SEO contracts, application options, and HTTP options.

### Explicit subpaths

| Import | Stable purpose |
| --- | --- |
| `velodom/vite` | `mountVeloDom`, `createViteApp`, and the Vite resource adapter |
| `velodom/vite-plugin` | HTML compilation, manifests, diagnostics, and static SEO |
| `velodom/compiler` | standalone compiler, optimizers, and language helpers |
| `velodom/localization` | dictionaries, typed keys, `Intl`, locale paths, and locale SEO |
| `velodom/content` | Markdown collections and external content normalization |
| `velodom/assets` | Node image inspection and responsive attributes |
| `velodom/pwa` | opt-in manifest validation and bounded service-worker generation |
| `velodom/node` | explicit Node HTTP-to-Fetch request bridge |
| `velodom/devtools` | opt-in inspector, Lab host, and versioned protocol constant |
| `velodom/testing` | browser-like page/component test mounting |

These paths are intentionally explicit. Files such as `page-router.ts`,
`directives.ts`, and `requests/request-router.ts` are framework internals even
though they are visible in the repository.

## Adapter Contract and Optional Types

VeloDom Core accepts build-tool-neutral lazy resources. The built-in Vite
adapter implements the documented versioned contract; future adapters can use
the same contract and verify it without importing router internals. See the
Adapter and plugin contract section above for resource groups, capabilities,
and a conformance example.

Optional integrations may likewise use `assertPluginConformance()` in their
own tests. This checks the small setup/cleanup shape without installing the
plugin or adding any production runtime code.

JavaScript remains fully supported. TypeScript and JSDoc-aware editors can
optionally use `definePageConfig()`, `defineRequestRoute()`, `definePlugin()`,
and `defineResourceAdapter()` to retain inferred types without changing the
object's runtime shape:

```js
import { definePageConfig } from "velodom";

export default definePageConfig({
  path: "/about",
  seo: {
    title: "About",
    description: "A normal JavaScript VeloDom page config."
  }
});
```

For project-wide convention types, run one command after creating or changing
routes/components:

```bash
vd types
```

The generated `src/velodom.generated.d.ts` is deliberately readable and may be
regenerated at any time. In a TypeScript page, use its declared module only
when helpful:

```ts
import type { VeloDomPageParamsFor } from "velodom/app";

type ArticleParams = VeloDomPageParamsFor<"blog/[slug]">;
```

## Build-Time Asset Quality

VeloDom keeps images as normal `<img>` elements. The compiler warns when an
image source has neither `width` nor `height`, and decorative `alt=""` remains
valid. The optional Node-only `velodom/assets` subpath inspects local image
dimensions/file sizes and creates standard `srcset`, `sizes`, `width`, and
`height` attributes from variants generated by the application's own image
pipeline. It does not add a browser directive, CDN dependency, or image
transformer.

For a combined application report, keep using ordinary HTML and run the
Node-only inspection views:

```bash
vd inspect css
vd inspect assets
vd inspect assets --json
```

`vd inspect css` includes folder and `.vd` style blocks, maps page styles and
statically reachable layout/component styles to routes, compares declaration
blocks across separate resources, and reports class/id selectors with no
visible literal use. It also suggests logical CSS properties through the same
build analyzer used by the Vite plugin. The command never removes a selector.

`vd inspect assets` reads conventional `src/assets` and `public` files. Exact
duplicate content is proven with SHA-256; other findings use byte size,
intrinsic metadata, literal source references, and normal `<img>` attributes.
Possible unused files, responsive variants, and LCP/preload opportunities need
developer review whenever paths or layout are dynamic. Resizing, compression,
preload insertion, and file deletion remain application/build-pipeline work.

## Optional PWA Build

PWA support is a separate build-only capability. Importing `velodom`,
`velodom/vite`, or the normal Vite plugin never registers a service worker.
Enable it during project creation with `--pwa`, or add it later with
`vd add pwa`.

```js
// src/pwa.js
import {
  definePwaCacheStrategies,
  definePwaManifest
} from "velodom/pwa";

export const pwaManifest = definePwaManifest({
  name: "My VeloDom App",
  short_name: "My App",
  start_url: "/",
  scope: "/",
  display: "standalone",
  theme_color: "#5445ee",
  background_color: "#f7f8fc",
  icons: [{ src: "/app-icon.svg", sizes: "any", type: "image/svg+xml" }]
});

export const pwaServiceWorker = {
  offlineFallback: "/offline.html",
  version: "v1",
  strategies: definePwaCacheStrategies([
    { cacheName: "pages", match: "navigation", strategy: "network-only" },
    {
      cacheName: "assets",
      match: "same-origin-assets",
      strategy: "stale-while-revalidate"
    }
  ])
};
```

Optional integration manifest (advanced plugin authors only):

```js
import {
  assertPluginConformance,
  definePlugin,
  inspectPluginConformance
} from "velodom";

const searchPlugin = definePlugin({
  manifest: {
    name: "@example/velodom-search",
    version: "1.2.0",
    velodom: "^1.0.0",
    capabilities: ["browser", "build"],
    conflicts: ["legacy-search"]
  },
  setup({ app }) {
    // Optional integration setup.
  }
});

const report = inspectPluginConformance(searchPlugin, {
  target: "browser"
});
assertPluginConformance(searchPlugin, { target: "browser" });
```

The manifest is optional so small application plugins stay simple. A manifest
declares an exact plugin version, a VeloDom range (`*`, exact, `1.x`, caret,
tilde, or comparator set), one or more `browser`/`build`/`node` capabilities,
and optional package-name conflicts. Inspection is shape-only: it never calls
`setup()` or `cleanup()`. The browser plugin manager rejects incompatible,
build-only, duplicate, or conflicting manifested plugins before setup begins.
V1 does not include a marketplace, remote discovery, or third-party execution
during validation.

```js
// vite.config.js
import { defineConfig } from "vite";
import { velodomPwa } from "velodom/pwa";
import { velodom } from "velodom/vite-plugin";
import { pwaManifest, pwaServiceWorker } from "./src/pwa.js";

export default defineConfig({
  plugins: [
    velodomPwa({ manifest: pwaManifest, serviceWorker: pwaServiceWorker }),
    velodom()
  ]
});
```

`definePwaManifest()` returns stable installability diagnostics for names,
same-origin paths, display mode, scope, and icon sizes.
`definePwaCacheStrategies()` accepts only known matchers and algorithms; no
user function is serialized into the worker. A manifest-only configuration
emits no worker or registration. Supplying `serviceWorker` explicitly emits
the external worker/registration and declared fallback. Navigation defaults
to network-only, and application API/auth responses are never cached
implicitly.

## Editor Intelligence

`velodom/compiler` includes optional language-service helpers for editor
integrations. They reuse compiler diagnostics and directive metadata for HTML
and `.vd` documents, remapping `.vd` template diagnostics to their original
file lines. This is a dependency-free foundation for future editor extensions,
not a mandatory VS Code plugin or browser runtime feature. The optional VS Code package
in `packages/velodom-vscode` reuses that surface for diagnostics, directive
completion/hover text, and conventional component/static-route definitions and
completion. It is stable as workspace tooling but awaits Marketplace publisher
ownership; it remains outside every VeloDom application runtime.

## Rendering, Localization and Server Boundaries

### Available in V1

- static SEO HTML with metadata and concise crawler/no-JavaScript fallback;
- explicit build-time prerender for application-owned route entries;
- page data loaders and typed content collections;
- progressive native forms and optional build-time localization helpers;
- locale-aware paths, native `Intl`, canonical URLs, and `hreflang` records;
- the optional `velodom/node` Fetch-style Node HTTP adapter.

### Planned or deferred in V1

Hybrid request-time rendering, route rendering modes, compiler-generated
islands, partial hydration, streaming, and Edge adapters remain optional
planned or research work. They must not redefine the normal browser-first V1
architecture or add mandatory runtime dependencies.

### Explicitly not automatic

Static rendering is not SSR. Client takeover is not hydration. The Node adapter
does not discover pages, render templates, manage sessions/cookies, enforce
authentication, reconcile DOM, or stream responses. Localization does not
install a browser translation store; request-time locale negotiation, domains,
cookies, and ICU parsing remain application or adapter concerns.

### `velodom/vite`

- `createViteAdapter`
- `createViteApp`
- `mountVeloDom`
- `ViteAppOptions`

### `velodom/assets`

Runtime templates do not receive Vite entry-HTML URL rewriting. For bundled
images, import the file in a page/component script, expose it through `state`,
and use `<img vd-src="logo" alt="Site name">`. Vite then owns the hashed URL.
Files in `public/` can use their public URLs instead. Avoid `/src/assets/...`
in runtime markup: it may work in development and break after deployment.

- `inspectImageAsset`
- `inspectImageDirectory`
- `createResponsiveImageAttributes`

### `velodom/pwa`

- `definePwaManifest`
- `inspectPwaManifest`
- `definePwaCacheStrategies`
- `createPwaServiceWorker`
- `createPwaRegistrationScript`
- `velodomPwa`

### `velodom/devtools`

- `mountDevtoolsInspector`
- `mountVeloDomLab`
- `mountVeloDomErrorOverlay`
- `groupVeloDomErrorReports`
- `VELODOM_DEVTOOLS_PROTOCOL_VERSION`

### `velodom/vite-plugin`

- `velodom`
- `createTemplateModule`
- plugin option types

### `velodom/compiler`

- `compileTemplate`
- `defineTemplateOptimizer`
- `runTemplateOptimizers`
- `createRuntimeFeatureManifest`
- compiler/optimizer result types

### `velodom/testing`

- `compileTestFixture`
- `createRequestMock`
- `dispatchTestEvent`
- `inspectAccessibilitySmoke`
- `mountTestPage`
- `mountTestComponent`
- `resolveTestRoute`
- page/component testing utility types

### `velodom/cli` and `velodom/scaffolder`

- `runVeloDomCli` is the Node-only dispatcher used by package binaries.
- `createVeloDomProject` is the shared Node-only project creation pipeline.
- Scaffolder plan/result types support wrappers without duplicating logic.
- These entry points must never be imported by browser application code.

Modules such as `page-router.ts`, `mount.ts`, `directives.ts`, and
`request-router.ts` are internal. Application code should not import them.
The internal router filenames `page-router.ts` and
`requests/request-router.ts` are still intentionally frozen because VeloDom's
runtime, directive features, tests, and diagnostics refer to them by name.

VeloDom uses the MIT License. The manifest is public, while every new version
and the separate `create-velodom` package still require an explicit human
publish decision. Public API names are tracked by package-boundary tests and
should change only through an intentional architecture decision plus docs.

The release approval process is documented in [RELEASING.md](RELEASING.md).
It is intentionally a human approval checklist, not an automated publish flow.
Repository checks verify local artifacts, not current registry dist-tags.

## Showcase Routes

The repository now includes the first VeloDom framework site. It is a polished
local documentation blog that explains the framework while using VeloDom
features itself.

| Route | Demonstrates |
| --- | --- |
| `/` | V1 landing page, article loops, reusable components, routing, and SEO |
| `/blog/posts/html-first` | dynamic article route, local API data, and `vd-request` reload |
| `/features` | framework feature documentation with code examples, page data, prefetch, recovery, and compiler safety guidance |
| `/playground` | live reactive state, components, slots, refs, expose, and local request exercises |
| `/reference` | source-verified package/API catalog and preferred template syntax index |
| `/single-file` | optional `.vd` page/component authoring with scoped style and config blocks |
| `/404` | route-not-found recovery experience with a normal VeloDom page config |

The showcase uses Tailwind CSS and daisyUI. Those libraries are application
choices, not VeloDom Core dependencies or requirements.

## Storefront Reference Consumer

`examples/velodom-store` proves non-blog storefront and administration
workflows with ordinary CSS and the same public package contract. The public
shell includes URL-backed search/filter/sort/page state, direct product routes
and static SEO entries, keyed product components, page data, request status,
optional shared state, and native currency formatting. Its English/Arabic
control uses the optional direction plugin, whose `ctx.direction` controller
is available to both page and component hooks.

The guest cart persists only a versioned list of product option ids and
quantities. Product names, stock, prices, currency, and tax are recalculated by
a deterministic local HTTP backend before mutations and checkout. The final
handoff records a mock order with an idempotency key and explicitly takes no
payment. The fixture keeps its session/signing authority outside the browser;
real provider credentials and event verification still belong to an
application backend.

The separate `admin` layout reuses that catalog repository and provides:

- `/admin/products` with URL-backed server-style search and pagination;
- `/admin/products/:id` detail and `/admin/products/:id/edit` native form routes;
- native constraints plus repeated server-side fixture validation;
- an expected-revision write contract whose failure/conflict paths preserve the
  page-owned draft and provide explicit authoritative reload;
- a native confirmation dialog for bulk publish/archive actions; and
- focus-restored live status, keyboard controls, semantic table/form/dialog
  markup, and status words in addition to color.

These routes are marked `noindex,nofollow`. They demonstrate a client workflow,
plus an explicit replaceable HTTP/session contract. The server fixture repeats
role, owner, tenant, CSRF, expiry, price/currency/stock/tax, revision, and order
transition checks independently of UI guards. Integration tests prove denied
and tampered writes, duplicate idempotency keys, private-cache headers, account
changes, and pending-request cancellation; no payment SDK or secret enters the
browser build.

Run it independently from the workspace root:

```bash
npm run dev:store
npm run build:store
npm run preview:store
```

The normal root build includes its production build. The browser release gate
checks direct links, Back/Forward filters, refresh and blocked persistence,
keyboard activation, mobile layout, RTL, quotation, mock checkout, admin URL
search, failed/conflicting draft recovery, focus restoration, and confirmed
bulk changes. See its application-level details in
`examples/velodom-store/README.md`.

## Organizing Larger Applications

Grow the application, not the framework's discovery rules. Keep pages,
components, layouts, and API routes where VeloDom already discovers them.
Move reusable application behavior into explicitly imported, feature-owned
modules when a page script grows. `domain` below is an application convention,
not a special folder or automatic service registry.

```text
src/
  pages/                    routes, page state, forms, loading/error/empty UI
    home/                   catalog presentation
    products/[id]/          public product presentation
    cart/                   guest cart presentation
    sign-in/                account/session presentation
    admin/products/         list, detail and edit presentation
  components/               shared UI; nested names remain supported
    product-card/           catalog UI
    store-nav/              shared navigation
  layouts/                  public/admin shells with one <vd-page>
  api/                      named browser request handlers and middleware
  domain/                   explicit imports; not auto-discovered
    catalog/                public fixture records and backend/SEO helpers
    cart/                   guest ids/quantities and persistence
    auth/                   account/navigation UX; never authorization authority
    admin/                  backend fixture validation/revision policy
    backend/                HTTP client and application wire contracts
  main.js                   public VeloDom bootstrap/plugin composition
server/                     separate backend authority; never browser imports
```

This is the actual store reference shape, not a required new starter. A larger
team may put account/profile clients into `domain/account` or generic UI into
`components/ui`; those names add no framework behavior.

### Ownership and dependency direction

| Layer | Owns | May depend on |
| --- | --- | --- |
| Page | Local draft, accessible UI, route/query values, recovery | Shared UI, feature modules, public `velodom` imports |
| Component/layout | Reusable presentation, explicit props/events, shell | Public runtime, small application helpers; not another page's script |
| `src/api` | Stable request names, browser request shaping | Application HTTP client, public request helpers |
| Feature module | Cart model, formatting, account UX, domain contracts | Other explicit feature contracts and public package APIs |
| Backend | Session, permission, tenant, price, inventory, write authority | Server-safe domain helpers and private server configuration |
| Vite/build configuration | Compiler integration and public SEO snapshots | Public build-only package subpaths and reviewed build-time data |

Avoid importing page scripts into shared modules: that reverses ownership and
couples unrelated routes. Share a small function or contract instead. Use
relative imports, the configured `@` alias, or the package's `#app/*` mapping;
none bypass the browser/server boundary. There is no dependency-injection
container, mandatory global store, or auto-discovered `services` folder.

### JavaScript first, optional typed contracts

`examples/velodom-store/src/domain/backend/contracts.d.ts` describes the
example's wire values. Its JavaScript HTTP wrapper uses JSDoc, so editors and
TypeScript callers see the same contracts without a duplicate TS application.
An application may progressively rename a `script.js` to `script.ts` (remove
the replaced file) or keep plain JS indefinitely.

```js
import { quoteCartFromServer } from "#app/domain/backend/store-api-client.js";

/** @type {import("#app/domain/backend/contracts.js").CartLine[]} */
const lines = [{ productId: "aurora-lamp", variantId: "midnight", quantity: 1 }];
const quote = await quoteCartFromServer({ lines });
console.log(quote.totalCents); // app-owned StoreQuote contract
```

```ts
import type { PageScriptContext } from "velodom";
import type { CartLine } from "#app/domain/backend/contracts.js";
import { quoteCartFromServer } from "#app/domain/backend/store-api-client.js";

type CheckoutState = { totalCents: number };

export async function init({ state, ctx }: PageScriptContext<CheckoutState>) {
  const lines: CartLine[] = [
    { productId: "aurora-lamp", variantId: "midnight", quantity: 1 }
  ];
  const quote = await quoteCartFromServer({ lines }, { signal: ctx.signal });
  if (!ctx.signal.aborted) state.totalCents = quote.totalCents;
}
```

These are **application** imports and types, not exports from `velodom`.
`.d.ts` and JSDoc disappear at runtime; the wrapper's response assertions
describe the tested fixture contract, not JSON validation. A real backend must
validate input and the application should validate untrusted responses as
appropriate. Static types cannot enforce positive quantities, stock, money,
CSRF, or authorization. Model authenticated/anonymous sessions separately,
and keep cookies/signing secrets out of public DTOs. Framework lifecycle types
are available from `velodom`; do not import internal type files.

### Configuration and environments

- Browser configuration is public. Vite's `import.meta.env.VITE_*` values are
  embedded in client output; only non-secret origins, labels, and public flags
  belong there. `src/api` is also browser code.
- Server secrets belong to the independently deployed backend's environment
  and secret-management policy, never application imports or browser env flags.
  Importing a server module from a page defeats that separation.
- Development and local preview mount the store's deterministic HTTP fixture
  through `server/vite-backend-plugin.js`. `vite build` emits static client
  files, not a deployed backend. Deploying `dist` alone does not deploy session,
  catalog, quote, or order endpoints. Replace the fixture with a backend/reverse
  proxy; configure cross-origin credentials/CORS/CSRF deliberately if needed.
- Build-time SEO entries use reviewed public fixture snapshots. Runtime reads
  use the HTTP client. Do not load private account/admin data into static HTML
  or imply a build snapshot is live inventory.
- The examples target the site root (`/`). Vite `base` rewrites asset URLs; it
  does **not** automatically prefix VeloDom route paths, `vd-nav` links, or API
  endpoints. For `/shop/`, explicitly coordinate page `config.path`, links,
  canonical/SEO paths, proxy endpoints, host SPA fallback and asset base. Do not
  invent a `routerBase` option. Root hosting is the simplest supported recipe;
  subdirectory behavior needs deployment tests for that configuration.

### Verify boundaries with the installed package

```bash
vd inspect --json
vd routes --json
vd doctor --json
npm run build
```

`inspect` shows discovered resources, `routes` shows actual paths, and `doctor`
checks static references/configuration. Advisory unused-handler findings can
be legitimate for programmatic calls; inspect them rather than deleting code
blindly. These commands do not prove backend authorization or dynamic behavior.

Repository maintainers run `npm run package:consumer`: it installs a local
tarball, checks the six generated starter combinations, then copies both real
reference applications into an isolated directory. The installed package runs
their inspection/route/doctor/build gates, rejects private package imports and
server-secret markers in client chunks, and strictly type-checks the JS store
HTTP wrapper with a TS caller. Framework syntax, CLI flags, package exports,
starter selection, and runtime weight are unchanged by this recipe.

## Verification

The current source baseline is verified through repeatable repository commands,
not historical run counts or registry state. The required gates cover:

- source documentation headers and documentation consistency
- TypeScript, ESLint, and automated tests
- ESM and declaration generation
- package-contract and package dry-run validation
- npm tarball includes the focused package README and license while repository
  docs, examples, tests, and raw framework TypeScript remain outside it
- an isolated local-tarball TypeScript/Vite consumer passes
- local rendering benchmark script passes
- JavaScript performance budget check passes
- production showcase build passes
- local browser smoke coverage plus the strict Chromium, Firefox, WebKit, and
  mobile WebKit workflow on the exact release commit
- deployment/static SEO contract passes locally for root HTML, generated route
  folders, dynamic SEO entries, and unknown-route SPA fallback

Current V1 source baseline:

- Consolidated roadmap, release, architecture, browser, and engineering
  Markdown under `docs/`, with a deliberately short repository README that
  directs contributors to this complete guide.
- Separated the publishable `velodom` package into `packages/velodom` and
  moved the documentation blog to `examples/velodom-blog`, where it consumes only
  public package exports like a real client project.
- Added flexible client imports: stable `velodom/*` package subpaths, a short
  Vite/editor `@` alias, standards-based `#app/*` imports, and unchanged
  relative imports. New CLI projects generate the required config.
- Added optional typed `config.ts` for folder pages across Vite runtime
  discovery, static SEO generation, CLI analysis, doctor/docs output, and
  `vd create page --ts`; Vanilla `config.js` remains dependency-free.
- Split the monolithic CLI implementation into focused analyzer, reporter,
  scaffold, and shared-contract modules while preserving command/output
  compatibility; `cli.ts` now concentrates on command orchestration.
- Added the beginner-first `mountVeloDom()` Vite bootstrap with automatic
  request-route and application-middleware registry discovery.
- Kept `createViteApp()` and generic `createApp()` as progressively more
  explicit composition levels rather than removing advanced control.
- Updated CLI project generation to emit a complete HTML shell and the same
  one-call bootstrap used by the documentation.
- Reduced showcase CSS from about 1.16 MB to about 70 KB by using the daisyUI
  Tailwind plugin instead of its complete prebuilt stylesheet.
- Reconciled the consolidated guide, roadmap, decisions, changelog, and release
  policy around one local `1.0.0` source baseline without claiming registry
  availability or an official release.
- Added provider-neutral deployment recipes to the deployment section.
- Added optional `velodom/content` build-time helpers for Markdown
  collections, SEO entries, sitemap records, RSS XML, search-index records,
  and typed content metadata.
- Added optional static SEO content rendering through `seo.renderPage`.
- Updated framework contracts, SEO constants, Vite plugin options, and static
  renderer behavior in `packages/velodom/src`.
- Added focused coverage in `tools/tests/compiler/seo-renderer.test.js`.
- Added reusable structured-data fixtures for WebSite, BlogPosting,
  BreadcrumbList, FAQPage, and Product JSON-LD validation coverage.
- Added an internal naming guard that freezes `page-router.ts` and
  `requests/request-router.ts` as framework-owned module filenames.
- Added `vd-auto-state` as the preferred friendly alias for automatic request
  loading/error state while keeping `vd-request-state` compatible.
- Froze automatic request state suffixes as `Result`, `Loading`, and `Error`,
  including nested state-path behavior.
- Froze the component public API pattern as `return { state, expose }` and
  exported the `ComponentExpose` TypeScript contract.
- Added compiler-first text interpolation with `{{ expression }}` so inline
  reactive text no longer requires extra wrapper elements.
- Added literal interpolation escapes with `\{{ expression }}` and raw
  `vd-pre` sections for documentation/code examples.
- Added optional `src/layouts/` support with default, named, and disabled page
  layouts selected through page config.
- Migrated the showcase pages to `src/layouts/default.vd` so nav/footer are
  shared from one application-owned layout instead of repeated in every page.
- Added declarative request debounce through `debounceMs` in request config and
  the `vd-debounce` shorthand attribute.
- Added declarative request throttle through `throttleMs` in request config and
  the `vd-throttle` shorthand attribute.
- Added declarative request retry through `retry`, `retries`, and
  `retryDelayMs` in request config.
- Added opt-in auth-failure redirects through `authRedirect` on routes and
  `redirectOnAuthFailure` in request config.
- Added global `requestHooks.beforeRequest` / `requestHooks.afterRequest` and
  per-request `onSuccess` callbacks.
- Verified the optional native validation API, built-in required/min/max/pattern
  handling, error marker conventions, and request-flow integration.
- Added build-time RTL CSS diagnostics for folder CSS and `.vd` style blocks.
- Added UTF-8 app-shell diagnostics and scoped CSS `:global(...)` escapes for
  document-level direction selectors.
- Added optional `createRtlFlipStyles()` CSS generation and the bounded
  build-time localization DX surface: typed keys, native `Intl`, locale paths,
  and locale-aware canonical/`hreflang` output.
- Optimized loop rendering so unchanged item structures keep existing DOM nodes
  while nested directives still update normally.
- Reduced unnecessary DOM writes in text, attribute, value, boolean, class, and
  style bindings when evaluated values are unchanged.
- Expanded `npm run benchmark:rendering` with a stable-loop update case and
  added `npm run performance:check` to enforce generated JavaScript budgets.
- Added `vd` / `create-velodom` package binaries for static inspection,
  project stats, route listing, and convention-first scaffolding.
- Added `vd doctor` for local static diagnostics covering compiler issues,
  missing components, broken request references, and page config path mistakes.
- Added `vd build-report` for machine-readable build/project intelligence.
- Added `vd graph` for JSON/Mermaid project relationship graphs.
- Added `vd health` with an advisory score, optional thresholds, SEO and
  accessibility signals, and simple security checks.
- Added `vd docs` for generated Markdown/JSON project documentation.
- Extended the project analyzer manifest to include CSS files, refs, events,
  state keys, exposed names, and SEO config files.
- Extended `vd doctor` with warnings for broken `$refs`, duplicate declarative
  `vd-state` names, unknown event handlers, unsafe dynamic directive
  expressions, unused components/request routes/middleware, unreachable
  showcase files, circular component dependencies, and large templates.
- Extended `vd graph` with statically provable ref, event, state, and expose
  relationships.
- Extended `vd build-report` with unused directive families, largest route
  chunks, repeated heavy-dependency signals where visible in generated chunks,
  and advisory optimization suggestions.
- Added `vd benchmark` as a CLI wrapper around the repeatable local rendering
  benchmark script.
- Converted the application showcase into the first VeloDom framework site: a
  local documentation blog with V1 positioning, framework articles, examples,
  and SEO entries.
- Removed obsolete DummyJSON, login, category, and CRUD studio application
  files from `src/pages`, `src/api`, and `src/components`.
- Simplified `src/main.js` to mount the V1 site with the Vite adapter and the
  one local article request route used by examples.
- Fixed modal overlay semantics and the footer external-link security signal.
- Updated the browser E2E smoke path to cover the V1 site routes,
  one-file page, local request examples, article page, and no-JavaScript SEO.
- Added `velodom/testing` with `mountTestPage()` and `mountTestComponent()`
  for public DOM test helpers.
- Added DX, future research, and framework identity documents under `docs/`.
- Added optional direction management through `createDirectionPlugin()` and
  compiler support for explicit `vd-rtl-flip` directional icon markers.
- Updated `TODO.md`, `NOTES.md`, `CHANGELOG.md`, and the consolidated architecture
  section to
  distinguish client takeover from
  true SSR hydration.
- The static-hosting contract verifies real files and generated directories
  before fallback to `/index.html`; generated SEO HTML includes metadata,
  canonical links, visible fallback content, and JSON-LD for dynamic routes.

Test coverage includes:

- compiler directives, expressions, diagnostics, manifests, and optimizers
- optional `.vd` single-file parsing, resource mapping, static SEO config, and
  runtime-module generation
- compiler accessibility warnings for common static template issues
- resource-map and package boundaries
- routes, guards, params, and query parsing
- hash-fragment navigation, scroll restoration, router-managed focus, and
  opt-in route prefetch
- reactive state, lifecycle, events, refs, plugins, optional shared state,
  optional validation, optional request cache/retry, and optional devtools
  bridge behavior
- real DOM directives, components, navigation, errors, and requests
- loop structural rerender skipping for unchanged item identities
- recoverable page and component error-boundary fallback and retry behavior
- keyboard modifier, focusable-order, and semantic fallback output integration
  checks
- auth providers, role checks, middleware modes, request bindings, and HTTP
  behavior
- runtime/static SEO, API/CMS-backed dynamic SEO entries, and
  installed-package SEO generation
- frozen public runtime, compiler, Vite adapter, Vite plugin, type, and package
  subpath exports
- package-boundary guardrails that keep SSR and hydration APIs deferred
- CLI inspection, stats, route listing, benchmark delegation, diagnostics,
  build reporting, and scaffolding behavior
- JSON and Mermaid project graph generation, including static refs/events/
  state/expose relationships
- generated route/component/request/reference/state/expose documentation
- public page/component testing utilities
- source-aware adapter errors and user-file loader failure reporting
- a real-browser Playwright matrix for Chromium/Chrome/Edge plus optional
  Firefox, WebKit, and mobile WebKit coverage of routing, form model updates,
  request fulfillment, and no-JavaScript static SEO HTML

Strict CI execution for every browser target still depends on installing the
matching Playwright browser binaries. Current fast DOM integration uses
happy-dom.

## Release Decision

The repository is aligned as the local V1 source baseline, but its current
`1.0.0` manifest cannot be republished after the earlier npm unpublish. No
official release or registry availability is inferred from the source tree.
[Current Release Decision](#current-release-decision) records the verification
and explicit owner-approval requirements before publishing or tagging.

## Browser Support

The V1 candidate browser policy is documented in the [Browser Policy](#browser-policy)
section of the release guide.
VeloDom targets modern evergreen browsers:

- latest two stable versions of Chrome, Edge, Firefox, and Safari
- latest two stable versions of iOS Safari and Android Chrome
- browsers with native ES modules and baseline runtime APIs such as `Proxy`,
  `AbortController`, `URL`, `URLSearchParams`, `fetch`, `history.pushState`,
  and standard DOM events

VeloDom does not target Internet Explorer, legacy EdgeHTML Edge, Opera Mini, or
browsers without native ES modules.

`npm run test:browser` runs a Playwright-powered matrix. A local Chrome, Edge,
or Playwright Chromium target is required, and desktop/mobile Chromium run by
default. Set
`VELODOM_BROWSER_TARGETS=chromium,mobile-chromium,firefox,webkit,mobile-webkit`
to select the complete matrix and `VELODOM_BROWSER_STRICT=1` to fail instead of
skipping a selected optional target that cannot launch. Release CI sets both.
`happy-dom` remains the fast local DOM
integration environment; it is not treated as a replacement for real-browser
E2E coverage.

## Best Practices

- Keep templates declarative and move multi-step logic into page/component
  scripts.
- Replace nested objects/arrays to trigger shallow reactive updates
  predictably.
- Prefer page events for notifications and `expose` for direct child commands.
- Use transform middleware by default; use `next()` only when wrapping
  downstream work.
- Keep request handlers and business middleware in `src/api`, not Core.
- Give every async request an explicit or automatic result/loading/error
  destination.
- Pass lifecycle `ctx.signal` to owned async work and register other cleanup
  through `ctx.onCleanup`.
- Mark private/action/error routes `noindex` and provide concrete SEO entries
  only for real dynamic content.
- Treat localStorage auth as a demo and enforce authorization on the server.
- Import only documented package entry points from application code.

## Current Limitations

These features are not implemented and should not be described as available:

- schema-based validation and custom validation rules beyond the optional
  native validation plugin
- declarative request cache
- ICU-style message formatting, locale negotiation, and a browser translation
  provider beyond optional build-time dictionaries, native `Intl` helpers, and
  locale routes
- broader keyboard/focus UX beyond the current integration coverage
- advanced shared-state patterns beyond the optional `createSharedState()`
  helper
- a browser extension, hosted/remote Lab, source-writing editor, or mutable
  state inspector beyond the optional local read-only VeloDom Lab
- general-purpose full-page SSG/SSR with reconciliation or hydration
- automatic full-content API/CMS pre-rendering beyond explicit app-owned
  build-time SEO/content hooks
- guaranteed strict CI browser availability for every Firefox/WebKit/mobile
  WebKit target
- optional AI provider tooling and migration helpers; both remain documented
  future research and are not required for VeloDom projects

The current reactive state is shallow. Static SEO emits metadata and concise
fallback content, not the complete interactive page.

## Roadmap and Handoff

The prioritized roadmap and progress counter live in [TODO.md](TODO.md).
Important milestone history lives in [CHANGELOG.md](CHANGELOG.md). Architecture
decisions and deferred ideas live in [NOTES.md](NOTES.md). Release rules live
in [RELEASING.md](RELEASING.md).
DX acceptance rules, optional AI and migration research, and VeloDom positioning
live in the consolidated architecture section above.

The local V1 release candidate is functionally complete. Remaining unchecked
items are release governance, a strict Firefox-capable browser run, starter
presets that depend on the public npm path, and intentionally deferred advanced
capabilities. None authorizes a mandatory virtual DOM, JSX, CMS, global store,
or universal SSR runtime.

When continuing development:

1. Keep generic framework logic under `packages/velodom/src`.
2. Keep the documentation application under `examples/velodom-blog/src`; client
   projects own their own `src/pages`, `src/components`, and `src/api`.
3. Update README, TODO, CHANGELOG, and NOTES after significant work.
4. Add a regression test for every Core bug or behavior change.
5. Run `npm test` and `npm run build` before committing important changes.
6. Do not publish or push externally without explicit authorization.
