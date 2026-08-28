# AI Guide for VeloDom Projects

This guide tells coding assistants how to inspect and modify a VeloDom
application without inventing framework behavior. Read `../AI_CONTEXT.md`
first, then use `SYNTAX_REFERENCE.md` for exact syntax and
`FEATURE_INVENTORY.md` for status.

## Identify a VeloDom Project

Look for several of these signals:

- dependency on `velodom`
- `mountVeloDom` from `velodom/vite`
- `velodom()` from `velodom/vite-plugin`
- `src/pages`, `src/components`, or `src/layouts`
- `.vd` files
- `vd-*` directives in ordinary HTML

Do not classify a project from one mustache expression alone. Inspect its
manifest, Vite config, and existing directory conventions.

## Source Priority

When information disagrees, use this order:

1. installed package implementation and types
2. passing project/package tests
3. `FEATURE_INVENTORY.md`
4. `SYNTAX_REFERENCE.md`
5. `AI_CONTEXT.md`
6. package `README.md`
7. external or historical examples

Never promote a TODO or issue into an implemented feature.

## Create VeloDom Code

1. Inspect the existing project shape and language choice.
2. Prefer a folder resource when behavior may grow.
3. Use `.vd` only for a small cohesive page/component/layout.
4. Write semantic HTML before adding directives.
5. Use shallow exported state for defaults.
6. Put methods, async work, and cleanup in lifecycle functions.
7. Keep application APIs, auth policy, and business rules outside Core.
8. Add loading, error, empty, accessibility, and SEO behavior when relevant.

Minimal preferred example:

```html
<main>
  <h1>{{ title }}</h1>
  <button type="button" vd-on:click="increment()">
    Count: {{ count }}
  </button>
</main>
```

```js
export const state = { title: "Counter", count: 0 };

export function init({ state }) {
  state.increment = () => { state.count += 1; };
}
```

## Validate Syntax

Before using a directive:

1. Find it in `SYNTAX_REFERENCE.md`.
2. Confirm its status in `FEATURE_INVENTORY.md`.
3. Check the current project for an established equivalent.
4. Run `npm run build` so the compiler validates templates.
5. Run project tests and, for framework work, the repository checks.

Use `vd doctor` for static project diagnostics. Use `vd inspect`, `vd routes`,
or `vd graph` when structure is unclear. These commands analyze local project
files and do not add runtime features.

Use `vd explain <file|topic>` for deterministic local explanations. Use
`vd lab --check` before `vd lab` when a visual, read-only view of mounted
routes, components, state, bindings, events, requests, or compiler metadata
would help. Lab is optional; do not add it to production code or assume it can
mutate application state.

## Use Public Package Exports

Allowed imports are documented in the package README. Common forms:

```js
import { createApp, requestJson } from "velodom";
import { mountVeloDom } from "velodom/vite";
import { velodom } from "velodom/vite-plugin";
```

Do not import from package `lib` internals or from repository
`packages/velodom/src` paths. An unexported implementation file is not a stable
API, even if it exists in the installed tarball or repository checkout.

## Choose Canonical Versus Legacy Syntax

- Write `vd-*`; accept existing `data-vd-*` only as compatibility syntax.
- Write `vd-auto-state`; preserve `vd-request-state` only in existing code when
  a migration is not part of the request.
- Address nested components with `name="folder/component"`.
- Pass literal component strings with `vd-prop-*`. Pass dynamic values with a
  single `vd-props` object; a value such as
  `vd-prop-title="posts[0].title"` is literal text, not an expression.
- Use app-relative navigation such as `/features#requests`, never a bare hash
  with `vd-nav` and never an external URL as a router target.
- Prefer interpolation for inline text and `vd-text` when the whole node is a
  binding.

Do not mechanically rewrite working legacy syntax unless requested; explain
the compatibility status when it matters.

## Verify a Feature Exists

Search the inventory by capability, then inspect its public import or directive
in the syntax reference. For uncertain or high-risk behavior, inspect package
types/tests. If implementation status remains unclear, describe the uncertainty
instead of inventing a solution.

Examples:

- Static SEO exists; universal automatic SSR does not.
- Client navigation guards exist; they do not secure server data.
- Optional localization helpers exist; AI translation is not required.
- Project intelligence CLI exists; an always-running browser telemetry panel
  is not implied.

## Modify the Generated Starter Safely

The generated starter is copied into the user's directory and is fully
editable. Safe workflow:

1. Edit the generated project, never `node_modules/velodom/templates`.
2. Preserve `src/main.js` and `vite.config.js` public imports unless changing
   the adapter intentionally.
3. Keep one `<vd-page>` in each layout.
4. Add routes below `src/pages` using existing folder/`.vd` conventions.
5. Keep public assets in `public` and application styles in `src`.
6. Run `npm run build` after changes.

The starter's `AGENTS.md` routes assistants to these installed references; it
is not a second syntax manual.

## Common AI Mistakes

Do not:

- invent `v-if`, `v-model`, `@click`, `:prop`, or Vue composition APIs
- invent React components/hooks or return JSX
- invent Svelte `$:` declarations or runes
- invent Alpine `x-*` directives
- import internal compiler/runtime modules
- add a global store for local page state without a real cross-page need
- place business auth/data policy inside framework Core
- claim a planned migration/AI/SSR feature is already supported
- put statements or arrow functions inside template expressions
- use `innerHTML` for ordinary text binding
- omit error/loading/empty states from request-driven UI
- use client guards as authorization
- edit packaged starter files in `node_modules`

## Completion Checklist

- syntax is listed in the canonical reference
- imports use public package entry points
- folder ownership remains clear
- Vanilla/TypeScript choice is preserved
- semantic HTML and accessibility are maintained
- request UI covers loading, error, and empty outcomes
- page config includes relevant SEO
- compiler/build/tests pass
