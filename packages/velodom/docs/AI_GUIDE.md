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

For accessible bindings, use `vd-attr="{ 'aria-busy': loading }"` directly:
booleans serialize as ARIA tokens. Preserve CSS variable casing in `vd-style`
maps. Static CLI navigation diagnostics inspect literal `href` attributes;
dynamic binding results still need runtime tests. Inspect CLI options safely
with `vd <command> --help` or `-h` before invoking a mutating command.

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

## Growing an application without new framework machinery

Keep `src/pages`, `components`, `layouts`, and `api` discovery unchanged. Put
feature-owned helpers behind explicit imports, using any clear application
folder name such as `domain`. Pages own presentation and drafts; shared modules
must not import page scripts. Components communicate through documented props
and events rather than another page's implementation. Domain types belong to
the app, while framework lifecycle/request types come from `velodom`.

Use JS JSDoc with `.d.ts` contracts or adopt TS one module at a time. Do not
generate two versions of the application or describe static types as runtime
validation. Separate server authority from browser wrappers; `VITE_*` values
are public client configuration. A static build does not deploy a backend.
Vite asset `base` does not automatically change page paths or `vd-nav` links;
coordinate routes, SEO, API paths and hosting explicitly for subdirectories.

The source repository's store example illustrates these boundaries and the
educational blog explains them; neither full application ships in this package.
Use installed `vd inspect`, `vd routes`, `vd doctor` and application builds to
verify real conventions before introducing architecture abstractions.

## Validate Syntax

For read/mutation recipes, reuse `createRequestCache` rather than inventing a
fetch engine. Set finite TTL/capacity, clear only after successful mutation and
explicitly refetch. In-flight deduplication isolates aborts; clearing/scope
changes prevent late cache writes, not stale UI assignments. For permitted
private read caching, include tenant/user/session epoch in app-owned scope and
clear/abort on auth changes. Session/no-store endpoints remain uncached. Do not
claim it automatically clears the separate router page-data cache.

Retry only safe operations. `withRequestRetry` and declarative retries exclude
AbortError/aborted contexts, stop waiting on abort and clean up listeners/timers.
Pass the existing context signal into the transport; do not add another
controller for every retry. Middleware cannot proceed into another operation
after cancellation. Cancellation fences late success, not accepted server
writes or state applied before a callback. Resolve uncertain writes through
backend status/idempotency rather than blindly repeating them.

Before using a directive:

1. Find it in `SYNTAX_REFERENCE.md`.
2. Confirm its status in `FEATURE_INVENTORY.md`.
3. Check the current project for an established equivalent.
4. Run `npm run build` so the compiler validates templates.
5. Run project tests and, for framework work, the repository checks.

Use `vd doctor` for static project diagnostics. Use `vd inspect`, `vd routes`,
or `vd graph` when structure is unclear. These commands analyze local project
files and do not add runtime features.

Use `vd inspect css` for route ownership, repeated declarations, possible dead
selectors, and logical-property advice. Use `vd inspect assets` for local file
hashes/references, image dimensions, responsive markup, and possible LCP hints.
Review advisory findings before editing because dynamic names, URLs, and visual
position are not statically provable.

Use `vd check --json` for one non-destructive summary of the static gates. Its
browser step is deliberately `not-run`; execute real project E2E tests when
browser evidence is required.

Use `vd test` only as a thin entry point to the project's real package scripts.
Select `unit`, `browser`, `compiler`, `route`, `request`, `component`, or
`a11y` when that focused script exists. A missing layer is untested, not a pass.
For small fixtures, import compiler, route, request-mock, interaction,
accessibility-smoke, and mount helpers from `velodom/testing`.

For localized apps, keep dictionaries in application source and use
`definePluralMessage()` only for plural leaves. Pass primitive `{name}` values
to `t()` and counts to `plural()`; do not invent an i18n directive or full ICU
syntax. `vd i18n extract|check` is static and cannot prove dynamic configs.
The optional direction plugin exposes one controller as `ctx.direction` in
both page and component hooks and `$direction` in templates. Guard component
code when the plugin is optional; do not create a second document-direction
store merely because the control lives in a component.

Run `vd fix` without flags and review the file/line preview. Use `--write` only
for the built-in preferred-directive alias migration; it intentionally leaves
scripts, business logic, and unknown syntax unchanged.

Before changing installed optional features, run `vd features`. Use
`vd remove` only when ownership is clean and reversible; never bypass a hash
refusal. `vd upgrade` is for first-party generated files, while presets are
data-only feature choices and not general code templates.

Treat PWA support as an explicit build choice. Import it from `velodom/pwa`,
keep the manifest, offline page, and cache policy application-owned, and never
add a service worker to an unrequested project. Prefer network-only navigation
and same-origin asset caching; do not cache API/auth responses without a
reviewed application policy. Use `--pwa` or `vd add pwa` for the supported
starter shape.

Treat advanced doctor checks as proof-driven. Declare component props through a
`ComponentInitContext<Props>` interface/type when exact prop diagnostics are
valuable; VeloDom deliberately skips dynamic `vd-props` and control-flow guesses.

Use `vd explain <file|topic|diagnostic-code>` for deterministic local
explanations. Prefer the stable `code`, `category`, `location`, and `suggestion`
fields from `vd doctor --json` over parsing human messages. Use
`vd lab --check` before `vd lab` when a visual, read-only view of mounted
routes, components, state, bindings, events, requests, or compiler metadata
would help. Lab is optional; do not add it to production code or assume it can
mutate application state or source. Its ownership, diff, request, route, and
compiler/source views are read-only and deliberately omit network payloads.

Application `errorBoundary` callbacks receive `context.diagnostic`, a
`VeloDomErrorReport` with a stable ID, owner group, bounded normalized source
stack, and hierarchical ownership. Use this record for logging or display, but
keep fallback/retry decisions in the application. A custom development host
may explicitly mount `mountVeloDomErrorOverlay` from `velodom/devtools`; never
add it to a production entry or treat it as the recovery boundary.

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

For a small application-owned plugin, prefer a plain setup function. Use an
optional manifest only for a reusable integration that needs compatibility,
host-capability, or conflict metadata. The public fields are `name`, exact
`version`, `velodom`, `capabilities`, and optional `conflicts`; supported host
capabilities are `browser`, `build`, and `node`. Run
`inspectPluginConformance()` or `assertPluginConformance()` statically. Do not
execute third-party setup while validating it, fetch remote catalogs, or infer
that conformance means security approval.

## Choose Canonical Versus Legacy Syntax

- Write `vd-*`; accept existing `data-vd-*` only as compatibility syntax.
- Write `vd-auto-state`; preserve `vd-request-state` only in existing code when
  a migration is not part of the request.
- Address nested components with `name="folder/component"`.
- Pass literal component strings with `vd-prop-*`. Pass dynamic values with a
  single `vd-props` object; a value such as
  `vd-prop-title="posts[0].title"` is literal text, not an expression.
- A component may own `vd-for`; pass the current item through `vd-props` and
  use an expression such as `vd-key="post.id"` when identity matters.
- Keep each `vd-key` unique and stable. Reordering the same item objects reuses
  their DOM/component instances; replacing an object or using ambiguous keys
  intentionally takes the safe remount path.
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

Treat `src/api` as browser-owned request organization, not hidden server code.
Generate a separate backend boundary for credentials, session/CSRF enforcement,
tenant/resource authorization, authoritative business totals, and sensitive
state transitions. Do not add payment credentials to a VeloDom client or retry
non-idempotent writes without an explicit server contract.

## Completion Checklist

- syntax is listed in the canonical reference
- imports use public package entry points
- folder ownership remains clear
- Vanilla/TypeScript choice is preserved
- semantic HTML and accessibility are maintained
- request UI covers loading, error, and empty outcomes
- page config includes relevant SEO
- compiler/build/tests pass
