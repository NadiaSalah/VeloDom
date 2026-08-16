# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework with folder-based
pages, components, layouts, routing, reactive state, requests, and static SEO.

```bash
npm install velodom
npm install --save-dev vite
```

Use the beginner Vite entry:

```js
import { mountVeloDom } from "velodom/vite";

await mountVeloDom();
```

Use focused public entry points when needed:

```js
import { createApp } from "velodom";
import { velodom } from "velodom/vite-plugin";
import { compileTemplate } from "velodom/compiler";
```

Application modules can keep portable relative imports or configure local
aliases such as `@/api/posts.js` through Vite and `#app/api/posts.js` through
`package.json#imports`. These aliases point to the application's `src` folder;
framework code always uses the documented `velodom` package subpaths.

Application pages, components, layouts, API routes, middleware, and assets stay
inside the consuming project. Framework internals are installed under
`node_modules/velodom` and must not be copied into application source.

See the [framework documentation](https://github.com/NadiaSalah/velodom/tree/master/docs)
for the complete guide, examples, architecture, and release notes.
