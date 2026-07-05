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
- real DOM integration tests for directives, components, navigation, and requests

Latest verification on 2026-07-05: TypeScript and ESLint checks pass, 77 tests
pass, declarations are generated, the Vite production build completes, and
`npm audit` reports zero known vulnerabilities.

Stricter internal typing, runtime feature-module splitting, and package
publishing boundaries remain roadmap work.

## Technologies

- TypeScript 6 for framework source and declarations
- ESLint 10 with typescript-eslint
- Vite 8.1.3
- happy-dom 20 for development-only DOM integration tests
- Vanilla HTML, CSS, and JavaScript or TypeScript for application code
- Tailwind CSS and daisyUI for the showcase application only

## Architecture

```text
src/
  core/                  all framework-owned source
    adapters/            Vite discovery and resource-map adapters
    compiler/            HTML AST, transforms, metadata, diagnostics
      optimizer.ts       optimizer pipeline and runtime feature manifests
      types.ts           compiler and optimizer public contracts
    shared/              shared contracts and validated object/path utilities
    vite-plugin/         build-time template compilation
    requests/            HTTP, auth, middleware, request directives
      request-bindings.ts target resolution and cross-page write policy
    directives/          expression scope and state path engine
    errors/              framework error reporting and fatal screen
    expression/          safe tokenizer, parser, AST, and evaluator
    index.ts             public runtime entry and exported types
    types.ts             public application contracts
    router.ts            generic matching, params, query, guards
    page-router.ts       page runtime and navigation lifecycle
    lifecycle.ts         mounted/destroy/onCleanup/signal

  pages/                 user-owned application pages
  components/            user-owned application components
  api/                   user-owned routes, handlers, and middleware
  main.js                user-owned application bootstrap

test/
  integration/           real DOM runtime integration coverage
test-support/             reusable test environments outside test discovery
```

All framework source now lives under `src/core`; application authors should not
edit its internal files. Root configuration files remain at the repository root
because Vite, TypeScript, ESLint, and npm discover them there.

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
declarations under `types/`; it clears stale declarations before generation.
The production build runs both automatically.

`src/core/types.ts` is framework source. The root `types/` directory is
generated output, and `node_modules/@types` contains npm-managed declarations
for external dependencies. Neither generated nor dependency declarations
should be moved into `src/core`.

## App Bootstrap

Application resources and policies are injected into the public framework API:

```js
import {
  createApp,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  VD_AUTH
} from "velodom";
import { createViteAdapter } from "velodom/vite";
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

## Source Ownership

Application authors normally edit:

- `src/pages`
- `src/components`
- `src/api`
- `src/main.js`
- application styles and assets

Framework maintainers edit `src/core`. Consumers use these supported entry
points instead of importing internal files:

- `velodom` — runtime and public types
- `velodom/vite` — Vite resource adapter
- `velodom/vite-plugin` — build plugin
- `velodom/compiler` — compiler API

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

These names are compatibility-only. The bundled application uses the preferred
`script.js`/`script.ts`, `config.js`, kebab-case folders, and `vd-*` syntax
throughout.

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
- safe expression parsing and source-aware expression diagnostics
- serializable directive metadata
- deterministic runtime feature manifests
- synchronous custom optimizer extension points
- development and production output modes

### Compiler Optimizers and Tree-shaking

Every compiled template now includes a deterministic manifest containing its
normalized directives and coarse runtime features such as `bindings`,
`events`, `requests`, and `components`. This is the stable extension point for
splitting runtime features into independently tree-shakeable modules later.

Production template modules omit development metadata by default. The small
`__vdManifest` named export remains available to build integrations and can be
removed naturally by the bundler when only the default HTML export is used.
Both artifacts can be controlled through Vite plugin options.

Advanced framework/build integrations can register synchronous optimizers:

```js
// vite.config.js
import { defineConfig } from "vite";
import { defineTemplateOptimizer } from "velodom/compiler";
import { velodom } from "velodom/vite-plugin";

const addBuildMarker = defineTemplateOptimizer(
  "add-build-marker",
  (result, context) => {
    context.addRuntimeFeature("analytics");

    return {
      html: result.html.replace(
        "<main",
        '<main data-build="optimized"'
      )
    };
  }
);

export default defineConfig({
  plugins: [
    velodom({
      compiler: {
        optimizers: [addBuildMarker]
      }
    })
  ]
});
```

Optimizers run after parsing and validation, receive full compile-time metadata,
and may update HTML, AST, metadata, or diagnostics. Their output is validated,
named failures are reported clearly, and asynchronous optimizers are rejected
so the standalone compiler remains deterministic. Application authors do not
need to configure optimizers for normal VeloDom usage.

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

## Safe Template Expressions

Template expressions are parsed into an AST and evaluated without `eval` or
`new Function`. Supported syntax includes:

- literals, template literals, identifiers, arrays, and object literals
- arithmetic, comparisons, logical operators, and ternaries
- property and computed access
- optional chaining
- trusted state function and method calls
- safe globals such as `Boolean`, `Number`, `String`, `Array.isArray`, `Math`,
  and `JSON`

Expressions are intentionally not full JavaScript. Assignments, `new`, arrow
functions, and statements are rejected. Use normal
`script.js` or `script.ts` functions for complex logic. Static access to
dangerous members such as `constructor`, `prototype`, and `__proto__` fails
during compilation; dynamic access is checked again at runtime. Host globals
and dynamic execution entry points including `window`, `document`, `Function`,
`eval`, timers, and function meta-call methods are unavailable.

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
Explicit local `loading` and `error` bindings follow the already-resolved local
result target; the target name is not reinterpreted as an external page.

## Runtime Integration Coverage

The happy-dom integration suite exercises the runtime as one browser-like
system rather than isolated fake elements. It currently verifies:

- conditional chains, show/text, attributes, values, classes, styles, and
  boolean bindings
- model synchronization, event modifiers, loop scope, rerender, and cleanup
- component props, slots, DOM refs, grouped keyed refs, `expose`, state
  inheritance, local overrides, and lifecycle teardown
- page navigation, dynamic route context, page-state persistence, and cleanup
- request result/loading/error writes, success events, and abort-on-unmount
- request-config/request-state automation, explicit cross-page state writes,
  allowlist enforcement, invalid configuration, and request error events
- structured error formatting, Windows/source stack locations,
  directive-specific diagnostics, warnings, and the one-time fatal screen

`happy-dom` is a test-only dependency and is not included in application
runtime bundles.

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

- Template expressions use the safe AST evaluator and do not invoke dynamic
  JavaScript compilation.
- Compiler diagnostics validate expression syntax and statically unsafe
  members before bundling.
- Runtime member checks protect computed access that cannot be resolved during
  compilation.
- Protected state keys and prototype paths cannot be request write targets.
- Cross-page writes require explicit target-page config.
- Frontend role checks improve UX; backend authorization is authoritative.

## Roadmap

See [todo.md](todo.md). The next architectural priorities are:

1. stricter internal types with fewer compatibility `any` boundaries
2. split runtime directive features using compiler manifests
3. package publishing boundaries and semantic versioning rules
4. CLI scaffolding

## Development Handoff

The main files changed in the current architecture milestone are:

- `src/core/compiler/index.ts` and `src/core/vite-plugin/index.ts`
- `src/core/index.ts`, `src/core/types.ts`, `src/core/router.ts`,
  `src/core/lifecycle.ts`, and `src/core/plugins.ts`
- `src/core/requests/auth.ts`, `request-router.ts`, and
  `middleware-engine.ts`
- `src/core/adapters/vite.ts` and `src/core/resource-adapter.ts`
- the blog application under `src/pages`, `src/components`, and `src/api`

The conditional-directive evaluation regression is covered by
`test/core/directives.test.js`. Its fix lives in `src/core/directives.ts`.
The local/public `expose` contract is covered by
`test/core/reactive.test.js` and integrated by `src/core/mount.ts`.
Shared object validation, folder normalization, and protected-state path
detection are covered by `test/core/shared.test.js`.
Expression/state-path behavior and request binding policies are covered by
`test/core/expression.test.js` and `test/requests/request-bindings.test.js`.
The browser-like runtime path is covered by
`test/integration/dom-runtime.test.js`, using `test-support/dom.js`.

The current integration milestone changed:

- `src/core/directives.ts` to dispose rendered loop nodes and their listeners
- `src/core/requests/request-router.ts` to keep explicit local status bindings
  on the resolved local request target
- `test/integration/dom-runtime.test.js` and `test/core/events.test.js` for
  regression and lifecycle coverage
- `package.json`/`package-lock.json` for happy-dom and the secure Vite 8.1.3
  update

The integration tests exposed both runtime fixes above. Vite was also upgraded
from the vulnerable 8.0.x range after an npm security audit; no automated
major-version migration or external push was performed.

The latest request-hardening step added
`test/integration/request-directives.test.js`. It verifies declarative request
config, automatic status names, explicit cross-page bindings, page allowlists,
blocked writes, request failures, and invalid configuration. No core behavior
change was required by this step.

The error-system step added `test/integration/errors.test.js`. It verifies
structured console output, fallback and parsed source locations,
directive-specific context, warning routing, safe text rendering, and the
single fatal-screen guard. No core behavior change was required by this step.

The compiler optimization step added `src/core/compiler/optimizer.ts` and
`types.ts`, runtime feature manifests, validated custom optimizer hooks, and
production metadata pruning in the Vite plugin. Compiler tests cover manifest
generation, extension hooks, invalid output, and production/development module
artifacts. `todo.md` now starts with a visible completed/total progress counter.

Important decisions and deferred technical work are recorded in
[NOTES.md](NOTES.md). Milestone history is recorded in
[CHANGELOG.md](CHANGELOG.md).
