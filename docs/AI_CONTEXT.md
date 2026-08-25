# VeloDom AI Context

This file is the short, canonical context for an AI assistant that must design
or generate a VeloDom application. It is intentionally prescriptive: follow it
before producing code, then use [README.md](README.md) for the complete API
details and examples.

## 1. Framework identity

VeloDom is a TypeScript framework for HTML-first, compiler-first, folder-first
web applications. It keeps the authoring surface close to ordinary HTML and
uses a lightweight runtime only for behavior selected by compiled directives.

The design priorities are:

1. HTML-first: visible structure is written as HTML.
2. Compiler-first: invalid directives and unsafe expressions are diagnosed
   before browser startup where possible.
3. Folder-first: routes, components, layouts, APIs, and styles are discovered
   from predictable folders.
4. Convention over configuration: the smallest useful project needs very little
   setup.
5. Runtime-lightweight: do not add a client runtime service when build-time
   output or native browser behavior solves the problem.
6. Vanilla friendly: application code can be JavaScript or TypeScript without
   JSX, TSX, a virtual DOM, or a mandatory state library.

VeloDom is not React, Vue, Angular, Next.js, or a server-rendering platform.
Do not add their conventions merely because they are familiar.

## 2. Source of truth

When sources disagree, use this order:

1. Current source and generated public declarations in `packages/velodom`.
2. Public package exports in `packages/velodom/package.json`.
3. `docs/README.md`, which is the source-verified human guide.
4. `packages/velodom/README.md`, which is the registry-facing quick guide.
5. `examples/velodom-blog`, which demonstrates usage but does not define the API.

When working directly inside the package, also read
`packages/velodom/AGENTS.md`. It is repository-local contributor guidance for
the Core and is intentionally not part of the npm publish allowlist. The
published README contains the same application-generation contract for tools
that only have access to the installed package.

The package's beginner entry point is `create-velodom`. Its default starter is
the maintained reference for a first project: it includes a shared
`default.vd` layout/navbar, the `/about` single-file lesson, the `/guide`
component lesson, the supplied SVG favicon, and a TypeScript-compatible
`jsconfig.json`. The CLI copies the source-controlled `velodomProj` files, so
the example is the starter source rather than a second template to maintain.
That source lives at `packages/velodom/velodomProj`; do not recreate a duplicate
starter at the repository root.

Do not treat an old prompt, a copied snippet, or an example-only helper as a
framework feature until it is present in the public contract and documented.

## 3. Ownership boundaries

| Concern | Framework Core | Application |
| --- | --- | --- |
| Compiler, parser, evaluator, runtime | `packages/velodom/src` | Never copy or edit internals |
| Route discovery and Vite integration | package adapters/subpaths | `src/pages` and page config |
| Page and component markup | compiler/runtime contract | `src/pages`, `src/components` |
| Layouts and shared visual shell | generic layout support | `src/layouts` |
| API handlers and middleware policy | request engine and contracts | `src/api` |
| Auth provider and authorization policy | provider interface | application provider/config |
| Branding, Tailwind, business data | Not in Core | application files |
| SEO values and content | metadata renderer/helpers | page `config.js`/`config.ts` and data |

Only move code into Core when it is framework-agnostic, reusable across
applications, covered by tests, and intentionally added to the public API.

## 4. Smallest application shape

The preferred Vite bootstrap is:

```js
// src/main.js (src/main.ts is also supported)
import { mountVeloDom } from 'velodom/vite';
import './styles.css';

await mountVeloDom();
```

The default folder shape is:

```text
src/
  main.js
  pages/
    index.html
    script.js
    config.js
  components/
  layouts/
  api/
  assets/
```

Use JavaScript or TypeScript consistently within a file; both application
languages use the same VeloDom authoring model. Keep page policy in `config.js`
or `config.ts`, not in framework internals.

## 5. Pages, components, and `.vd` files

Folder mode is the default and is best for growing features:

```text
src/pages/about/
  index.html
  script.js
  style.css
  config.js
```

The optional single-file form co-locates the same contracts without replacing
folders:

```html
<template>
  <main>
    <h1 vd-text="title"></h1>
    <button vd-on:click="increment()">
      Count: <span vd-text="count"></span>
    </button>
  </main>
</template>

<script>
export function init({ state }) {
  state.title = 'About';
  state.count = 0;
  state.increment = () => { state.count += 1; };
}
</script>

<style>main { padding: 2rem; }</style>

<config>
export default { path: '/about', seo: { title: 'About' } };
</config>
```

Both forms compile to the same internal shape: HTML, script, styles, config,
and source metadata. Components are referenced by their discovered name, for
example `<vd-component name="posts/post-card"></vd-component>`.

## 6. Template syntax

Prefer the `vd-*` spelling. Compatibility `data-vd-*` attributes may exist for
migration, but new examples should use the preferred form.

```html
<h1 vd-text="title"></h1>
<p>{{ summary }}</p>
<p>{{ user?.name || 'Guest' }}</p>
<button vd-on:click="save()" vd-loading="saving">Save</button>
<input vd-model="query">
<article vd-for="post in posts" vd-key="post.id">
  <h2 vd-text="post.title"></h2>
</article>
<p vd-if="Boolean(error)">{{ error }}</p>
```

Use escaped interpolation when literal documentation text contains braces:
`\{{ name }}`. Use `vd-pre` for a literal code window so directives and
expressions inside the example are not compiled:

```html
<pre vd-pre><code>&lt;button vd-on:click="increment()"&gt;Count&lt;/button&gt;</code></pre>
```

Keep expressions small and visible. Put multi-step or asynchronous behavior in
`init()`, named functions, or a request module rather than hiding it in HTML.

## 7. State and lifecycle

Pages and components can export shallow initial state and may use `init()` for
behavior. The hook object exposes `state`, `refs`, and `ctx`; `ctx` owns
`signal`, `onCleanup`, and route-aware values. Abort requests and subscriptions
through that lifecycle scope. Prefer local state; use `createSharedState()`
only when a cross-page store is genuinely needed.

```js
export const state = { count: 0 };

export function init({ state, ctx }) {
  state.increment = () => { state.count += 1; };
  const timer = setInterval(() => state.count += 1, 1000);
  ctx.onCleanup(() => clearInterval(timer));
}
```

## 8. Routing, requests, and APIs

Routes come from `src/pages`; dynamic folders and route config provide params,
guards, metadata, prefetch, and hash scrolling. Use app-relative links such as
`/features#components`, not bare `#components`, when invoking `vd-nav`.
Same-page hash navigation does not remount the page; after history, scroll, and
focus updates, the router emits `hashchange` with `oldURL` and `newURL` for
route-aware application UI.

Requests are declarative in HTML and application-owned handlers live in
`src/api`. A nested default export such as `src/api/posts/get.js` can be used as
`posts.get`; an explicit `src/api/routes.js` registry is the advanced escape
hatch for custom auth, roles, and middleware.

```html
<button
  type="button"
  vd-request="posts.get"
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

Use built-in request behavior first: loading/error/result state, cancellation,
debounce/throttle, retry, cache, and auth integration. Custom middleware and
explicit `next()` pipelines are advanced options, not the beginner path.

## 9. Optional capabilities

Use these only when the application needs them:

- `velodom/content` for build-time Markdown/frontmatter collections, RSS,
  sitemap, SEO records, and search indexes.
- `velodom/localization` for typed message keys, native `Intl`, locale paths,
  canonical links, and `hreflang` records.
- RTL direction helpers and logical CSS diagnostics.
- `velodom/assets` for build-time asset inspection and responsive image hints.
- `velodom/node` for an application-owned Fetch-style Node boundary; it is not
  automatic SSR, sessions, hydration, or streaming.
- Auth providers, request cache, validation, testing utilities, compiler
  diagnostics, and CLI project-intelligence commands.

Do not make optional providers, AI services, CMSs, or a server mandatory for a
normal VeloDom application.

## 10. SEO, accessibility, and resilience checklist

Every generated page should have a meaningful title/description, canonical
policy where needed, semantic headings, keyboard-accessible controls, visible
loading/error/empty states, labels for form controls, useful `alt` text, and
focus behavior for navigation. Use `config.js`/`config.ts` for route SEO and
the build-time renderer for static metadata. Use logical CSS properties when
supporting RTL. Never put secrets or authorization decisions in client code.

## 11. What VeloDom V1 does not promise

Do not claim request-time SSR, hydration, streaming, Edge execution, automatic
CMS integration, or a required AI layer. Hybrid rendering, islands, richer
DevTools, migration assistants, and ICU negotiation are roadmap/research items
unless an explicit package export and test proves otherwise.

## 12. AI website-generation workflow

When asked to build a site with VeloDom:

1. Extract pages, entities, user actions, API boundaries, SEO needs, locales,
   and responsive states from the requirements.
2. Choose folder mode by default; choose `.vd` only for a small co-located
   page/component and preserve the same contracts.
3. Create the route tree under `src/pages`, shared UI under `src/components`,
   shells under `src/layouts`, and application policy under `src/api`.
4. Ask or infer JavaScript versus TypeScript for application files; never force
   a language migration for framework reasons.
5. Write semantic HTML first, then add only the directives needed for behavior.
6. Keep data fetching, auth, validation, and middleware in application modules;
   use the public VeloDom request contract.
7. Add page config for SEO, loading/error/empty states, accessibility, and
   responsive/RTL behavior before polishing visuals.
8. Verify with the project's CLI, type/lint/tests, build, and browser checks.
9. Update the application README and the framework roadmap only when the
   public framework contract actually changes.

## 13. Verification commands

From the repository root, the maintained checks include:

```bash
npm test
npm run check
npm run build
npm run pack:check
```

For a consumer application, use the local CLI when available:

```bash
vd init my-site
vd doctor --root .
vd health --root .
vd inspect --root .
```

For a new package-backed project, the shortest supported command is
`npx velodom@latest my-site`; it is an initializer alias for the same starter
generated by `create-velodom`.

Treat compiler diagnostics, broken refs/routes, invalid directives, missing
public exports, accessibility/SEO warnings, and failing build output as defects
to fix rather than suppress.
