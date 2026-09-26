# VeloDom Syntax Reference

This is the canonical package-local syntax reference for VeloDom 1.0.0. It
documents implemented public authoring syntax, not roadmap ideas. New code
should use preferred `vd-*` attributes; `data-vd-*` remains a compatibility
input compiled/runtime output.

## Resource Conventions

Only the documented resource folders below are discovered. Application helper
folders such as `src/domain`, `src/content`, or `src/utils` are explicit ordinary
imports, not a service registry. JS JSDoc and app-owned `.d.ts` files can share
wire contracts with TS modules without a second implementation. Server modules
must stay outside browser imports. Vite asset `base` does not automatically
prefix page routes, navigation links, or API endpoints.

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
empty presence attribute. For `aria-*`, booleans serialize as `"true"`/`"false"`;
only `null`/`undefined` remove the attribute. This preserves accessible state.

Styles accept strings or objects. Switching formats removes prior bound
declarations. CSS variables preserve their spelling:
`vd-style="{ '--BrandColor': accent, fontSize: size }"`.

## Production Asset URLs

Runtime templates are loaded as HTML strings, not Vite HTML entry points.
Import bundled assets in a script and bind the resulting URL:

```js
import logo from "../../assets/logo.svg";
export const state = { logo };
```

```html
<img vd-src="logo" alt="Site name" width="48" height="48">
```

Alternatively keep a file in `public/` and use its public URL. Do not point
runtime template images at `/src/assets/...`; development availability does
not make that source path a production asset URL.

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

Core fences late results from cancelled resource/data/style/init/mounted/error
fallback work. Forward `ctx.signal` in async page/component hooks and check it
before application-owned writes after an await. A blocked newer guard preserves
an accepted pending navigation; a newer accepted navigation cancels it.
Cleanup owns captured component instances, not the current reused root.
`destroy()` remains before `ctx.onCleanup()`; cancellation cannot force a
non-settling user hook/cleanup or roll back already accepted writes.

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

```js
// src/pages/catalog/data.js — uncached unless a public cache policy is exported
export async function load({ signal }) {
  const response = await fetch("/api/catalog", { signal });
  if (!response.ok) throw new Error("Catalog read failed");
  return response.json();
}
```

The optional `PageDataContext.signal` exists on client loads; build/server
contexts may omit it. Cached loads use a shared transport signal with independent
subscriber cancellation; the last cancellation aborts/fences that read. SWR is
cache-owned, not cancelled by page departure; tracked reads abort on app destroy.
Core observes ignored-abort late work but never commits its stale result.

For public data only, export `cache = { maxAgeMs: 30_000,
staleWhileRevalidateMs: 120_000 }`. Times must be finite and non-negative.
The app-local cache retains up to 100 LRU page/route/query values and tracks up
to 100 pending loads; matching cached reads share a load. Saturated tracking
bypasses caching, not the read. Without `cache`, loads remain independent.
SWR returns the prior value within its original stale window and refreshes the
next visit; background failures are observed without renewing freshness or
patching mounted state. Expired/cold loads propagate failures normally.
App destruction clears cache identities. There is no public page-cache clear/
refetch API yet; request-cache clearing is separate. Keep private/session and
immediately mutation-sensitive page data uncached.

## Requests

Application routes are discovered below `src/api`. Use file routes for simple
handlers or a named route registry for advanced grouping.

```html
<button
  vd-request="posts.list"
  vd-params="{ page: page }"
  vd-target="postsResult"
  vd-auto-state
>Load posts</button>

<p vd-show="postsLoading" aria-live="polite">Loading…</p>
<p vd-if="postsError !== ''" role="alert">{{ postsError }}</p>
<p vd-if="!postsLoading && postsError === '' && postsResult?.items?.length === 0">
  No posts found.
</p>
<ul vd-if="!postsLoading && postsError === '' && Boolean(postsResult?.items?.length)">
  <li vd-for="post in (postsResult?.items || [])" vd-key="post.id">
    {{ post.title }}
  </li>
</ul>
```

`vd-auto-state` derives `postsLoading` and `postsError` from the
`postsResult` target. Use an always-iterable loop source such as
`postsResult?.items || []`; nested directives are evaluated independently and
must remain safe before the first result arrives.

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
Files under `src/api` are browser application modules, not secret server
routes. Client auth/roles/guards improve UX only. Keep credentials, session and
CSRF enforcement, tenant/resource authorization, authoritative business data,
and sensitive transitions on an application backend. Retry a write only when
that backend defines safe idempotency semantics.

Declarative retry and `withRequestRetry(handler, { retries, delayMs,
shouldRetry })` never retry `AbortError` or aborted contexts. Waiting is
abortable and cleans up its timer/listener. Middleware checks before each
operation and does not wrap cancellation as a policy failure. Forward
`context.signal` to actual I/O; code ignoring it is not forcibly stopped.
The wrapper rejects ignored-abort completion, and disposed/replaced declarative
bindings suppress late notifications after async `onSuccess`. Cancellation
does not undo an accepted backend write or state already applied before a
callback; use status/idempotency and explicit refetch for ambiguous outcomes.

## Optional Request Cache

`createRequestCache({ ttlMs: 5000, maxEntries: 40, scope: "public" })` wraps the
existing JSON client only when explicitly used. GET reads without a body
coalesce; headers/credentials affect identity. Each caller's abort is isolated;
the last cancellation aborts transport. Mutations remain uncached.

`clear()` invalidates stored and pending completion writes. With the default
key use `clear("GET /api/catalog")`, or pass the custom key function's value.
Clear after a successful write, then explicitly refetch UI. An awaited stale
result is still returned to its original caller and must not be applied to a
different route/account. Failed writes do not auto-invalidate.

`maxEntries` defaults to 100 (LRU); zero disables caching. Saturated in-flight
tracking bypasses caching. Use a finite TTL; legacy zero retains values until
clear/eviction. Private/session/no-store endpoints should use `requestJson`
directly. The helper does not inspect HTTP cache headers or HttpOnly cookies.
For explicitly permitted private caching, supply a `scope` string or getter
including tenant/user/session epoch and clear on auth changes. Scope changes
fence old work, including switch-back; they do not guard page state updates.
Page-data caching is independent and currently recommended for public data only.

## Forms

```html
<form vd-form vd-request="posts.create" vd-validate>
  <input name="title" aria-describedby="title-error" required>
  <small id="title-error" vd-form-error="title"></small>
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
When `createDirectionPlugin()` is installed, page and component lifecycle hooks
receive the same optional `ctx.direction` controller. Templates can bind the
reactive `$direction` value. Do not assume either value exists without the
plugin.

Localization dictionaries may use nested string groups and explicit
`definePluralMessage({ one, other })` leaves. Resolve text with
`i18n.t(locale, key, { name })` and counts with
`i18n.plural(locale, key, count)`. Placeholders use `{name}`; doubled braces are
literal. `vd i18n extract|check` analyzes statically quoted keys and static
options without introducing a localization directive or executing project code.

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

Plain application plugins need only a setup function. Reusable integrations
may add `manifest: { name, version, velodom, capabilities, conflicts? }` to the
object form. `version` is exact; `velodom` accepts `*`, an exact version,
`1.x`, caret, tilde, or whitespace-separated comparators. Capabilities are
`browser`, `build`, or `node`. `inspectPluginConformance()` returns static
diagnostics and never runs setup/cleanup; there is no built-in marketplace.

Additional public functionality is separated into the documented package
subpaths. See `FEATURE_INVENTORY.md` for exact capability status and
`README.md` for the supported import map.

The optional build-only `velodom/pwa` subpath provides
`definePwaManifest`, `inspectPwaManifest`, `definePwaCacheStrategies`,
`createPwaServiceWorker`, `createPwaRegistrationScript`, and `velodomPwa`.
This adds no directive or default browser behavior. A worker is emitted and
registered only when `serviceWorker` is explicitly enabled in the Vite plugin.

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

Application error boundaries receive `context.diagnostic` with stable `code`,
`group`, `sourceStack`, and `ownership` fields. The optional
`mountVeloDomErrorOverlay()` export from `velodom/devtools` groups these reports
for development only; it never replaces the application fallback or retry UI.

## Legacy and Compatibility Syntax

- `data-vd-*` is accepted for compatibility; author `vd-*` in new templates.
- `vd-request-state` remains supported; prefer `vd-auto-state`.
- split `path` component/request addressing remains supported where documented;
  prefer the complete canonical name.
- Do not assume unlisted Vue, React, Svelte, Alpine, or Angular syntax.
