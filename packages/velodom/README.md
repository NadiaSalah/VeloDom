# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework. Pages,
components, layouts, APIs, and styles remain visible as ordinary project files;
the compiler validates small `vd-*` directives and selects the runtime features
the page actually uses.

It is folder-first, convention-over-configuration, runtime-lightweight, and
friendly to both Vanilla JavaScript and optional TypeScript. It does not use
JSX, TSX, a virtual DOM, or a required global store.

## Create a Project

After the first official V1 release makes `velodom` and `create-velodom`
available, npm's conventional interactive entry point will be:

```bash
npm create velodom@latest
```

The `velodom` package also provides this explicit form after release:

```bash
npx --yes --package velodom create-velodom my-app --no-install
cd my-app
npm install
npm run dev
```

Inside the VeloDom repository, use the local package build instead of assuming
registry availability:

```bash
npm run package:build
node packages/velodom/bin/create-velodom.js my-app --no-install
```

Or reuse the same scaffolder from the framework CLI:

```bash
vd create my-app
```

The interactive flow asks for Minimal, Blog, or Empty and then Recommended or
Customize mode. Scripted automation can pass options such as:

```bash
create-velodom my-blog --template blog --typescript --tailwind --i18n --pwa --no-install
```

Optional layers include ESLint, Prettier, official route examples, localization,
an explicit installable PWA build, unit/E2E testing, the local VeloDom Lab
command, Git, dependency installation, and dev-server startup. The generator refuses non-empty destinations and never
edits `node_modules`.

## Smallest Authoring Example

```html
<!-- src/pages/home/index.html -->
<main>
  <h1>{{ title }}</h1>
  <button type="button" vd-on:click="count++">
    Count: {{ count }}
  </button>
</main>
```

```js
// src/pages/home/script.js
export const state = {
  title: "Hello VeloDom",
  count: 0
};
```

```js
// src/pages/home/config.js
export default {
  path: "/",
  seo: {
    title: "Home",
    description: "My VeloDom application."
  }
};
```

```js
// src/main.js
import { mountVeloDom } from "velodom/vite";
import "./style.css";

await mountVeloDom();
```

## Conventions

```text
src/
  pages/          routes: folder mode or optional .vd files
  components/     reusable HTML modules
  layouts/        shared page shells with one <vd-page>
  api/            application request routes and middleware
  assets/         application-owned assets
  main.js         browser bootstrap
```

Folder mode remains the default. Small pages, components, and layouts may use
the optional `.vd` format with `<template>`, `<script>`, `<style>`, and
`<config>` blocks. Both formats compile into the same internal resource model.
Page config is extracted for route discovery while the rest of each `.vd` page
remains a lazy route chunk.

The Vite plugin also reuses unchanged template compilation within its own
development/build process. Source edits and hot updates invalidate affected
entries, retained work is bounded, and no cache API or browser code is added to
applications.

## Documentation Shipped With the Package

- [Quick Start](docs/QUICK_START.md) — verified setup and first edits.
- [Syntax Reference](docs/SYNTAX_REFERENCE.md) — canonical public syntax.
- [Feature Inventory](docs/FEATURE_INVENTORY.md) — implemented feature status.
- [AI Guide](docs/AI_GUIDE.md) — rules for coding assistants.
- [AI Context](AI_CONTEXT.md) — compact machine-oriented project contract.

The longer repository handbook and release notes remain in the
[VeloDom repository](https://github.com/NadiaSalah/VeloDom/tree/main/docs) and
are intentionally not included in the npm tarball.

## Public Package Entry Points

| Import | Purpose |
| --- | --- |
| `velodom` | App, reactive, requests, auth, plugins, and public types |
| `velodom/vite` | Convention adapter and `mountVeloDom()` |
| `velodom/vite-plugin` | Compiler, `.vd`, SEO, and build integration |
| `velodom/compiler` | Standalone compiler and language analysis |
| `velodom/content` | Build-time content collections |
| `velodom/localization` | Optional typed localization helpers |
| `velodom/node` | Optional Node request adapter |
| `velodom/assets` | Build-time image inspection helpers |
| `velodom/pwa` | Opt-in manifest validation and service-worker generation |
| `velodom/devtools` | Optional local inspector, grouped error overlay, and VeloDom Lab UI |
| `velodom/testing` | DOM-oriented page/component test mounts |
| `velodom/cli` | Node-only CLI dispatcher used by package binaries |
| `velodom/scaffolder` | Node-only reusable project creation engine |
| `velodom/package.json` | Package metadata for compatible tooling |

Do not import from `velodom/lib/*` or repository source paths.

## CLI

The `vd` binary provides project scaffolding and static project intelligence:

```text
vd create [project-name] [--template minimal|blog|empty]
vd init [project-name]
vd create page|component|api|demo|feature|middleware|plugin <name>
vd lab [--check]
vd doctor
vd check
vd fix [--write]
vd inspect
vd inspect css|assets
vd explain <file|topic|diagnostic-code>
vd routes
vd graph
vd health
vd stats
vd benchmark
vd build-report
vd docs
vd types
vd add i18n|tests|lab|pwa
vd features
vd remove i18n|tests|lab|pwa|all
vd upgrade i18n|tests|lab|pwa|all
vd preset export|apply
vd test [all|unit|browser|compiler|route|request|component|a11y]
vd i18n extract|check
vd version
```

Use `vd help` for the current options. CLI analysis is local and static; it does
not add browser runtime weight. `vd doctor --json` emits stable diagnostic IDs,
bounded categories, suggestions, and source locations when static analysis can
prove them; `vd explain <code>` documents those IDs offline. `vd check` composes
the available static gates and explicitly reports browser tests as not run.
`vd fix` previews a small syntax-preserving alias allowlist and writes only
after an explicit `--write` flag.
Project-Index doctor checks include app-relative navigation, writable request
targets, explicit typed prop contracts, child `expose` members, and
conservatively unused shallow state without guessing dynamic control flow.
`vd types` preserves route params, request names, static prop keys, and
required/optional facts from explicit `ComponentInitContext<Props>` contracts;
unprovable values remain `unknown` and JavaScript projects need no declarations.
`vd build-report` reads the versioned metadata emitted by the Vite plugin to
attribute initial, route, component, shared, and lazy-feature chunks. Duplicate
dependency cost is shown only from Rollup rendered-module measurements; a
missing production artifact is reported as unavailable rather than guessed.
`vd add i18n|tests|lab|pwa` is an idempotent existing-project installer. It refuses
conflicting user files or scripts, records generated-file ownership in
`.velodom/features.json`, and leaves dependency installation explicit. Tests
default to unit; `--e2e` and `--all` select real Playwright layers.
`vd features` reports clean, missing, modified, and reversible ownership.
`vd remove` deletes only unchanged generated files and restores only exact
controlled mutations; `vd upgrade` rolls back if regeneration fails. Preset
export/apply uses versioned JSON containing allowlisted feature options only.
`vd test` delegates to one real package script already owned by the project.
Focused layers fail when their script is missing; browser accepts
`test:browser` or `test:e2e`, and no filter runs `test`. The explicit
`velodom/testing` subpath provides compiler fixtures, route resolution,
recorded request doubles, DOM event dispatch, accessibility smoke diagnostics,
and page/component mounts without adding production runtime code.
`velodom/localization` supports nested typed keys, explicit plural leaves,
named primitive interpolation, locale-direction validation, key extraction,
and editor completion records. `vd i18n extract|check` reads only static project
source; it never imports localization modules or adds a browser translation
store.
`vd inspect css|assets` adds read-only build intelligence for stylesheet route
ownership, duplicate declarations, possible unused selectors, logical CSS,
asset hashes/references, image dimensions, responsive markup, and possible LCP
candidates. Dynamic usage remains advisory, and the command never transforms
or deletes an application file.

`velodom/pwa` is an optional build-only entry point. `definePwaManifest()`
reports stable installability diagnostics, while `velodomPwa()` emits a web
manifest and—only when `serviceWorker` is explicitly configured—a generated
worker, offline fallback, and external registration module. Cache rules use a
small declarative matcher/strategy allowlist; application request/auth data is
never cached implicitly. Use `--pwa` during creation or `vd add pwa` later.

Runtime failures expose a stable `VeloDomErrorReport` to an application
`errorBoundary`. It contains an error ID, subsystem group, normalized bounded
source frames, and application ownership such as page/component/request.
Recovery stays application-owned. For a custom development host only, mount an
observational overlay explicitly:

```js
import { mountVeloDomErrorOverlay } from "velodom/devtools";

const errors = mountVeloDomErrorOverlay({ limit: 25 });
// errors.clear(); errors.destroy();
```

The overlay is not mounted by normal runtime imports, retains no network
payloads, and provides no retry or state-mutation controls.

Small application plugins still need only a setup function or `{ setup,
cleanup }`. Published integrations may add an optional static `manifest` with
an exact plugin version, a VeloDom compatibility range, explicit
`browser`/`build`/`node` capabilities, and named conflicts. Use
`inspectPluginConformance()` for a diagnostic report or
`assertPluginConformance()` for a throwing test assertion. Neither function
executes plugin code, and VeloDom provides no marketplace or remote discovery.

Choose `--lab` during scripted project creation or select it in Customize mode
to add `npm run lab`. The command starts the existing Vite server with an
experimental read-only panel for routes, mounted components, state, bindings,
recent state diffs, request waterfall, correlated route events, and compiler
directive/source diagnostics. Lab is development-only and absent
from normal production output; `--no-lab` adds nothing.

Repository release verification generates and builds Minimal, Blog, and Empty
starters in both JavaScript and TypeScript, including the full
Tailwind/localization/PWA/testing composition. Each generated build has total
and largest-chunk ceilings. The strict browser matrix covers desktop/mobile
Chromium, Firefox, and desktop/mobile WebKit and fails on unexpected browser
errors; these are repository gates, not code shipped into an application.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- Vite `>=6 <9` for the Vite integration
- TypeScript `>=5.7` only when typed authoring/builds are desired

Vite and TypeScript are optional peer dependencies so non-Vite adapters and
Vanilla JavaScript applications are not forced to install unused tooling.

## License

MIT © [Nadia Salah](https://github.com/NadiaSalah)
