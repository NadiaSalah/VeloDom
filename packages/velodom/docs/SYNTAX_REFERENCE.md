# VeloDom Syntax Reference

This is the canonical package-local syntax reference for VeloDom 1.0.0. It
documents implemented public authoring syntax, not roadmap ideas. New code
should use preferred `vd-*` attributes; `data-vd-*` remains a compatibility
input compiled/runtime output.

## Resource Conventions

### Pages

```text
src/pages/home/index.html                         -> /
src/pages/about/index.html                        -> /about
src/pages/blog/posts/[id]/index.html              -> /blog/posts/:id
src/pages/help.vd                                 -> /help
```

A folder page may contain `index.html`, `script.js|ts`, `style.css`,
`data.js|ts`, and `config.js|ts`. Folder mode is preferred and wins over a
same-named `.vd` page.

### Components

```text
src/components/post-card/index.html
src/components/post-card/script.js
src/components/post-card/style.css
src/components/account/avatar.vd
```

Use the path below `src/components` as the component name.

### Layouts

Layouts use folder mode or `.vd`, and contain exactly one page slot:

```html
<template>
  <vd-component name="site-nav"></vd-component>
  <main><vd-page></vd-page></main>
</template>
```

`default` is selected automatically. Page config can select another layout or
set `layout: false`.

### Optional `.vd` Blocks

```html
<template>required HTML</template>
<script>optional JavaScript exports</script>
<style>optional scoped CSS</style>
<config>optional page JavaScript config</config>
```

Use folder mode when TypeScript, multiple data files, or growing behavior reads
more clearly.

A page `<config>` block is extracted as small eager route metadata during the
Vite build. Its template, script, style, and manifest stay together in one
lazy chunk until that route is opened. This is an implementation optimization;
the `.vd` syntax and page lifecycle are identical to folder mode.

## State and Lifecycle

```js
export const state = {
  title: "Hello",
  count: 0
};

export function init({ state, ctx, data, params, query, props }) {
  state.increment = () => { state.count += 1; };
  ctx.onCleanup(() => { /* cleanup */ });
}

export function mounted({ state, ctx, refs }) {}
export function destroy({ state, ctx }) {}
```

Prefer `state` for shallow defaults. Use `init` for functions, async work, and
subscriptions. Components additionally receive `props`; pages receive route
data. Do not destructure a standalone `onCleanup`; use `ctx.onCleanup()`.

## Expressions

Template expressions support state/props/route values, literals, safe member
access (including optional chaining), arrays, objects, approved operators,
ternaries, and calls to functions exposed in the current context.

```html
<p>{{ user?.name || "Guest" }}</p>
<button vd-on:click="select(item.id)">Select</button>
```

Statements, declarations, arrow functions, `new`, arbitrary browser globals,
`eval`, and `new Function` do not belong in expressions. Put complex behavior
in `script.js` or `script.ts`.

## Text and Literal Content

Recommended equivalents:

```html
<h1>{{ title }}</h1>
<h1 vd-text="title"></h1>
```

Both produce safe text content. VeloDom does not treat the value as HTML.

```html
<p>Write \{{ title }} to keep one expression literal.</p>
<pre vd-pre><code>{{ title }} stays literal here.</code></pre>
```

## Conditions and Visibility

```html
<p vd-if="status === 'loading'">Loading…</p>
<p vd-elseif="status === 'error'">Failed.</p>
<p vd-else>Ready.</p>

<aside vd-show="panelOpen">Settings</aside>
```

`vd-if` branches must be adjacent. `vd-show` preserves the mounted node and
changes visibility/pointer behavior; it is not a DOM-removal condition.

## Lists

```html
<article vd-for="post in posts" vd-key="post.id">
  <h2>{{ post.title }}</h2>
</article>

<li vd-for="(item, index) in items">
  {{ index + 1 }}. {{ item }}
</li>
```

`$index` is available when only an item name is declared. Use `vd-key` when
items have a stable, unique, non-empty string or finite-number identity. A
reorder using the same item objects moves existing DOM ranges, preserving
focus, form values, event listeners, and component-local state. Unkeyed,
missing, invalid, or duplicate keys use conservative list rebuilding.

Components may own the loop directive. `vd-props` and `vd-key` are evaluated
against the current loop scope before each component mounts:

```html
<vd-component
  vd-for="post in posts"
  vd-key="post.id"
  name="blog/post-card"
  vd-props="{ post }"
  vd-ref="postCards"
></vd-component>
```

When the iterable structure changes, removed component instances run their
normal cleanup before replacements mount. Reused keyed instances keep their
state; using the same key for a new item object remounts that item so initial
props cannot become stale. A keyed component ref is available through
`state.components.postCards.byKey`.

## Forms and Two-Way Binding

```html
<input type="text" name="title" vd-model="draft.title">
<input type="checkbox" name="accepted" vd-model="accepted">
```

Text-like controls write strings; checkboxes write booleans.

## Attribute Bindings

```html
<img vd-bind:src="avatarUrl" vd-bind:alt="avatarAlt">
<a vd-bind:href="postUrl">Open</a>
<input vd-bind:value="query" vd-bind:disabled="loading">
```

Supported `vd-bind:*` targets are `src`, `href`, `alt`, `value`, `disabled`,
`checked`, `class`, `style`, and `attr`. Shorthands `vd-src`, `vd-href`,
`vd-alt`, `vd-value`, `vd-disabled`, and `vd-checked` are supported.

For class, style, and arbitrary attribute maps:

```html
<section
  vd-class="{ active: selected, muted: disabled }"
  vd-style="{ color: accent, fontSize: size }"
  vd-attr="{ title: tooltip, 'aria-busy': loading }"
></section>
```

`false`, `null`, and `undefined` remove a generic attribute. `true` creates an
empty boolean attribute.

## Events

```html
<button vd-on:click="save()">Save</button>
<button vd-on:click.prevent.stop.once="save()">Save once</button>
<input vd-on:keydown.enter="submitSearch()">
<button vd-on:click="select($event)">Select</button>
```

Lifecycle modifiers: `.prevent`, `.stop`, `.once`.

Key modifiers: `.enter`, `.tab`, `.delete`, `.esc`, `.space`, `.up`, `.down`,
`.left`, `.right`.

`$event` is the current DOM event. Listeners are disposed with their resource.

## Refs, Component Children, and Expose

```html
<input vd-ref="searchInput">
```

Read named refs from lifecycle context. Components may expose a deliberate
public object from `init`; parents may obtain component handles with supported
`vd-child` / `vd-get-child` composition and ref APIs.

Named component child slots:

```html
<!-- component template -->
<header vd-get-child="header"></header>
<div vd-get-child="default"></div>

<!-- caller -->
<vd-component name="panel">
  <vd-child name="header"><h2>Title</h2></vd-child>
  <vd-child name="default"><p>Body</p></vd-child>
</vd-component>
```

## Components and Props

```html
<vd-component
  name="blog/post-card"
  vd-prop-title="Static title"
></vd-component>

<vd-component
  name="blog/post-card"
  vd-props="{ post: selectedPost, compact: true }"
></vd-component>
```

`vd-prop-*` passes static strings. `vd-props` passes a dynamic object. The
component host is removed after mounting. Put `vd-component="name"` on an
ordinary element when a wrapper must remain. `vd-path` is a compatibility aid
for older split component/request paths; prefer a complete slash/dot name.

## Navigation

```html
<a href="/about" vd-nav>About</a>
<a href="/posts/42?preview=true" vd-nav>Preview</a>
<a href="/features#requests" vd-nav>Requests</a>
<a href="/likely-next" vd-nav vd-prefetch>Prefetch on intent</a>
```

Only app-relative paths are router targets. Same-path hash navigation updates
history and scrolls without remounting. Route context exposes:

```js
export function init({ ctx, state }) {
  state.id = ctx.params.id;
  state.preview = ctx.query.preview === "true";
  state.section = ctx.route.hash;
}
```

Page config and global router guards accept asynchronous functions. Return
`true`/`undefined` to continue, `false` to cancel, or an absolute app path such
as `"/login"` to redirect.

## Page Config, SEO, and Data

```js
export default {
  path: "/posts/:id",
  layout: "default",
  meta: { requiresLogin: false },
  beforeEnter({ to }) {
    if (to.query.blocked === "true") return false;
  },
  seo: {
    title: "Post",
    description: "Post detail page.",
    keywords: ["post"],
    canonical: "https://example.com/posts/1"
  }
};
```

`data.js|ts` may export a page loader and optional cache policy. Build-time
prerender/SEO entries remain in page config and are stripped from browser
runtime output by the Vite plugin.

## Requests

Application routes are discovered below `src/api`. Use file routes for simple
handlers or a named route registry for advanced grouping.

```html
<button
  vd-request="posts.list"
  vd-params="{ page: page }"
  vd-target="posts"
  vd-auto-state
>Load posts</button>
```

Request directives:

| Syntax | Purpose |
| --- | --- |
| `vd-request="group.route"` | Execute a discovered application route |
| `vd-params="{ id: selectedId }"` | Safe parameters object |
| `vd-target="result"` | Write success value to state |
| `vd-state="result"` | Compatibility target name for cross-page flows |
| `vd-auto-state` | Preferred automatic loading/error names |
| `vd-request-state` | Supported compatibility alias for auto state |
| `vd-loading="loadingName"` | Explicit loading state |
| `vd-error="errorName"` | Explicit error state |
| `vd-request-config="requestOptions"` | State-provided request configuration |
| `vd-debounce="delay"` | Delay rapidly repeated triggers |
| `vd-throttle="delay"` | Limit trigger frequency |

Cross-page writes must be explicitly allowed by page config. Request routes may
declare auth, roles, named/custom middleware, and auth-failure redirects.

## Forms

```html
<form vd-form vd-request="posts.create" vd-validate>
  <input name="title" required>
  <small vd-form-error="title"></small>
  <p vd-form-status aria-live="polite"></p>
  <button type="submit">Create</button>
</form>
```

`vd-form` enables native form payload handling. `vd-validate` opts into the
optional validation plugin. `vd-form-error` and `vd-form-status` expose safe
server/native feedback locations.

## Direction

```html
<svg vd-rtl-flip aria-hidden="true"></svg>
```

`vd-rtl-flip` marks directional artwork for project CSS. Direction and
localization helpers are opt-in and never require a global locale runtime.

## Directive Index

Every preferred compiler directive family is listed here:

| Category | Preferred names |
| --- | --- |
| Text/display | `vd-text`, `vd-if`, `vd-elseif`, `vd-else`, `vd-show`, `vd-pre` |
| Lists | `vd-for`, `vd-key` |
| Model/binding | `vd-model`, `vd-bind:*`, `vd-alt`, `vd-attr`, `vd-checked`, `vd-class`, `vd-disabled`, `vd-href`, `vd-src`, `vd-style`, `vd-value` |
| Events | `vd-on:<event>` plus supported modifiers |
| Components | `vd-component`, `vd-props`, `vd-prop-*`, `vd-child`, `vd-get-child`, `vd-ref`, `vd-state`, `vd-path` |
| Navigation | `vd-nav`, `vd-prefetch` |
| Requests/forms | `vd-request`, `vd-request-config`, `vd-request-state`, `vd-params`, `vd-target`, `vd-auto-state`, `vd-loading`, `vd-error`, `vd-debounce`, `vd-throttle`, `vd-form`, `vd-form-error`, `vd-form-status`, `vd-validate` |
| Direction | `vd-rtl-flip` |

## Public JavaScript Helpers

Primary `velodom` values:

- application/reactive: `createApp`, `computed`, `effect`, `watch`
- declaration helpers: `definePageConfig`, `definePlugin`,
  `defineRequestRoute`, `defineResourceAdapter`
- requests/auth: `requestJson`, `ApiError`, `defineRequestMiddleware`,
  `createAuthRuntime`, auth providers, request constants
- optional plugins/helpers: shared state, direction, validation, progressive
  forms, request cache/retry, devtools bridge, plugin manager

Additional public functionality is separated into the documented package
subpaths. See `FEATURE_INVENTORY.md` for exact capability status and
`README.md` for the supported import map.

Development tooling does not add template syntax. `vd explain` analyzes files,
framework topics, or stable diagnostic codes; `vd doctor --json` reports a
category, code, suggestion, and a one-based source location when provable.
`vd check` composes the available static gates without writing source or
pretending that a production build replaces real browser tests.
`vd fix` previews migration from legacy directive attributes to the preferred
syntax and changes files only with `--write`; it does not rewrite application
logic.
The optional `vd lab` command opens a read-only Vite inspector. Manual Lab
hosts may import `mountVeloDomLab` and
`VELODOM_DEVTOOLS_PROTOCOL_VERSION` from `velodom/devtools`; normal
applications do not need either import.

## Legacy and Compatibility Syntax

- `data-vd-*` is accepted for compatibility; author `vd-*` in new templates.
- `vd-request-state` remains supported; prefer `vd-auto-state`.
- split `path` component/request addressing remains supported where documented;
  prefer the complete canonical name.
- Do not assume unlisted Vue, React, Svelte, Alpine, or Angular syntax.
