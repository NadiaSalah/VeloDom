# VeloDom

VeloDom is a compiler-first, HTML-first frontend framework for folder-based
single-page applications. Pages and components use ordinary HTML, reactive
state, declarative directives, route-aware lifecycle hooks, and an optional
request layer without JSX or TSX.

The framework source is TypeScript. Application authors may choose Vanilla
JavaScript or TypeScript independently for every page and component.

> Project status: active pre-release development. The package is currently
> `private` and is not published to npm. Public API names are frozen locally as
> a V1 candidate and protected by package-boundary tests.

## Contents

- [What Works Today](#what-works-today)
- [Requirements and Commands](#requirements-and-commands)
- [Project Structure](#project-structure)
- [Folder Conventions](#folder-conventions)
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
- [SEO and Static Route HTML](#seo-and-static-route-html)
- [Deployment and Static Hosting](#deployment-and-static-hosting)
- [Plugins](#plugins)
- [Compiler and Vite Integration](#compiler-and-vite-integration)
- [JavaScript and TypeScript](#javascript-and-typescript)
- [Error and Security Model](#error-and-security-model)
- [Public Package Boundaries](#public-package-boundaries)
- [Showcase Routes](#showcase-routes)
- [Verification](#verification)
- [Browser Support](#browser-support)
- [Best Practices](#best-practices)
- [Current Limitations](#current-limitations)
- [Roadmap and Handoff](#roadmap-and-handoff)

## What Works Today

VeloDom currently provides:

- folder-discovered pages and nested components
- static, nested, and dynamic client-side routes
- route params, query values, metadata, and navigation guards
- shallow reactive state with inherited component state
- conditionals, loops, text, visibility, model, attribute, class, and style
  directives
- event directives with lifecycle and keyboard modifiers
- page and component `init`, `mounted`, `destroy`, cleanup, and abort signals
- DOM refs, component refs, grouped refs, keyed instances, and `expose`
- named and unnamed slots plus folder-scoped CSS
- declarative requests with params, result/loading/error state, events, auth,
  middleware, and cancellation
- configurable server-session and demonstration localStorage auth providers
- runtime head management and static SEO HTML generated from page `config.js`
- a safe expression parser/evaluator with no `eval` or `new Function`
- a Vite template compiler, source-aware diagnostics, optimizer hooks, and
  runtime feature manifests
- compiler accessibility warnings for common image, form-control, anchor,
  click-target, and heading mistakes
- generated ESM and TypeScript declarations for the intended package surface

VeloDom deliberately does not currently provide a mandatory global store,
virtual DOM, JSX, built-in form-validation system, full SSR/hydration, CLI, or
browser devtools.

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
npm run test:browser
npm run build
npm run preview
```

What the main checks do:

| Command | Purpose |
| --- | --- |
| `npm test` | Runs compiler, core, request, package, and DOM integration tests. |
| `npm run docs:check` | Enforces headers and exported JSDoc under `src/core`. |
| `npm run check` | Runs documentation, TypeScript, and ESLint checks. |
| `npm run package:check` | Builds ESM/types and tests an installed local tarball consumer. |
| `npm run pack:check` | Runs package checks and inspects the npm tarball dry-run contents. |
| `npm run test:browser` | Builds the showcase and runs a real local Chrome/Edge browser smoke test. |
| `npm run build` | Runs all quality/package gates, then builds the showcase. |

Generated `dist/`, `lib/`, and `types/` folders are build output and should not
be edited manually.

## Project Structure

```text
src/
  core/                       framework-owned TypeScript
    adapters/                 build-tool resource discovery
    compiler/                 HTML compiler and optimizer contracts
    directives/features/      lazy directive runtime modules
    errors/                   structured error reporting
    expression/               safe expression tokenizer/parser/evaluator
    requests/                 HTTP, auth, middleware, request runtime
    shared/                   generic validation and path helpers
    vite-plugin/              template compilation and static SEO rendering

  pages/                      application-owned pages
  components/                 application-owned components
  api/                        application-owned handlers and middleware
  assets/                     application-owned static assets such as favicon
  main.js                     application bootstrap

test/                         automated tests
test-support/                 reusable test environment helpers
examples/package-consumer/    installed-package verification fixture
```

Ownership rule:

- Framework behavior that is generic across sites belongs in `src/core`.
- Business pages, components, route handlers, and custom middleware stay in
  `src/pages`, `src/components`, and `src/api`.
- Application assets stay in `src/assets`; root-level duplicate favicons are
  avoided unless a deployment target explicitly requires them.
- Build configuration stays at the repository root because npm, Vite,
  TypeScript, and ESLint discover it there.

## Folder Conventions

Pages:

```text
src/pages/example/
  index.html          required
  script.js           optional, preferred
  script.ts           optional TypeScript alternative
  config.js           optional route, policy, and SEO config
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

Compatibility filenames `page.js`, `page.config.js`, and `component.js` are
still discovered, but new application code should prefer `script.js`,
`config.js`, and `script.ts` where typing is wanted. Page config is currently
JavaScript (`config.js`), not TypeScript.

## Application Bootstrap

The application injects its adapter, request routes, middleware, auth
providers, plugins, and router options into `createApp`.

```js
// src/main.js
import "./style.css";
import {
  createApp,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  VD_AUTH
} from "velodom";
import { createViteAdapter } from "velodom/vite";
import routes from "./api/routes.js";
import middleware from "./api/middleware.js";

const app = createApp({
  adapter: createViteAdapter(),
  routes,
  middleware,
  auth: {
    defaultProvider: VD_AUTH.PROVIDERS.SERVER,
    providers: {
      server: createServerSessionAuthProvider({
        sessionUrl: "/api/auth/session",
        credentials: "include"
      }),
      demo: createLocalStorageAuthProvider()
    }
  },
  router: {
    notFoundPage: "404",
    beforeEach({ to, from }) {
      console.info("navigation", from?.path, "->", to.path);
      return true;
    }
  }
});

await app.mount();
```

Programmatic navigation and teardown:

```js
await app.navigate("/features");
await app.destroy();
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
// src/pages/account/config.js
export default {
  path: "/account/profile",
  meta: {
    title: "Account",
    requiresProfile: true
  },
  beforeEnter({ to, from }) {
    if (!canOpenAccount()) {
      return "/";
    }

    return true;
  },
  allowExternalWrite: [
    "profileResult",
    "profileLoading",
    "profileError"
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
src/pages/blog/posts/create/index.html       -> /blog/posts/create
src/pages/blog/posts/[id]/index.html         -> /blog/posts/:id
src/pages/blog/posts/[id]/edit/index.html    -> /blog/posts/:id/edit
```

Static routes are ranked ahead of dynamic routes, so `/blog/posts/create` wins
over `/blog/posts/:id`.

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

Current router limitations such as scroll restoration, hash navigation, focus
management, and prefetch are tracked in `todo.md`; do not assume they exist.

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

Protected framework state names cannot be replaced through `expose`.

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

`vd-request-state` is the attribute equivalent of `autoState: true`.

### Forms

```html
<form
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

Browser-native attributes such as `required` still work. A framework-level
validation API is planned but does not exist yet.

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
  vd-request-state
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
    auth: true
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

## SEO and Static Route HTML

SEO is declared in each page's existing `config.js`:

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
        generateRobots: true
      }
    })
  ]
};
```

Routes marked `robots: "noindex,nofollow"` are excluded from the sitemap.
Static SEO generation can be disabled with `seo: false`.

Meta keywords are supported as supplemental metadata, but they should not be
treated as a modern ranking strategy.

Current SEO output is static metadata plus a concise fallback, not full page
SSR or hydration. API/CMS entry hooks and full static rendering remain roadmap
items.

## Deployment and Static Hosting

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
dist/blog/posts/create/index.html
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

Plugins set up in registration order and clean up in reverse order. Shared
state, validation, cache, and devtools are not silently installed; future
implementations should remain optional plugins.

## Compiler and Vite Integration

### Vite Plugin

The repository development config imports the source plugin directly because
the package is not published:

```js
import { defineConfig } from "vite";
import { velodom } from "./src/core/vite-plugin/index.ts";

export default defineConfig({
  plugins: [
    velodom()
  ]
});
```

An installed/package consumer uses:

```js
import { velodom } from "velodom/vite-plugin";
```

The plugin:

- compiles raw page/component HTML
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
non-semantic elements, and skipped heading levels. Runtime focus management and
keyboard-flow integration remain separate roadmap tasks.

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
}
```

Framework Core enforces `@typescript-eslint/no-explicit-any`. Application
authors are not forced to use TypeScript.

## Error and Security Model

VeloDom provides:

- compiler diagnostics with filename, offset, line, and column
- structured runtime errors with directive/expression/element context
- request errors with request/auth/middleware stages
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

The current global `error` and `unhandledrejection` handlers treat unexpected
failures as fatal. Recoverable page/component error boundaries are planned but
do not exist yet.

Frontend auth and roles improve application UX only. A backend must enforce
real access control.

## Public Package Boundaries

Intended public imports:

### `velodom`

Runtime:

- `createApp`
- `createPluginManager`
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
contracts, SEO contracts, application options, and HTTP options.

### `velodom/vite`

- `createViteAdapter`

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

Modules such as `page-router.ts`, `mount.ts`, `directives.ts`, and
`request-router.ts` are internal. Application code should not import them.

Package publishing remains intentionally blocked by `private: true` until the
license and npm name ownership are explicitly decided. Public API names are
tracked by package-boundary tests and should change only through an intentional
architecture decision plus documentation update.

The release approval process is documented in [RELEASING.md](RELEASING.md).
It is intentionally a human approval checklist, not an automated publish flow.
The current publication blockers are the missing public license decision,
missing `LICENSE` file, and unconfirmed npm package-name ownership.

## Showcase Routes

The repository includes a blog-style showcase:

| Route | Demonstrates |
| --- | --- |
| `/` | reactive post lists, loops, requests, nested components |
| `/blog/posts/1` | dynamic params, loading, lifecycle |
| `/blog/posts/1/edit` | model binding and update request |
| `/blog/posts/create` | forms and create request |
| `/features` | directives, slots, refs, events, requests |
| `/features/components` | grouped/keyed component refs and page events |
| `/features/errors` | structured compiler/runtime/request errors |
| `/features/typescript` | optional typed application page |
| `/account/profile` | configurable auth providers and roles |

The showcase uses Tailwind CSS and daisyUI. Those libraries are application
choices, not VeloDom Core dependencies or requirements.

## Verification

Latest local verification on 2026-07-08:

- Core documentation audit passes for 49 TypeScript files
- TypeScript check passes
- ESLint passes
- 96 automated tests pass
- ESM and declaration generation pass
- package-contract validation passes
- an isolated local-tarball TypeScript/Vite consumer passes
- production showcase build passes

Test coverage includes:

- compiler directives, expressions, diagnostics, manifests, and optimizers
- compiler accessibility warnings for common static template issues
- resource-map and package boundaries
- routes, guards, params, and query parsing
- reactive state, lifecycle, events, refs, and plugins
- real DOM directives, components, navigation, errors, and requests
- auth providers, role checks, middleware modes, request bindings, and HTTP
  behavior
- runtime/static SEO and installed-package SEO generation
- frozen public runtime, compiler, Vite adapter, Vite plugin, type, and package
  subpath exports
- a real-browser Chrome/Edge smoke path for routing, form model updates,
  request fulfillment, and no-JavaScript static SEO HTML

Full cross-browser E2E automation for the documented browser matrix is still a
roadmap task; current fast DOM integration uses happy-dom.

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

`npm run test:browser` currently runs a Playwright-powered smoke test against a
locally installed Chrome or Edge browser. The wider target set remains
Chromium, Firefox, WebKit, and a mobile Safari/WebKit viewport profile.
`happy-dom` remains the fast local DOM integration environment; it is not
treated as a replacement for real-browser E2E coverage.

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

- public V1 API/name freeze
- npm publication, final license, `LICENSE` file, and npm name ownership
- built-in form validation
- declarative request debounce, throttle, retry, or cache
- router scroll restoration, hash navigation, focus management, or prefetch
- full keyboard/focus accessibility integration beyond the current static
  compiler warnings
- recoverable page/component error boundaries
- mandatory/shared global store
- project/page/component scaffolding CLI
- official test-utility package
- browser devtools
- full page SSR, full static content rendering, or hydration
- automatic API/CMS discovery for dynamic SEO entries
- full Firefox/WebKit/mobile real-browser E2E automation for the published
  browser matrix
- project intelligence, health reports, visual graphs, build intelligence,
  documentation generation, migration helpers, and optional AI tooling

The current reactive state is shallow. Static SEO emits metadata and concise
fallback content, not the complete interactive page.

## Roadmap and Handoff

The prioritized roadmap and progress counter live in [todo.md](todo.md).
Important milestone history lives in [CHANGELOG.md](CHANGELOG.md). Architecture
decisions and deferred ideas live in [NOTES.md](NOTES.md). Release rules live
in [RELEASING.md](RELEASING.md).

Current roadmap order:

1. freeze public names, licensing, and package boundaries
2. finish task-oriented documentation and recipes
3. add real-browser E2E coverage for the documented browser matrix
4. finish navigation focus accessibility and recoverable error-boundary contracts
5. complete optional form/request UX
6. add tooling and performance budgets
7. add local Future DX tooling such as project intelligence, doctor/inspect,
   build reports, generated docs, and visual graphs
8. research optional provider-based AI tooling and migration assistants without
   making them runtime requirements
9. add API/CMS SEO hooks and optional hydration only after runtime stability

When continuing development:

1. Keep generic framework logic under `src/core`.
2. Keep business examples under `src/pages`, `src/components`, and `src/api`.
3. Update README, TODO, CHANGELOG, and NOTES after significant work.
4. Add a regression test for every Core bug or behavior change.
5. Run `npm test` and `npm run build` before committing important changes.
6. Do not publish or push externally without explicit authorization.
