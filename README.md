# VeloDom

VeloDom is a compiler-first, HTML-first frontend framework for building
folder-based applications with normal HTML, reactive local state, components,
requests, and a deliberately small runtime.

The project is evolving without JSX or TSX. Application authors can use
JavaScript or TypeScript while continuing to write ordinary HTML templates.

## Current Status

The repository now includes:

- a standalone TypeScript template compiler
- a TypeScript VeloDom Vite plugin
- a TypeScript runtime with router, state, directives, components, lifecycle,
  and events
- request middleware and configurable auth providers
- a Vite folder-discovery adapter
- generated public declaration files
- TypeScript type checking and ESLint quality gates
- a complete blog showcase application
- Node-based compiler, router, lifecycle, adapter, auth, middleware, and HTTP tests

Latest verification on 2026-07-04: TypeScript and ESLint checks pass, 35 tests
pass, declarations are generated, and the Vite production build completes.

The safe expression AST, optimizer, stricter internal typing, and tree-shaking
extension points remain roadmap work.

## Technologies

- TypeScript 6 for framework source and declarations
- ESLint 10 with typescript-eslint
- Vite 8
- Vanilla HTML, CSS, and JavaScript or TypeScript for application code
- Tailwind CSS and daisyUI for the showcase application only

## Architecture

```text
packages/
  compiler/              HTML parser, directive transform, metadata, diagnostics
  shared/                compiler/shared directive contracts
  vite-plugin/           build-time template compilation

src/
  core/                  framework runtime only
    index.ts             public framework entry and exported types
    types.ts             public application contracts
    router.ts            generic matching, params, query, guards
    page-router.ts       page runtime and navigation lifecycle
    lifecycle.ts         mounted/destroy/onCleanup/signal
    requests/            HTTP, auth providers, middleware, request directives

  adapters/
    vite.ts              import.meta.glob folder discovery
    resource-map.ts      framework-neutral resource indexing helpers

  pages/                 application pages
  components/            application components
  api/                   application routes, handlers, validation, middleware
```

Framework machinery stays in `src/core` and `packages`. Blog/domain behavior
stays in `src/pages`, `src/components`, and `src/api`.

## Start the Application

```bash
npm run dev
```

Production build and tests:

```bash
npm run check
npm test
npm run build
```

`npm run check` runs TypeScript and ESLint. `npm run types` generates public
declarations under `types/`; the production build runs both automatically.

## App Bootstrap

Application resources and policies are injected into the public framework API:

```js
import {
  createApp,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  VD_AUTH
} from "velodom";
import { createViteAdapter } from "./adapters/vite.ts";
import routes from "./api/routes.js";
import middleware from "./api/middleware.js";

createApp({
  adapter: createViteAdapter(),
  routes,
  middleware,
  auth: {
    defaultProvider: VD_AUTH.PROVIDERS.SERVER,
    providers: {
      server: createServerSessionAuthProvider(),
      demo: createLocalStorageAuthProvider()
    }
  },
  plugins: [],
  router: {
    notFoundPage: "404",
    beforeEach: []
  }
}).mount();
```

The core does not import application routes or middleware.

## Folder-First Convention

One folder represents one page or component.

```text
src/pages/blog/posts/[id]/
  index.html
  script.js          # or script.ts
  style.css
  config.js

src/components/blog/post-card/
  index.html
  script.js          # or script.ts
  style.css
```

Backward-compatible names remain supported:

- `page.js`
- `component.js`
- `page.config.js`

Preferred names are:

- `script.js` or `script.ts`
- `config.js`

Nested folders work without manual registration.

## TypeScript Inside, JavaScript Optional

Framework and adapter source is TypeScript and must pass both `tsc` and ESLint.
Application authors choose the language per page or component:

```text
src/pages/vanilla-page/script.js
src/pages/typed-page/script.ts
```

Both receive the same hooks, state behavior, directives, and runtime API.
TypeScript is opt-in for application code and does not require JSX or TSX.

Vanilla JavaScript:

```js
import { requestJson } from "velodom";

export function init({ state }) {
  state.title = "JavaScript page";
}
```

TypeScript:

```ts
import type { PageScriptContext, StateRecord } from "velodom";

interface ExampleState extends StateRecord {
  title: string;
}

export function init({ state }: PageScriptContext<ExampleState>) {
  state.title = "TypeScript page";
}
```

The working TypeScript example is available at `/features/typescript`. The
remaining blog application deliberately uses Vanilla JavaScript, proving that
TypeScript is not imposed on users.

## Compiler and Directive Syntax

Preferred templates use short `vd-*` attributes:

```html
<button
  vd-if="canSave"
  vd-bind:disabled="saving"
  vd-on:click.prevent="save()"
>
  Save
</button>
```

The Vite plugin compiles them into the current runtime representation:

```html
<button
  data-vd-if="canSave"
  data-vd-disabled="saving"
  data-vd-onclick.prevent="save()"
>
  Save
</button>
```

Existing `data-vd-*` templates remain valid.

The compiler currently provides:

- start-tag and attribute AST nodes
- source offsets and line/column diagnostics
- `vd-*` normalization
- `vd-on:event.modifier` transforms
- `vd-bind:name` transforms
- unknown-directive validation
- serializable directive metadata
- development and production output modes

## Pages

```js
// src/pages/example/script.js
export function init({ state, ctx, refs }) {
  state.title = "Hello";

  ctx.onCleanup(() => {
    console.log("page cleanup");
  });
}

export function mounted({ state, ctx }) {
  console.log("mounted", ctx.params, ctx.query);
}

export function destroy({ state }) {
  console.log("destroyed");
}
```

Page context includes:

- `page`
- `route`
- `params`
- `query`
- `meta`
- `components`
- `on`, `off`, `once`, `emit`
- `onCleanup(callback)`
- lifecycle `signal`

## Page Config

```js
// config.js
export default {
  path: "/account",
  meta: {
    auth: true
  },
  beforeEnter({ to, from }) {
    return true;
  },
  allowExternalWrite: [
    "externalResult",
    "externalLoading",
    "externalError"
  ]
};
```

Config is discovered by the adapter. It can override the folder-generated route,
provide metadata and guards, and opt into safe cross-page request writes.

## Router

Folders generate routes automatically:

```text
pages/home                  -> /
pages/features              -> /features
pages/blog/posts/create     -> /blog/posts/create
pages/blog/posts/[id]       -> /blog/posts/:id
pages/blog/posts/[id]/edit  -> /blog/posts/:id/edit
```

Dynamic parameters and query strings are exposed in page context:

```js
export function init({ ctx }) {
  console.log(ctx.params.id);
  console.log(ctx.query.preview);
}
```

Guards may:

- return `true` or `undefined` to continue
- return `false` to block
- return an application path such as `"/login"` to redirect

Static routes are ranked ahead of dynamic routes.

## Lifecycle

Pages and components support:

1. `init(context)`
2. DOM/directive/component setup
3. `mounted(context)`
4. `destroy(context)`
5. registered cleanup callbacks

`ctx.signal` aborts before cleanup runs. Component children clean up before their
parent. Page resources clean up before navigation completes.

## Reactive State and Directives

Supported directives include:

- `vd-text`
- `vd-if`, `vd-elseif`, `vd-else`
- `vd-show`
- `vd-for`
- `vd-model`
- `vd-class`
- `vd-style`
- `vd-attr`
- `vd-bind:value`
- `vd-bind:src`
- `vd-bind:href`
- `vd-bind:alt`
- `vd-bind:disabled`
- `vd-bind:checked`
- `vd-on:event`
- `vd-request`

Legacy `data-vd-*` equivalents are supported.

Conditional branches suspend dependent directive evaluation while inactive.
For example, a `vd-bind:href` inside a false `vd-if` can safely reference data
that will only exist when the condition becomes true. The binding remains
reactive and evaluates as soon as the branch is activated.

## Components

```html
<vd-component
  name="blog/post-card"
  vd-props="{ post: featuredPost }"
  vd-ref="featuredCard"
></vd-component>
```

Nested component paths can also use a split path:

```html
<vd-component name="post-card" vd-path="blog"></vd-component>
```

### Expose API

```js
export function init({ state }) {
  function open() {
    state.opened = true;
  }

  return {
    state,
    expose: {
      open
    }
  };
}
```

Members returned through `expose` are available both to the component's own
template and to its parent. The component can therefore use
`vd-on:click="open()"` without also assigning `state.open = open`.
Protected framework state names cannot be replaced through `expose`.

From the page:

```js
state.components.modal.open();
```

Repeated refs become groups and support `byKey`.

### Slots

```html
<vd-component name="shared/demo-panel">
  <vd-child name="header">Header</vd-child>
  <vd-child>Body</vd-child>
</vd-component>
```

The component receives content through `vd-get-child`.

## Requests

Routes remain application code:

```js
// src/api/routes.js
import * as posts from "./posts.js";

export default {
  "posts.getAll": posts.getAll,
  "posts.getOne": posts.getOne,
  "posts.create": posts.create
};
```

HTML request:

```html
<button
  vd-request="posts.getOne"
  vd-request-config="{
    params: { id: 1 },
    target: 'post',
    autoState: true
  }"
>
  Load
</button>
```

`autoState` derives:

- `postLoading`
- `postError`

Requests are cancelled automatically when:

- a newer request targets the same result binding
- the owning element is unmounted

The `AbortSignal` reaches auth providers, middleware context, and API handlers.

## Middleware

Simple transform middleware:

```js
export function trimStringFields(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value
    ])
  );
}
```

Advanced pipeline middleware is explicit:

```js
import {
  defineRequestMiddleware,
  VD_MIDDLEWARE
} from "velodom";

export async function requestLogger(params, context, next) {
  const startedAt = performance.now();

  try {
    return await next(params);
  } finally {
    console.info(context.routeName, performance.now() - startedAt);
  }
}

export default {
  trimStringFields,
  requestLogger: defineRequestMiddleware(requestLogger, {
    mode: VD_MIDDLEWARE.MODES.PIPELINE
  })
};
```

## Auth Providers

The core request engine depends on a provider interface rather than a fixed
application authentication strategy.

```js
async function customProvider(context) {
  return {
    authenticated: true,
    user: {
      roles: ["editor"]
    }
  };
}
```

Provider context includes:

- `routeName`
- route auth `options`
- request state and element
- request `AbortSignal`

Core helpers are available for server-session and localStorage providers.
localStorage remains demonstration-only and is never a production security
boundary.

Routes choose providers declaratively:

```js
"demo.editorPost": {
  handler: posts.getOne,
  auth: "demo",
  roles: ["editor", "admin"]
}
```

Backend authorization remains mandatory for real protected operations.

## Plugins

```js
const analyticsPlugin = {
  setup({ app, navigate }) {
    console.log("installed");
  },
  cleanup() {
    console.log("removed");
  }
};

createApp({
  plugins: [analyticsPlugin]
});
```

Plugins set up in registration order and clean up in reverse order.

## Blog Showcase

Useful routes:

- `/` — reactive blog home and loops
- `/blog/posts/1` — dynamic route params and lifecycle
- `/blog/posts/1/edit` — request update form
- `/blog/posts/create` — model and create request
- `/features` — directives, slots, refs, expose, events, requests, cancellation
- `/features/components` — grouped component refs and page events
- `/features/errors` — structured error reporting
- `/account/profile` — configurable auth providers and role checks

## Public API Boundary

Application code imports framework APIs from:

```js
import {
  createApp,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  defineRequestMiddleware,
  requestJson
} from "velodom";
```

Files such as `page-router.ts`, `mount.ts`, and `request-router.ts` are internal.

## Security Notes

- Template expressions still use the current runtime expression evaluator.
- The compiler validates directive structure but does not yet provide the future
  safe expression AST.
- Protected state keys and prototype paths cannot be request write targets.
- Cross-page writes require explicit target-page config.
- Frontend role checks improve UX; backend authorization is authoritative.

## Roadmap

See [todo.md](todo.md). The next architectural priorities are:

1. safe expression parser and evaluator
2. optimizer and tree-shaking extension points
3. stricter internal types with fewer compatibility `any` boundaries
4. integration tests for DOM lifecycle and directives
5. package publishing boundaries and CLI scaffolding

## Development Handoff

The main files changed in the current architecture milestone are:

- `packages/compiler/src/index.ts` and `packages/vite-plugin/src/index.ts`
- `src/core/index.ts`, `src/core/types.ts`, `src/core/router.ts`,
  `src/core/lifecycle.ts`, and `src/core/plugins.ts`
- `src/core/requests/auth.ts`, `request-router.ts`, and
  `middleware-engine.ts`
- `src/adapters/vite.ts` and `src/core/resource-adapter.ts`
- the blog application under `src/pages`, `src/components`, and `src/api`

The conditional-directive evaluation regression is covered by
`test/core/directives.test.js`. Its fix lives in `src/core/directives.ts`.
The local/public `expose` contract is covered by
`test/core/reactive.test.js` and integrated by `src/core/mount.ts`.

Important decisions and deferred technical work are recorded in
[NOTES.md](NOTES.md). Milestone history is recorded in
[CHANGELOG.md](CHANGELOG.md).
