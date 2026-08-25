# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework for lightweight,
folder-first web applications. You write ordinary HTML, optional JavaScript or
TypeScript modules, and small `vd-*` directives; VeloDom discovers the project,
validates it at build time, and mounts only the runtime features the templates
use.

VeloDom is designed for beginners who want a short path from an HTML file to a
working site, while keeping explicit escape hatches for advanced applications.
It does not require JSX, TSX, a virtual DOM, a global store, or a translation
provider.

## AI-assisted project generation

This README is also the package-level contract for AI coding assistants. When
generating a VeloDom application, keep framework code and application code
separate: import only public `velodom/*` entry points, write visible HTML under
`src/pages` and `src/components`, keep layouts under `src/layouts`, and place
API handlers or middleware under `src/api`. Do not copy `packages/velodom/src`
into an application and do not invent undocumented `vd-*` directives.

Use JavaScript or TypeScript consistently within each file; both languages use
the same HTML-first authoring model. Prefer the smallest conventional shape:

```text
src/pages/about/
  index.html
  script.js       # or script.ts
  style.css
  config.js       # or config.ts
```

Choose a `.vd` page when template, behavior, style, and route policy are
small enough to stay together. Add `config.js`/`config.ts` for route, layout,
SEO, and guard policy, and keep loading, error, empty, accessibility, and SEO
states explicit. The AI should run the project's `vd doctor`, build, and test
checks after generating code instead of hiding diagnostics or adding a second
framework runtime.

## Principles

- **HTML First** — templates remain readable HTML and progressively enhanced
  forms remain valid without JavaScript.
- **Compiler First** — discovery, directive validation, accessibility warnings,
  security signals, and runtime feature selection happen before the browser
  needs to work.
- **Folder First** — pages, components, layouts, APIs, middleware, and config
  follow visible paths instead of hidden registration.
- **Convention over Configuration** — the common Vite app starts with one
  `mountVeloDom()` call; advanced factories remain available.
- **Runtime Lightweight** — no virtual DOM or mandatory provider is installed;
  unused directive features are not loaded for a page.
- **Vanilla Friendly** — application code can stay JavaScript. TypeScript is an
  optional authoring choice, while framework source and declarations are typed.

## Requirements and Installation

- Node.js `20.19+` or `22.12+`.
- Vite `6`, `7`, or `8` for the standard integration.
- TypeScript is optional for application code.

VeloDom `1.0.0` is published on npm. The workspace now also includes a shorter
`velodom` binary for the next patch publication. Once that patch is published,
a new app can start with:

```bash
npx velodom@latest my-site
cd my-site
npm install
npm run dev
```

The explicit binary name remains available when a script or CI job prefers it:

```bash
npx --yes --package velodom create-velodom my-site
cd my-site
npm install
npm run dev
```

Until the patch is published, use the explicit `create-velodom` command above
with the current registry release.

This is the default starter preset shipped by the package. It creates a Vite project with
the VeloDom plugin, `mountVeloDom()` bootstrap, an HTML-first home page, the
supplied SVG logo and favicon, a shared layout/navbar, a dependency-free
light/dark theme toggle, and JavaScript configuration. It also includes two
small runnable lessons: `/about` is a complete single-file `.vd` page and
`/guide` demonstrates `vd-component`, props, and a component `script.js`.
The generated `jsconfig.json` includes `ignoreDeprecations: "6.0"` for the
TypeScript 6 Bundler configuration. Use `vd create` after installation for
additional pages, components, API routes, middleware, plugins, and demos.

To integrate an existing Vite project:

```bash
npm install velodom
npm install --save-dev vite
```

```js
// vite.config.js
import { defineConfig } from "vite";
import { velodom } from "velodom/vite-plugin";

export default defineConfig({
  plugins: [velodom()]
});
```

```js
// src/main.js
import { mountVeloDom } from "velodom/vite";

await mountVeloDom();
```

The bootstrap discovers `src/pages`, `src/components`, `src/layouts`, and the
optional `src/api/routes.js|ts` and `src/api/middleware.js|ts` registries.

## Project Layout

```text
src/
  main.js
  pages/
    index.html
    home/
      index.html
      script.js       # or script.ts
      data.js         # optional route data
      config.js       # or config.ts
      style.css
    about.vd          # optional one-file page
  components/
    post-card/
      index.html
      script.js
      style.css
    badge.vd           # optional one-file component
  layouts/
    default.vd             # shared navbar, page slot, and footer
  api/
    posts.js           # importable helper module
    posts/get.js       # optional file route: posts.get
    middleware/auth.js # optional named middleware
    routes.js          # advanced route registry
    middleware.js      # advanced middleware registry
  assets/
public/
  velodom-favicon.svg       # supplied VeloDom SVG favicon
```

The generated starter also contains `src/components/site-nav/` and
`src/components/feature-card/`, plus `src/pages/about.vd` and
`src/pages/guide/`. Read those files in the generated project to learn the
framework conventions without opening framework internals.

Folder mode and `.vd` mode compile to the same internal resource shape. Do not
create both JavaScript and TypeScript variants for one convention slot; VeloDom
reports that ambiguity instead of silently choosing one.

## Folder Pages

The smallest page is ordinary HTML:

```html
<!-- src/pages/about/index.html -->
<main>
  <h1>{{ title }}</h1>
  <button type="button" vd-on:click="count++">
    Count: <span vd-text="count"></span>
  </button>
</main>
```

```js
// src/pages/about/script.js
export const state = {
  title: "About VeloDom",
  count: 0
};
```

```js
// src/pages/about/config.js
export default {
  path: "/about",
  seo: {
    title: "About VeloDom",
    description: "A small HTML-first page."
  }
};
```

`state` is a shallow seed merged before the optional `init()` hook. Use `init`
for async work, lifecycle subscriptions, event handlers, and cleanup:

```js
export async function init({ state, ctx, params, query }) {
  state.message = `Route ${params.id || "home"}`;

  const onResize = () => {
    state.width = window.innerWidth;
  };

  window.addEventListener("resize", onResize);
  ctx.onCleanup(() => window.removeEventListener("resize", onResize));
}
```

The page context also exposes `data`, `route`, `meta`, `props`, `navigate`,
`emit`, `on`, and `once` where the current page/component contract supports
them. Keep application business logic in the application folder, not in the
installed package.

## Optional `.vd` Files

One-file pages, components, and layouts use explicit blocks:

```html
<template>
  <main>
    <h1>{{ title }}</h1>
    <button type="button" vd-on:click="increment()">
      Count: <span vd-text="count"></span>
    </button>
  </main>
</template>

<script>
export function init({ state }) {
  state.title = "About";
  state.count = 0;
  state.increment = () => { state.count += 1; };
}
</script>

<style>
main { padding: 2rem; }
</style>

<config>
export default {
  path: "/about",
  seo: {
    title: "About VeloDom",
    description: "A one-file VeloDom page."
  }
};
</config>
```

The template block is required. Script, style, and config are optional. Use
folder mode when a module needs several files or is shared by a growing team.

## Template Syntax

| Purpose | Syntax | Guidance |
| --- | --- | --- |
| Text | `{{ title }}` or `vd-text="title"` | Values are escaped as text. |
| Literal braces | `\\{{ title }}` or `vd-pre` | Use in docs and code samples. |
| Conditional DOM | `vd-if`, `vd-elseif`, `vd-else` | Branches are source-checked. |
| Visibility | `vd-show="isOpen"` | Keeps the element mounted. |
| Loops | `vd-for="post in posts"` | Use `vd-key="post.id"` for identity. |
| Form model | `vd-model="draft.title"` | Keeps native inputs and labels. |
| Attributes | `vd-bind:href="post.url"` | Also supports class/style/value and more. |
| Events | `vd-on:click="save()"` | Modifiers and keyboard events are supported. |
| Components | `<vd-component name="blog/post-card">` | Name follows the folder path. |
| Slots | `<vd-slot name="footer"></vd-slot>` | Components can expose named/default slots. |
| Navigation | `<a href="/docs#api" vd-nav>Docs</a>` | Same-path hashes scroll without reload. |
| Requests | `vd-request="posts.get"` | Add params, target, and automatic status. |
| Refs | `vd-ref="dialog"` | Available from page/component context. |

Preferred directive names are `vd-*`. Legacy `data-vd-*` input remains accepted
for compatibility and is normalized by the compiler. Expressions are parsed by
VeloDom's safe evaluator; they do not use `eval` or `new Function`.

## Components, Layouts, and Slots

Component folders and files are addressed by their path:

```html
<vd-component name="blog/post-card"
  vd-props="{ post: selectedPost }">
  <span slot="footer">Read more</span>
</vd-component>
```

The component may read `props`, inherit page state, define local `state`, use
`init`/`mounted`/`destroy`, register cleanup, expose methods, and render
`<vd-slot>` placeholders. A host such as
`src/components/blog/post-card.vd` is named `blog/post-card`.

Layouts live under `src/layouts`. The layout must contain exactly one
`<vd-page></vd-page>` placeholder:

```html
<header>Shared navigation</header>
<main><vd-page></vd-page></main>
<footer>Shared footer</footer>
```

Select a layout in page config with `layout: "default"`; use `layout: false` to
disable the default. Layouts are composition, not a second rendering model.

## Routing

Folder names become routes. A folder named `blog/[slug]` receives a dynamic
parameter, while `config.js` can override the path. The route context contains
`path`, `pattern`, `params`, `query`, `hash`, `meta`, and the matched page name.

```js
// src/pages/blog/[slug]/config.js
export default {
  path: "/blog/:slug",
  beforeEnter({ to }) {
    return to.params.slug ? true : "/404";
  }
};
```

```html
<a href="/blog/hello#comments" vd-nav>Open article</a>
```

`vd-nav` uses browser history and preserves same-page navigation. A hash-only
change on the active path updates history, scrolls to the target, and moves
focus without remounting the page. It then emits the browser `hashchange`
notification with `oldURL` and `newURL`, so tabs and local navigation indexes
can synchronize without attaching duplicate click handlers. The router also
supports opt-in prefetch, focus targets, and scroll restoration.

## Requests and APIs

The beginner path is a nested default-exported file route:

```js
// src/api/posts/get.js -> posts.get
import { requestJson } from "velodom";

export default ({ id }, { signal } = {}) => (
  requestJson(`/api/posts/${id}`, { signal })
);
```

```html
<button
  type="button"
  vd-request="posts.get"
  vd-params="{ id: selectedId }"
  vd-target="postResult"
  vd-auto-state
>
  Load post
</button>

<p vd-show="postLoading">Loading…</p>
<p vd-if="postError !== ''" vd-text="postError"></p>
<article vd-if="Boolean(postResult)" vd-text="postResult?.title || ''"></article>
```

With target `postResult`, `vd-auto-state` derives `postLoading` and `postError`.
Requests support params, JSON responses, cancellation, debounce, leading
throttle, retry, lifecycle hooks, success/error events, auth, redirects, and
optional cache policies. The `requestJson` helper returns `null` for `204` and
throws `ApiError` with status, URL, and response body for HTTP failures.

Use `src/api/routes.js` when a route needs an explicit handler, middleware,
authentication, roles, or redirect policy:

```js
import * as posts from "./posts.js";

export default {
  "posts.create": {
    handler: posts.create,
    auth: true,
    roles: ["editor"],
    middleware: ["auth"]
  }
};
```

The explicit registry takes precedence over file discovery. Root API modules
remain ordinary imports and are never silently registered as routes.

## Middleware and Authentication

Common middleware is a named application file:

```js
// src/api/middleware/auth.js -> auth
export default (params, { session }) => {
  if (!session?.user) throw new Error("Sign in is required");
  return params;
};
```

Use `src/api/middleware.js` for an explicit advanced registry or a custom
`next()` pipeline. The Core middleware engine owns ordering, error reporting,
and cancellation; user code owns policy and business behavior.

Authentication is provider-based. VeloDom includes a server-session provider
contract and a demonstration localStorage provider. Frontend checks improve
navigation UX but never replace backend authorization.

## Forms and Validation

Requests can enhance ordinary forms:

```html
<form vd-validate vd-request="posts.create"
  vd-request-config="{ target: 'created', autoState: true }">
  <label>Title <input name="title" vd-model="draft.title" required></label>
  <button type="submit" vd-bind:disabled="createdLoading">Create</button>
</form>
```

`createValidationPlugin()` bridges native constraints such as `required`,
`minlength`, `max`, and `pattern`. `createProgressiveFormsPlugin()` is a
separate opt-in bridge for forms that must still submit with JavaScript disabled;
the server retains CSRF, session, validation, and redirect ownership.

## SEO, Static Output, and Localization

Page `config.js` can provide title, description, canonical, language, keywords,
Open Graph, Twitter, JSON-LD, a visible summary, and dynamic entries. Production
builds emit route HTML with a concise server-delivered summary for crawlers and
visitors without claiming universal SSR or hydration.

```js
export default {
  seo: {
    title: "Articles | VeloDom",
    description: "HTML-first articles.",
    canonical: "/articles",
    alternates: {
      en: "/articles",
      ar: "/ar/articles"
    },
    lang: "en",
    keywords: ["VeloDom", "HTML-first"]
  }
};
```

The optional `velodom/localization` subpath validates typed dictionaries,
infers translation keys, generates application-owned declarations, formats
through native `Intl`, preserves query/hash values in locale links, and creates
localized canonical plus `hreflang` records. It has no browser translation
runtime. ICU message parsing, locale negotiation, cookies, domains, and CMS
loading remain application/server adapter decisions.

## Content and Assets

`velodom/content` is a Node/build-time helper for local Markdown collections or
typed external loaders. It produces normalized entries, safe HTML/plain text,
SEO records, sitemap routes, RSS XML, and search indexes. It does not ship a
CMS client or Markdown runtime to the browser.

`velodom/assets` inspects local image dimensions and bytes and creates standard
`srcset`, `sizes`, `width`, `height`, `loading`, and `decoding` attributes from
application-generated variants. It never bundles an image transformer or CDN.

## CLI and Project Intelligence

```text
vd inspect       inspect pages, components, layouts, APIs, state, refs, events
vd doctor        report broken refs, missing files, unsafe or invalid config
vd stats         project counts and size statistics
vd routes        resolved route table
vd graph         JSON or Mermaid relationship graph
vd health        performance, SEO, accessibility, security, and maintainability
vd build-report  build composition and optimization signals
vd docs          generated route/component/API documentation
vd types         application-owned route and component declarations
vd benchmark     local rendering benchmark
vd init <name>   create the complete beginner starter project
vd create ...    convention-first page/component/API/middleware/plugin scaffolds
```

For the shortest new-project flow, use `npx velodom@latest <name>`. It is a
thin package binary that delegates to `vd init`; no framework runtime is added
to the browser. `create-velodom <name>` remains the explicit, script-friendly
equivalent.

Focused page demos are `static`, `counter`, `request`, `form`, and `seo`.
`vd create feature name --blog` creates a small vertical slice without moving
application files into Core.

## Compiler and Public Entry Points

The compiler can be used independently:

```js
import { compileTemplate } from "velodom/compiler";

const result = compileTemplate(
  '<button vd-on:click="save()">Save</button>',
  { filename: "button.html", mode: "development" }
);

console.log(result.html, result.diagnostics, result.manifest.features);
```

It returns normalized HTML, a small AST, directive metadata, source-aware
diagnostics, and a runtime feature manifest. Optimizers are synchronous,
explicit, and run in registration order. The compiler reports accessibility
and high-confidence security problems as diagnostics; it does not replace
server security review.

| Import | Use |
| --- | --- |
| `velodom` | runtime, requests, auth, plugins, SEO contracts, shared state |
| `velodom/vite` | `mountVeloDom`, explicit Vite app and adapter |
| `velodom/vite-plugin` | Vite compiler, manifests, static SEO generation |
| `velodom/compiler` | standalone compiler, optimizers, language helpers |
| `velodom/localization` | build-time dictionaries, keys, Intl, locale SEO |
| `velodom/content` | Markdown and external content build helpers |
| `velodom/assets` | Node image inspection and responsive attributes |
| `velodom/node` | explicit Node HTTP-to-Fetch adapter |
| `velodom/devtools` | opt-in development inspector |
| `velodom/testing` | DOM test mounting helpers |

Only documented subpaths are public. `velodom/lib/*` and internal source files
are not application imports.

## JavaScript, TypeScript, and Testing

JavaScript and TypeScript use identical folders, directives, and runtime APIs.
Use `definePageConfig`, `defineRequestRoute`, `definePlugin`, and
`defineResourceAdapter` when a TypeScript or JSDoc editor should infer a
contract without changing the runtime object. `vd types` generates optional
application declarations for routes, configs, APIs, and component conventions.

`velodom/testing` exposes `mountTestPage` and `mountTestComponent` for browser-
like DOM environments. The utilities mount real compiled directives and return
state plus async cleanup; they do not create a router or hide application setup.

## Application Boundary and License

Installed framework code belongs in `node_modules/velodom`. Application pages,
components, layouts, APIs, middleware, assets, content, and business policy
remain in the consuming project. The package is MIT-licensed and published at
[npmjs.com/package/velodom](https://www.npmjs.com/package/velodom).

Full examples, architecture decisions, deployment guidance, and the living
roadmap are in the repository
[documentation](https://github.com/NadiaSalah/VeloDom/tree/main/docs).
