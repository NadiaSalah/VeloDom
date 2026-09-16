# VeloDom AI Context

This file is the compact, package-local contract for coding assistants working
on a VeloDom application. Confirm details in `docs/SYNTAX_REFERENCE.md` and
implementation status in `docs/FEATURE_INVENTORY.md` before generating syntax.

## Identity

VeloDom is:

- HTML-first and compiler-first
- folder-first with optional `.vd` single-file modules
- convention-over-configuration
- runtime-lightweight and Vanilla friendly
- compatible with application-authored JavaScript or TypeScript

VeloDom is not React, Vue, Svelte, Alpine, or Angular. Do not introduce JSX,
TSX, hooks, a virtual DOM, Vue directives, Svelte declarations, or an Angular
module model unless application code independently chooses another library.

## Create and Run

After the first official release makes both packages available:

```bash
npm create velodom@latest
cd my-app
npm run dev
```

Do not infer registry availability from this repository. In a source checkout,
build the package and run
`node packages/velodom/bin/create-velodom.js my-app --no-install`. Project
creation offers Minimal, Blog, and Empty with optional JS/TS, Tailwind, quality
tools, routing examples, localization, an optional PWA build, tests, local Lab, Git, install, and
server start.

The generated project is user-owned. Never edit `node_modules/velodom`.
For an existing application, `vd add i18n|tests|lab|pwa` installs only those
first-party optional features and records generated ownership in
`.velodom/features.json`. Never invent other feature names or bypass a reported
file/script conflict.
Use `vd features` before `vd remove` or `vd upgrade`. Lifecycle commands trust
only the ownership manifest, refuse user-modified or legacy non-reversible
mutations, and never install dependencies. `vd preset export/apply` transfers
only validated first-party feature names/options, never application source.
Run configured tests with `vd test` or a focused layer such as `vd test unit`
or `vd test --browser`. The command delegates to real package scripts and fails
if that layer is not configured; never describe an absent layer as tested.

## Application Ownership

```text
src/pages/       pages and route config
src/components/  reusable application UI
src/layouts/     shared shells containing one <vd-page>
src/api/         request routes and custom middleware
src/assets/      application assets
src/main.js      bootstrap
```

Reusable framework behavior belongs in the package; business logic stays in
the application. Import public package paths only.

## Public Imports

- `velodom`
- `velodom/vite`
- `velodom/vite-plugin`
- `velodom/compiler`
- `velodom/content`
- `velodom/localization`
- `velodom/node`
- `velodom/assets`
- `velodom/pwa`
- `velodom/devtools`
- `velodom/testing`
- `velodom/cli` (Node tooling only)
- `velodom/scaffolder` (Node tooling only)
- `velodom/package.json` (package metadata only)

Never import `velodom/lib/*`, `packages/velodom/src/*`, or other internals.

`velodom/pwa` is build-only and opt-in. A manifest alone never registers a
service worker. Generate one only through an explicit `serviceWorker` option,
use bounded declarative cache routes, and keep authenticated/API responses out
of caches unless the application deliberately owns that policy. `--pwa` and
`vd add pwa` create reviewable application files rather than hidden runtime
behavior.

## Pages

Folder page:

```text
src/pages/about/
  index.html
  script.js        optional
  style.css        optional and scoped
  data.js          optional page loader
  config.js        optional path, layout, guards, SEO
```

Small optional one-file page:

```html
<template><main><h1>{{ title }}</h1></main></template>
<script>export const state = { title: "About" };</script>
<style>main { padding: 2rem; }</style>
<config>export default { path: "/about" };</config>
```

Folder mode wins if both forms define the same resource.
Vite reads only a page's `<config>` block eagerly for route discovery; the
remaining `.vd` runtime stays lazy until navigation.
Vite's incremental compiler cache is automatic build tooling. Do not model it
as application state, add a browser cache for it, or generate user config for
it.

## State and Lifecycle

Use shallow initial state for simple values:

```js
export const state = { count: 0, query: "" };
```

Use lifecycle code for methods, async work, and cleanup:

```js
export function init({ state, ctx, data, params, query, props }) {
  state.increment = () => { state.count += 1; };
  ctx.onCleanup(() => { /* release application resources */ });
}
```

Supported page/component lifecycle exports are `init`, `mounted`, and
`destroy`. Register ordinary cleanup with `ctx.onCleanup()`.

## Canonical Template Syntax

```html
<h1>{{ title }}</h1>
<p vd-text="summary"></p>
<button vd-on:click="save()">Save</button>
<input vd-model="query">
<p vd-if="loading">Loading…</p>
<p vd-elseif="error">Failed.</p>
<p vd-else>Ready.</p>
<li vd-for="item in items" vd-key="item.id">{{ item.title }}</li>
<a vd-bind:href="url" vd-nav>Open</a>
<section vd-class="{ active: selected }"></section>
```

Use `\{{ title }}` for one literal interpolation or put `vd-pre` on a
container of literal examples. Expressions are intentionally smaller than
JavaScript; move statements, declarations, arrow functions, and complex logic
into a script module.

## Components and Layouts

```html
<vd-component
  name="cards/post-card"
  vd-prop-title="Hello"
></vd-component>

<vd-component
  vd-for="post in posts"
  vd-key="post.id"
  name="cards/post-card"
  vd-props="{ post }"
></vd-component>
```

Component names follow their path below `src/components`. Use `vd-props` for a
dynamic object; loop variables are available when the component owns
`vd-for`. `vd-prop-*` values are always static strings. Layouts live
below `src/layouts`, contain exactly one
`<vd-page></vd-page>`, and are selected with `layout` in page config.

Treat `vd-key` as stable item identity: use a unique non-empty string or finite
number. Reordering the same item objects preserves their DOM/component state.
Unkeyed, invalid, duplicate, or same-key/new-object items rebuild
conservatively; do not rely on positional instance reuse.

## Routing

```html
<a href="/posts/42?preview=true" vd-nav>Open</a>
<a href="/features#requests" vd-nav>Requests</a>
```

Use app-relative paths. Dynamic folders use `[id]`. Route context exposes
`ctx.params`, `ctx.query`, `ctx.meta`, and `ctx.route`. Same-route hash changes
scroll without remounting. Guards return `true`/`undefined`, `false`, or an
absolute app path redirect.

## Requests and Auth

Application request routes live in `src/api`. Trigger them declaratively:

```html
<button
  vd-request="posts.list"
  vd-params="{ page: page }"
  vd-target="posts"
  vd-auto-state
>Load</button>
```

Use package request/auth APIs from `velodom` and keep tokens, server policy,
credentials, and business authorization application-owned. Client guards and
visibility are never server authorization.

## Styling, SEO, and Optional Capabilities

- Folder `style.css` and `.vd` `<style>` blocks are scoped to their resource.
- Global application CSS is imported by `src/main.js`.
- Page SEO belongs in `config.js`/`config.ts` or the `.vd` `<config>` block.
- Static SEO, content, localization, RTL, validation, progressive forms,
  plugins, devtools, and Node integration are optional public capabilities.
- Localization stays application-owned: nested typed dictionaries may use
  `definePluralMessage`, `{name}` primitive interpolation, native plural rules,
  and explicit/inferred direction. Use `vd i18n extract|check` for static key
  evidence; there is no localization directive or required global store.
- `vd lab` is an optional local Vite inspector. It is read-only,
  development-only, and never required to run or build an application.
- Error boundaries receive `diagnostic` with stable `code`, `group`,
  `sourceStack`, and `ownership`. Keep fallback/retry UI application-owned.
  `mountVeloDomErrorOverlay` from `velodom/devtools` is an explicit
  development-only observer, not a production default or recovery mechanism.
- Use `vd inspect css` and `vd inspect assets` for static build evidence about
  route style ownership, repeated rules, logical properties, local asset
  usage, dimensions, variants, and possible LCP candidates. Treat unused and
  LCP advice as conservative because dynamic source paths and visual layout are
  outside static proof. These commands do not transform or delete files.
- `velodom/testing` provides test-only compiler fixtures, route resolution,
  request doubles, DOM event dispatch, accessibility smoke diagnostics, and
  page/component mounts. It is not an application runtime service.
- Use only capabilities marked implemented in `docs/FEATURE_INVENTORY.md`.

## Mandatory AI Rules

1. Read `docs/SYNTAX_REFERENCE.md` before writing VeloDom-specific syntax.
2. Check `docs/FEATURE_INVENTORY.md` before claiming a feature exists.
3. Prefer canonical `vd-*` syntax; `data-vd-*` is compatibility syntax.
4. Use public exports only.
5. Do not invent directives, hooks, filenames, runtime services, or CLI flags.
6. Do not implement TODO/planned work as if it were already supported.
7. Keep loading, error, empty, accessibility, and SEO states where relevant.
8. Preserve folder mode; use `.vd` only when co-location improves readability.

Deeper agent workflow: `docs/AI_GUIDE.md`. Human start: `docs/QUICK_START.md`.
