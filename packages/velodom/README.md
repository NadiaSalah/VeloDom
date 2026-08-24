# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework for building
folder-based web applications with a lightweight browser runtime. Ordinary HTML
stays at the center while the framework adds reactive state, routing,
components, layouts, requests, validation, and static SEO output.

VeloDom follows six principles:

- HTML First: templates remain readable HTML.
- Compiler First: expensive discovery and validation happen during development
  and build time.
- Folder First: folders and file names provide useful conventions.
- Convention over Configuration: common applications need little setup.
- Runtime Lightweight: browser code focuses on reactivity and interaction.
- Vanilla Friendly: JavaScript is the default and TypeScript is optional.

## Requirements

- Node.js `20.19+` or `22.12+`.
- Vite `6`, `7`, or `8` for the standard development workflow.
- TypeScript is optional for application code.

## Create or Install

After the package is published, create a project with:

```bash
npx create-velodom my-site
cd my-site
npm install
npm run dev
```

To add VeloDom to an existing Vite project:

```bash
npm install velodom
npm install --save-dev vite
```

Add the Vite plugin:

```js
// vite.config.js
import { defineConfig } from "vite";
import { velodom } from "velodom/vite-plugin";

export default defineConfig({
  plugins: [velodom()],
});
```

Then use the beginner entry point:

```js
// src/main.js
import { mountVeloDom } from "velodom/vite";

await mountVeloDom();
```

## Simple File API Routes

For a basic declarative request, export one default handler from a nested API
file. Its path becomes the route name:

```js
// src/api/posts/get.js
export default ({ id }) => fetch(`/api/posts/${id}`).then(response => response.json());
```

```html
<button vd-request="posts.get" vd-params="{ id: selectedId }">Load post</button>
```

Use the existing `src/api/routes.js` registry for middleware, auth, roles, or
other advanced route configuration; the registry deliberately takes precedence.
Root API files such as `src/api/posts.js` remain importable helper modules.

Middleware has the same optional convention:

```js
// src/api/middleware/auth.js
export default (params, { session }) => {
  if (!session?.user) throw new Error("Sign in is required");
  return params;
};
```

Reference it as `middleware: ["auth"]`. Use `src/api/middleware.js` when a
central advanced registry is clearer; it takes precedence over named files.

## Folder-First Pages

A page can be a small, predictable folder:

```text
src/pages/about/
  index.html
  data.js
  script.js
  style.css
  config.js
```

```html
<!-- src/pages/about/index.html -->
<main>
  <h1>{{ title }}</h1>
  <button vd-on:click="count++">
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
    description: "A folder-first VeloDom page.",
  },
};
```

An optional `data.js` or `data.ts` can load route data before the page script:

```js
export async function load({ params }) {
  const response = await fetch(`/api/articles/${params.slug}`);

  return {
    article: await response.json()
  };
}
```

The returned value is available as `data` in templates and in
`init({ data, state })`. This keeps initial route data close to its page without
requiring a global store.

## Optional Single-File Authoring

Folder mode remains the default, but pages, components, and layouts may use a
`.vd` file when keeping a small feature together is clearer:

```html
<template>
  <main>
    <h1>{{ title }}</h1>
    <button vd-on:click="count++">Count: {{ count }}</button>
  </main>
</template>

<script>
export const state = {
  title: "About VeloDom",
  count: 0
};
</script>

<style>
main { padding: 2rem; }
</style>

<config>
export default {
  path: "/about",
  seo: { title: "About VeloDom" },
};
</config>
```

## Main Capabilities

- Reactive interpolation with `{{ expression }}` and directives such as
  `vd-text`, `vd-if`, `vd-for`, `vd-model`, and `vd-on:*`.
- Folder or `.vd` pages, components, and nested layouts.
- File-based routing, route parameters, guards, browser history, and same-page
  hash navigation.
- Request helpers with validation, cache, retry, timeout, loading, errors, and
  user-defined middleware, plus optional progressive native forms.
- Optional conventional page data modules with safe static-entry transfer.
- Static SEO snapshots generated from page configuration and page content.
- Lazy modules, asset helpers, development diagnostics, testing helpers, and
  compiler-powered project inspection.
- Vanilla JavaScript and TypeScript application authoring through the same API.

Literal interpolation braces can be escaped as `\{{ value }}`. Use `vd-pre` on
an element when all interpolation inside it must remain literal.

## Public Entry Points

| Import | Purpose |
| --- | --- |
| `velodom` | Application runtime and public APIs |
| `velodom/vite` | Beginner-friendly Vite bootstrap |
| `velodom/vite-plugin` | Vite integration |
| `velodom/compiler` | Template and `.vd` compilation |
| `velodom/content` | Content discovery and loading |
| `velodom/assets` | Asset helpers |
| `velodom/devtools` | Optional development diagnostics |
| `velodom/testing` | Framework testing utilities |

Only these documented package paths are public. Importing files from
`velodom/lib/*` is unsupported because those files are internal build output.

## CLI

The `vd` command supports project creation and static project intelligence:

```bash
vd create page about
vd create page counter --demo counter
vd create component ui/button
vd create api posts
vd create middleware
vd doctor
vd inspect
vd graph
vd health
vd stats
vd build-report
vd docs
vd types
```

Focused page demos are available as `static`, `counter`, `request`, `form`, or
`seo`. They generate only the files needed to demonstrate that capability; the
request demo also includes its own nested file API handler.

Run `vd --help` or `vd <command> --help` for the current options.

## Application Imports

Application modules may use portable relative imports. Teams may also configure
aliases such as `@/api/posts.js` through Vite or `#app/api/posts.js` through
`package.json#imports`. These aliases belong to the application; framework code
uses only the documented `velodom` package entry points.

Application pages, components, layouts, APIs, middleware, and assets stay in
the consuming project. Framework internals are installed under
`node_modules/velodom` and should never be copied into application source.

## Documentation and Source

- [Complete documentation](https://github.com/NadiaSalah/velodom/tree/master/docs)
- [Example application](https://github.com/NadiaSalah/velodom/tree/master/examples/blog)
- [Issues](https://github.com/NadiaSalah/velodom/issues)
- [Source repository](https://github.com/NadiaSalah/velodom)

VeloDom is released under the MIT License.
