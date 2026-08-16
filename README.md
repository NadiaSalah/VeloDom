# VeloDom

VeloDom is a compiler-first, HTML-first frontend framework for folder-first
single-page applications with optional `.vd` single-file modules. Pages and
components use ordinary HTML, reactive state, declarative directives,
route-aware lifecycle hooks, and an optional request layer without JSX or TSX.

The framework source is TypeScript. Application authors may choose Vanilla
JavaScript or TypeScript independently for every page and component.

> Project status: local V1 release candidate. The publishable package lives at
> `packages/velodom`, uses version `1.0.0`, and keeps `private: true` until the
> npm release is explicitly approved. Public API names are frozen locally and
> protected by package-boundary tests.

## Contents

- [What Works Today](#what-works-today)
- [Five-Minute Start](#five-minute-start)
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
- [Future Static Rendering, Forms, and Localization](#future-static-rendering-forms-and-localization)
- [JavaScript and TypeScript](#javascript-and-typescript)
- [Error and Security Model](#error-and-security-model)
- [Public Package Boundaries](#public-package-boundaries)
- [Showcase Routes](#showcase-routes)
- [Verification](#verification)
- [Release Decision](#release-decision)
- [Browser Support](#browser-support)
- [Best Practices](#best-practices)
- [Current Limitations](#current-limitations)
- [Roadmap and Handoff](#roadmap-and-handoff)
- [Focused Documentation](docs/README.md)

## What Works Today

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
- configurable server-session and demonstration localStorage auth providers
- runtime head management and static SEO HTML generated from page
  `config.js` or optional `config.ts`
- optional build-time content helpers through `velodom/content` for Markdown
  collections, SEO entries, sitemap records, RSS XML, and local search indexes
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
documented in [docs/CONTENT_MODE_DESIGN.md](docs/CONTENT_MODE_DESIGN.md). It is
intentionally tooling-oriented, not a mandatory browser runtime layer.

## Five-Minute Start

For this repository workspace, these commands build the local `velodom`
package and run the independent blog example:

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
  <button type="button" vd-on:click="increment()">
    Count: {{ count }}
  </button>
</main>
```

Add its optional behavior:

```js
// src/pages/hello/script.js
export function init({ state }) {
  state.title = "Hello VeloDom";
  state.count = 0;
  state.increment = () => {
    state.count += 1;
  };
}
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
npm run lint
npm run check
npm run package:check
npm run pack:check
npm run benchmark:rendering
npm run performance:check
npm run test:browser
npm run build
npm run preview
```

What the main checks do:

| Command | Purpose |
| --- | --- |
| `npm test` | Runs compiler, core, request, package, and DOM integration tests. |
| `npm run docs:check` | Enforces headers and exported JSDoc under `packages/velodom/src`. |
| `npm run check` | Runs documentation, TypeScript, and ESLint checks. |
| `npm run package:check` | Builds ESM/types and tests an installed local tarball consumer. |
| `npm run pack:check` | Runs package checks and inspects the npm tarball dry-run contents. |
| `npm run benchmark:rendering` | Runs local happy-dom page-binding and loop-rendering benchmarks. |
| `npm run performance:check` | Enforces JavaScript size budgets for generated chunks and package runtime modules after build artifacts exist. |
| `npm run test:browser` | Builds the showcase and runs the Playwright browser matrix. Chromium/Chrome/Edge is required; Firefox, WebKit, and mobile WebKit run when installed. |
| `npm run build` | Runs all quality/package gates, builds the showcase, then checks performance budgets. |

Generated `examples/blog/dist`, `packages/velodom/lib`, and
`packages/velodom/types` folders are build output and should not be edited
manually.

## CLI and Project Intelligence

VeloDom includes package binaries for local, static developer tooling:

```bash
vd inspect
vd doctor
vd stats
vd routes
vd graph --mermaid
vd health --min-score 80
vd benchmark
vd build-report --json
vd docs
vd create page blog/posts/[id] --ts
vd create component shared/post-card --single-file
vd create api posts
vd create demo features/demo
vd create middleware
vd create plugin analytics
create-velodom my-site
```

Inside this repository, run `npm run package:build` first, then use
`node packages/velodom/bin/vd.js ...` because the wrappers load the generated
`packages/velodom/lib/cli.js`.
After installation from npm, the `vd` and `create-velodom` binaries are
available directly through the package manager.

The CLI is intentionally static and local. `vd inspect` and `vd stats` read
folders, `.vd` files, API route registrations, middleware files, template
directives, CSS files, refs, events, state keys, exposed names, compiler
feature manifests, SEO configs, and test-file signals without adding any
browser runtime behavior.
`vd doctor` adds actionable checks for compiler diagnostics, missing component
references, broken request references, broken `$refs` usage, duplicate
declarative `vd-state` names, unknown event handlers, unsafe dynamic
directive expressions, unused components/request routes/middleware,
unreachable showcase files, circular component dependencies, large templates,
and simple page config mistakes.
`vd build-report` summarizes project counts, SEO coverage, compiler features,
unused directive families, unused runtime feature modules, largest pages/
components, largest route chunks, repeated heavy-dependency signals visible in
generated chunk text, generated JavaScript/CSS chunks, and optimization
suggestions in text or JSON for CI dashboards.
`vd graph` exports page-route, page/component dependency, request, and
middleware relationships plus statically provable refs, events, state keys, and
exposed names as text, JSON, or Mermaid.
`vd health` summarizes doctor issues, SEO coverage, accessibility/compiler
warnings, security link checks, generated bundle size, and unused runtime
feature signals into a non-blocking score. It fails only when `--min-score` or
`.velodom-health.json` config asks it to enforce a threshold.
`vd docs` generates Markdown or JSON documentation for routes, components,
requests, middleware, plugins, refs, events, state, exposed names, slots, and
SEO coverage where static analysis can prove the relationship.
`vd benchmark` delegates to the project's `benchmark:rendering` script so
performance checks stay repeatable and outside the browser runtime.

## Testing Utilities

Use `velodom/testing` in happy-dom, jsdom, or real-browser tests when you want
to mount small VeloDom units without importing internal core files:

```js
import { mountTestPage, mountTestComponent } from "velodom/testing";

const page = await mountTestPage("<h1 vd-text=\"title\"></h1>", {
  state: {
    title: "Hello tests"
  }
});

page.state.title = "Updated";
await page.cleanup();
```

`mountTestPage()` compiles preferred `vd-*` syntax, creates reactive state,
applies directives, and returns `{ root, state, cleanup }`.
`mountTestComponent()` mounts one in-memory component definition with optional
props, slots, module hooks, style, and manifest overrides.

## Project Structure

```text
packages/
  velodom/                    publishable npm package named "velodom"
    package.json              public exports, peers, binaries, publish guard
    bin/                      vd and create-velodom CLI wrappers
    src/                      framework-owned TypeScript
    adapters/                 build-tool resource discovery
    cli/                      static analysis, reporters, scaffolds, contracts
    compiler/                 HTML compiler and optimizer contracts
    directives/features/      lazy directive runtime modules
    errors/                   structured error reporting
    expression/               safe expression tokenizer/parser/evaluator
    requests/                 HTTP, auth, middleware, request runtime
    shared/                   generic validation and path helpers
    vite-plugin/              template compilation and static SEO rendering

examples/
  blog/                       independent VeloDom consumer application
    src/
      pages/                  application-owned pages
      layouts/                optional application-owned page shells
      components/             application-owned components
      api/                    application-owned handlers and middleware
      assets/                 application-owned static assets
      main.js                 one-call application bootstrap
  package-consumer/           installed-package verification fixture

test/                         automated tests
test-support/                 reusable test environment helpers
docs/                         DX, future research, and identity notes
scripts/                      workspace release and quality checks
```

Ownership rule:

- Framework behavior that is generic across sites belongs in
  `packages/velodom/src` and is published only as built `lib` plus `types`.
- Business pages, components, route handlers, and custom middleware stay in
  the consuming application's `src/pages`, `src/components`, and `src/api`.
- The blog is a real workspace consumer under `examples/blog`; it does not
  import framework source or carry a private copy of Core.
- Repository-wide TypeScript, ESLint, tests, and release scripts stay at the
  workspace root. Application Vite/Tailwind configuration belongs to the app.

Use the [focused documentation map](docs/README.md) to distinguish shipped V1
capabilities from optional tooling and approved future research.

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

// Short Vite/editor alias configured by the starter and blog example.
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

Components can also use `.vd`:

```text
src/components/badge.vd
src/components/shared/card.vd
```

If `src/pages/about/` and `src/pages/about.vd` both exist, the folder version
wins. This keeps `.vd` additive instead of replacing the folder-first model.
The showcase includes `/single-file` and
`src/components/shared/single-file-card.vd` as working examples.

## Application Bootstrap

The recommended Vite bootstrap delegates framework wiring to Core:

```js
// src/main.js
import "./style.css";
import { mountVeloDom } from "velodom/vite";

await mountVeloDom();
```

`mountVeloDom()` automatically supplies the Vite resource adapter and discovers
default exports from `src/api/routes.js|ts` and
`src/api/middleware.js|ts` when those files exist. Keep only one extension for
each registry. Explicit options win over discovered files.

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
  <button type="button" vd-on:click="increment()">
    Count: <span vd-text="count"></span>
  </button>
</main>
```

```js
// src/pages/counter/script.js
export function init({ state }) {
  state.title = "Counter";
  state.count = 0;
  state.increment = () => {
    state.count += 1;
  };
}
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

Page state is preserved when navigating away and returning during the same app
runtime. Mounted component state is recreated.

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
without remounting the current page.

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
other iterable values are accepted. Loop rerenders dispose old node listeners
and subscriptions.

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
accept a CSS string or object. Attribute values of `false`, `null`, or
`undefined` remove the attribute; `true` creates an empty boolean attribute.

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
component needs to change them.

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
- passes `credentials` and `AbortSignal` when supplied
- returns `null` for HTTP 204
- throws `ApiError` with `status`, `url`, and parsed `body`

### Route Registry

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

A route is either a handler function or:

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

### Recipe: Create, Update, and Delete Forms

Use the same small pattern for CRUD screens:

1. keep draft values in page state with `vd-model`
2. point the form/button at an application-owned API route with `vd-request`
3. use `target` plus `autoState` so VeloDom derives result/loading/error names
4. install `createValidationPlugin()` only when native form validation is needed

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
  vd-request-config="{ target: 'createResult', autoState: true }"
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

Application middleware belongs in `src/api/middleware.js`.

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

Use it by name:

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

Translation dictionaries, pluralization, message formatting, and locale-aware
routes are intentionally separate from this direction layer. They remain future
plugin research so VeloDom does not make multilingual presentation depend on a
mandatory i18n runtime.

## SEO and Static Route HTML

SEO is declared in each page's `config.js` or optional `config.ts`:

```js
export default {
  seo: {
    title: "Articles | Example",
    description: "Practical articles built with VeloDom.",
    canonical: "/articles",
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

### SSR and Hydration Policy

VeloDom V1 stays browser-first and compiler-first. `seo.renderPage` provides
optional build-time static content plus client takeover, not a React/Vue-style
SSR reconciliation engine. `renderToString`-style APIs and persistent server
runtime APIs are intentionally not part of the public package surface yet.
Broader SSR/hydration can be reconsidered only after a proven design, browser
coverage, and runtime stability are mature enough to protect the HTML-first
authoring model.

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

## Deployment and Static Hosting

Detailed provider recipes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
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
  ttlMs: 30_000
});

export const routes = {
  posts: {
    getOne: withRequestRetry(
      params => apiCache.requestJson(`/api/posts/${params.id}`),
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

For local development only, an application that registered the bridge can
explicitly import `mountDevtoolsInspector` from `velodom/devtools`. It renders a
small read-only inspector and fails if the bridge is absent, so it cannot add a
hidden production panel.

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
- converts preferred directive names
- reports compiler errors through Vite
- keeps baseline accessibility diagnostics as non-blocking compiler warnings
- emits development metadata by default in development
- emits deterministic runtime feature manifests
- lets the runtime load only required directive feature modules
- generates static SEO route documents after a normal client production build

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

Frontend auth and roles improve application UX only. A backend must enforce
real access control.

## Public Package Boundaries

Intended public imports:

### `velodom`

Runtime:

- `createApp`
- `definePageConfig`
- `defineRequestRoute`
- `definePlugin`
- `defineResourceAdapter`
- `assertResourceAdapterConformance`
- `createDevtoolsPlugin`
- `createDirectionPlugin`
- `createPluginManager`
- `createRequestCache`
- `createRtlFlipStyles`
- `createSharedState`
- `createValidationPlugin`
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

Public types include page/component contexts, route/auth/request/plugin
contracts, request hook payloads, optional cache/retry/devtools contracts,
direction plugin contracts, shared-state contracts, validation plugin options,
SEO contracts, application options, and HTTP options.

## Adapter Contract and Optional Types

VeloDom Core accepts build-tool-neutral lazy resources. The built-in Vite
adapter implements the documented versioned contract; future adapters can use
the same contract and verify it without importing router internals. See
[docs/ADAPTERS.md](docs/ADAPTERS.md) for resource groups, capabilities, and a
conformance example.

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

## Build-Time Asset Quality

VeloDom keeps images as normal `<img>` elements. The compiler warns when an
image source has neither `width` nor `height`, and decorative `alt=""` remains
valid. The optional Node-only `velodom/assets` subpath inspects local image
dimensions/file sizes and creates standard `srcset`, `sizes`, `width`, and
`height` attributes from variants generated by the application's own image
pipeline. It does not add a browser directive, CDN dependency, or image
transformer. See [docs/ASSETS.md](docs/ASSETS.md).

## Editor Intelligence

`velodom/compiler` includes optional language-service helpers for editor
integrations. They reuse compiler diagnostics and directive metadata for HTML
and `.vd` documents, remapping `.vd` template diagnostics to their original
file lines. This is a dependency-free foundation for future editor extensions,
not a mandatory VS Code plugin or browser runtime feature. See
[docs/EDITOR_INTELLIGENCE.md](docs/EDITOR_INTELLIGENCE.md). An optional VS Code
prototype lives in `integrations/vscode/velodom-language`; it offers directive
completion/hover text and conventional component or static-route definitions.

## Future Static Rendering, Forms, and Localization

VeloDom's accepted V2 designs keep expansion outside the mandatory browser
runtime: richer static route rendering remains build-time and distinct from
SSR; form enhancement starts from native HTML `action`/`method`; and
localization stays an optional build-time plugin separate from RTL direction.
The implementation contracts and required test gates are documented in
[static rendering](docs/STATIC_RENDERING_DESIGN.md),
[progressive forms](docs/PROGRESSIVE_FORMS.md),
[localization](docs/LOCALIZATION_DESIGN.md), and the
[development inspection protocol](docs/DEVTOOLS_PROTOCOL.md).

### `velodom/vite`

- `createViteAdapter`
- `createViteApp`
- `mountVeloDom`
- `ViteAppOptions`

### `velodom/assets`

- `inspectImageAsset`
- `inspectImageDirectory`
- `createResponsiveImageAttributes`

### `velodom/devtools`

- `mountDevtoolsInspector`

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

- `mountTestPage`
- `mountTestComponent`
- page/component testing utility types

Modules such as `page-router.ts`, `mount.ts`, `directives.ts`, and
`request-router.ts` are internal. Application code should not import them.
The internal router filenames `page-router.ts` and
`requests/request-router.ts` are still intentionally frozen because VeloDom's
runtime, directive features, tests, and diagnostics refer to them by name.

VeloDom uses the MIT License. Package publishing remains intentionally blocked
by `private: true` in `packages/velodom/package.json` until a human approves
the exact npm account, access level, 2FA setup, and package reservation. Public API names are tracked by
package-boundary tests and should change only through an intentional
architecture decision plus documentation update.

The release approval process is documented in [RELEASING.md](RELEASING.md).
It is intentionally a human approval checklist, not an automated publish flow.
The package name `velodom` returned 404 from the npm registry on 2026-07-09,
so it appears available, but final ownership still requires npm login and
explicit publication approval.

## Showcase Routes

The repository now includes the first VeloDom framework site. It is a polished
local documentation blog that explains the framework while using VeloDom
features itself.

| Route | Demonstrates |
| --- | --- |
| `/` | V1 landing page, article loops, reusable components, routing, and SEO |
| `/blog/posts/html-first` | dynamic article route, local API data, and `vd-request` reload |
| `/features` | framework feature documentation with live directive examples |
| `/single-file` | optional `.vd` page/component authoring with scoped style and config blocks |

The showcase uses Tailwind CSS and daisyUI. Those libraries are application
choices, not VeloDom Core dependencies or requirements.

## Verification

Latest local verification on 2026-08-17:

- Core documentation audit passes for 68 TypeScript files
- TypeScript check passes
- ESLint passes
- 216 automated tests pass
- ESM and declaration generation pass
- package-contract validation passes
- package dry-run validation passes
- npm tarball includes the focused package README and license while repository
  docs, examples, tests, and raw framework TypeScript remain outside it
- an isolated local-tarball TypeScript/Vite consumer passes
- local rendering benchmark script passes
- JavaScript performance budget check passes
- production showcase build passes
- browser E2E passes on Chromium/Chrome/Edge, WebKit, and mobile WebKit in the
  current local environment
- strict browser E2E was retried after installing Firefox and WebKit binaries:
  WebKit and mobile WebKit pass, while Firefox remains pending because its
  local headless launch timed out with a graphics/compositor error
- deployment/static SEO contract passes locally for root HTML, generated route
  folders, dynamic SEO entries, and unknown-route SPA fallback

Latest implementation update:

- Separated the publishable `velodom` package into `packages/velodom` and
  moved the documentation blog to `examples/blog`, where it consumes only
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
- Reconciled V1 release-polish documentation so README, TODO, NOTES,
  RELEASE_DECISION, Content Mode docs, and DX rubric describe the same current
  release-candidate state.
- Marked the local package identity as `1.0.0` while keeping `private: true`.
- Added `RELEASE_DECISION.md` as the publication approval note for npm
  ownership, access, 2FA, final version, and tagging decisions.
- Added provider-neutral deployment recipes in `docs/DEPLOYMENT.md`.
- Added optional `velodom/content` build-time helpers for Markdown
  collections, SEO entries, sitemap records, RSS XML, search-index records,
  and typed content metadata.
- Added optional static SEO content rendering through `seo.renderPage`.
- Updated framework contracts, SEO constants, Vite plugin options, and static
  renderer behavior in `packages/velodom/src`.
- Added focused coverage in `test/compiler/seo-renderer.test.js`.
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
- Added optional `createRtlFlipStyles()` CSS generation and recorded i18n as
  separate future plugin research.
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
- Updated `todo.md`, `NOTES.md`, `CHANGELOG.md`, and
  `VeloDom_Master_Architecture_Prompt.md` to distinguish client takeover from
  true SSR hydration.
- Browser E2E passed for Chromium/Chrome/Edge; Firefox/WebKit targets were
  skipped locally because their Playwright binaries are not installed.
- Installed the missing Firefox/WebKit Playwright browsers for strict release
  verification. WebKit and mobile WebKit passed; Firefox still requires a
  compatible release/CI environment because local headless startup timed out.
- Verified the documented static-hosting contract locally: real files and
  generated directories resolve before fallback to `/index.html`, and generated
  SEO HTML includes metadata, canonical links, visible fallback content, and
  JSON-LD for a dynamic article route.

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

The repository is now aligned as a local `1.0.0` release candidate, but npm
publication is intentionally blocked by `private: true` in the publishable
workspace package.
[RELEASE_DECISION.md](RELEASE_DECISION.md) records the current owner-approval
requirements before publishing, tagging, or removing the private package guard.

## Browser Support

The V1 candidate browser policy is documented in [BROWSERS.md](BROWSERS.md).
VeloDom targets modern evergreen browsers:

- latest two stable versions of Chrome, Edge, Firefox, and Safari
- latest two stable versions of iOS Safari and Android Chrome
- browsers with native ES modules and baseline runtime APIs such as `Proxy`,
  `AbortController`, `URL`, `URLSearchParams`, `fetch`, `history.pushState`,
  and standard DOM events

VeloDom does not target Internet Explorer, legacy EdgeHTML Edge, Opera Mini, or
browsers without native ES modules.

`npm run test:browser` runs a Playwright-powered matrix. A local Chrome, Edge,
or Playwright Chromium target is required. Firefox, WebKit, and a mobile
Safari/WebKit viewport profile are attempted automatically and reported as
skipped when their Playwright browser binaries are not installed. Set
`VELODOM_BROWSER_STRICT=1` to fail instead of skipping missing optional browser
targets, and set `VELODOM_BROWSER_TARGETS=chromium,firefox,webkit,mobile-webkit`
to choose targets explicitly. `happy-dom` remains the fast local DOM
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

- npm publication and final npm account/package reservation
- schema-based validation and custom validation rules beyond the optional
  native validation plugin
- declarative request cache
- full translation/i18n dictionaries, pluralization, message formatting, and
  locale routing
- broader keyboard/focus UX beyond the current integration coverage
- advanced shared-state patterns beyond the optional `createSharedState()`
  helper
- a full browser extension/devtools panel beyond the optional bridge and
  standalone inspector prototype
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

The prioritized roadmap and progress counter live in [todo.md](todo.md).
Important milestone history lives in [CHANGELOG.md](CHANGELOG.md). Architecture
decisions and deferred ideas live in [NOTES.md](NOTES.md). Release rules live
in [RELEASING.md](RELEASING.md).
DX acceptance rules live in [docs/DX_RUBRIC.md](docs/DX_RUBRIC.md), optional
AI and migration research lives in
[docs/FUTURE_RESEARCH.md](docs/FUTURE_RESEARCH.md), and VeloDom positioning
lives in [docs/FRAMEWORK_IDENTITY.md](docs/FRAMEWORK_IDENTITY.md).

The local V1 release candidate is functionally complete. Remaining unchecked
items combine release governance with bounded V1.x improvements: npm ownership,
final publication approval, a strict Firefox-capable browser run, optional CSS
budgets, and starter presets. Phase 19 records longer-term adapter, editor,
static-rendering, progressive-form, localization, and inspection work. None of
these items authorizes a mandatory virtual DOM, JSX, CMS, global store, or
universal SSR runtime.

When continuing development:

1. Keep generic framework logic under `packages/velodom/src`.
2. Keep the blog example under `examples/blog/src`; client projects own their
   own `src/pages`, `src/components`, and `src/api`.
3. Update README, TODO, CHANGELOG, and NOTES after significant work.
4. Add a regression test for every Core bug or behavior change.
5. Run `npm test` and `npm run build` before committing important changes.
6. Do not publish or push externally without explicit authorization.
