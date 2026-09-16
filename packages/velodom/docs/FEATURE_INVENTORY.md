# VeloDom Feature Inventory

Status reflects package version 1.0.0 implementation, public exports, and the
repository test suite. `Stable` is a public V1 contract; `Supported` is
implemented but optional/specialized; `Partial` names a deliberate boundary;
`Legacy` exists for compatibility. A feature not listed here must be verified
before use.

| Feature | Category | Status | Primary syntax or import | Alternatives | Public API | Tested |
| --- | --- | --- | --- | --- | --- | --- |
| Folder pages | Authoring | Stable | `src/pages/x/index.html` | `.vd` page | Vite adapter | Yes |
| Dynamic routes | Routing | Stable | `src/pages/posts/[id]/` | static `path` config | router context | Yes |
| One-file pages | Authoring | Stable | `src/pages/about.vd` | lazy runtime + build-extracted config | Vite plugin | Yes |
| Folder components | Components | Stable | `src/components/x/index.html` | `.vd` component | adapter | Yes |
| Nested components | Components | Stable | `name="blog/post-card"` | split path compatibility | adapter | Yes |
| One-file components | Components | Stable | `src/components/badge.vd` | folder component | Vite plugin | Yes |
| Layouts | Authoring | Stable | `src/layouts/default.vd` | folder layout | adapter | Yes |
| Text binding | Directives | Stable | `{{ value }}`, `vd-text` | `data-vd-text` legacy | compiler/runtime | Yes |
| Literal interpolation | Directives | Stable | `\{{ value }}`, `vd-pre` | none | compiler | Yes |
| Conditions | Directives | Stable | `vd-if/elseif/else` | `data-vd-*` legacy | compiler/runtime | Yes |
| Visibility | Directives | Stable | `vd-show` | `data-vd-show` legacy | compiler/runtime | Yes |
| Lists | Directives | Stable | `vd-for`, stable `vd-key` reconciliation | `$index`, conservative unkeyed rebuild | compiler/runtime | Yes |
| Components in lists | Components | Stable | `vd-component` + `vd-for` + `vd-props` | nested scopes, keyed state preservation | component runtime | Yes |
| Two-way model | Directives | Stable | `vd-model` | `data-vd-model` legacy | compiler/runtime | Yes |
| Bindings | Directives | Stable | `vd-bind:*` | target shorthands | compiler/runtime | Yes |
| Class/style/attr maps | Directives | Stable | `vd-class/style/attr` | `vd-bind:*` | compiler/runtime | Yes |
| DOM events | Directives | Stable | `vd-on:event` | modifiers | compiler/runtime | Yes |
| Element refs | Lifecycle | Stable | `vd-ref` | grouped/keyed refs | lifecycle context | Yes |
| Component props | Components | Stable | `vd-prop-*`, `vd-props` | none | component context | Yes |
| Component expose | Components | Stable | `init` expose result | refs | component context | Yes |
| Named children/slots | Components | Stable | `vd-child/get-child` | default child | component runtime | Yes |
| Scoped styles | Styling | Stable | resource `style.css` / `<style>` | global imported CSS | Vite adapter | Yes |
| Client routing | Routing | Stable | `vd-nav` | `app.navigate()` | `createApp` | Yes |
| Params/query/meta | Routing | Stable | `ctx.params/query/meta` | route object | public contexts | Yes |
| Same-route hash navigation | Routing | Stable | `/path#section` + `vd-nav` | native external link | router | Yes |
| Scroll/focus restoration | Routing | Stable | automatic | `data-vd-focus` | router | Yes |
| Route prefetch | Routing | Supported | `vd-prefetch` | none | router | Yes |
| Global/page guards | Routing | Stable | `beforeEach`, `beforeEnter` | async arrays | public guard types | Yes |
| Page data loader | Data | Stable | page `data.js|ts` | direct app request | public loader types | Yes |
| Page data cache policy | Data | Supported | `maxAgeMs`, SWR | none | cache policy type | Yes |
| File request routes | Requests | Stable | `src/api/**` | route registry | Vite adapter | Yes |
| Declarative requests | Requests | Stable | `vd-request` family | direct `requestJson` | request APIs | Yes |
| Request middleware | Requests | Stable | `src/api/middleware.js` | inline function | middleware APIs | Yes |
| Request auth providers | Auth | Stable | app provider registry | server/local demo providers | auth APIs | Yes |
| Request cache/retry | Requests | Supported | helper wrappers | route middleware | public helpers | Yes |
| Native form requests | Forms | Stable | `vd-form` | ordinary submit handler | request runtime | Yes |
| Validation plugin | Forms | Supported | `vd-validate` | browser constraints | `createValidationPlugin` | Yes |
| Progressive forms | Forms | Supported | plugin opt-in | normal client request | public plugin | Yes |
| Shared state | State | Supported | `createSharedState` | page-local state | public helper | Yes |
| Computed/effect/watch | State | Supported | functions from `velodom` | direct state | public helpers | Yes |
| Plugin system | Extension | Stable | `definePlugin` / `createPluginManager` | simple function plugin or optional static compatibility/capability/conflict manifest | public APIs | Yes |
| Plugin conformance | Extension | Supported | `inspectPluginConformance` / `assertPluginConformance` | shape-only diagnostics; no marketplace or third-party execution | public APIs | Yes |
| Structured error diagnosis | Resilience | Stable | app error handler, optional `velodom/devtools` overlay | stable IDs, grouped bounded source stacks, hierarchical ownership | public types + devtools helper | Yes |
| Error boundary hook | Resilience | Stable | app error handler | application-owned fallback/retry UI | public types | Yes |
| SEO metadata | Build | Stable | page `seo` config | dynamic entries | Vite plugin | Yes |
| Static SEO route output | Build | Stable | SEO entries/prerender | summary shell | Vite plugin | Yes |
| Sitemap/robots output | Build | Stable | SEO build config | custom hosting files | Vite plugin | Yes |
| Content collections | Build | Supported | `velodom/content` | external loader | content APIs | Yes |
| Localization helpers | i18n | Supported | `velodom/localization` | nested keys, explicit plurals, parameters, locale paths/SEO, static key checks | localization APIs + `vd i18n` | Yes |
| Direction/RTL helpers | i18n | Supported | direction plugin, `vd-rtl-flip` | project CSS | public helpers | Yes |
| Node Request adapter | Server | Supported | `velodom/node` | custom server adapter | `createNodeRequestAdapter` | Yes |
| Full automatic SSR | Server | Partial | page-owned static renderer | Node request adapter | no universal SSR runtime | Boundary tested |
| Hydration | Server | Partial | explicit static-content policy | client takeover | SEO renderer | Boundary tested |
| Asset inspection | Build | Supported | `velodom/assets`, `vd inspect assets` | metadata helpers plus duplicate/usage/dimension/responsive/LCP advice | public helpers + package binary | Yes |
| CSS build intelligence | DX | Supported | `vd inspect css` | route attribution, repeated declarations, possible unused selectors, logical-property advice | package binary | Yes |
| Optional PWA build | Build | Supported | `velodom/pwa`, `--pwa`, `vd add pwa` | static manifest validation, bounded cache policies, explicit offline fallback/registration | public build API + scaffolder | Yes |
| Devtools inspector | DX | Supported | `velodom/devtools` | read-only inspector and grouped error overlay | public helper | Yes |
| VeloDom Lab | DX | Experimental | `vd lab`, optional `--lab` starter choice | ownership tree, state diffs, request waterfall, route timeline, source diagnostics | `velodom/devtools`, Vite plugin | Yes |
| Deterministic explain | DX | Supported | `vd explain <file|topic|diagnostic-code>` | compiler analysis and stable diagnostic catalog | package binary | Yes |
| Testing helpers | Testing | Stable | `velodom/testing` | compiler/route/request/event/a11y fixtures plus page/component mounts | public helpers | Yes |
| Project test dispatcher | DX | Supported | `vd test [layer]` | existing application package scripts only | package binary | Yes |
| Release compatibility matrix | Testing | Stable | repository gates | six starter/language builds, bundle ceilings, desktop/mobile browser engines | package consumer + Playwright | Yes |
| Compiler API | Compiler | Stable | `velodom/compiler` | Vite plugin | public compiler | Yes |
| Incremental compiler cache | Build | Supported | automatic Vite plugin behavior | source/HMR invalidation, bounded LRU | Vite plugin | Yes |
| Language analysis | Editor | Supported | compiler analysis APIs | VS Code package | public APIs | Yes |
| Feature-based project scaffolding | DX | Stable | `npm create velodom`, `vd create` | Minimal/Blog/Empty, scriptable flags | `velodom/cli`, `velodom/scaffolder` | Yes |
| Project intelligence | DX | Supported | `vd doctor/inspect/...` | build-time Project Index, categorized source diagnostics, and Rollup-metadata build attribution | package binary | Yes |
| Static check composition | DX | Supported | `vd check` | existing project diagnostics and in-memory type generation | package binary | Yes |
| Safe syntax fixes | DX | Supported | `vd fix [--write]` | Project Index and fixed alias allowlist | package binary | Yes |
| Type generation | DX | Supported | `vd types` | Project Index routes, requests, static props, and explicit Props contracts | package binary | Yes |
| Optional feature lifecycle | DX | Supported | `vd add/features/remove/upgrade/preset` | hash-guarded generated ownership and data-only presets | package binary | Yes |

## Compatibility Inputs

| Feature | Status | Guidance |
| --- | --- | --- |
| `data-vd-*` authoring | Legacy | Accepted, but prefer `vd-*` in new code. |
| `vd-request-state` | Legacy | Supported alias; prefer `vd-auto-state`. |
| Split `path` addressing | Legacy | Prefer complete component/request names. |

## Explicitly Not Provided

These are not VeloDom 1.0.0 features:

- JSX/TSX rendering or React hooks
- a virtual DOM
- required global state
- Vue/Svelte/Alpine directive syntax
- universal server components
- automatic server authorization
- mandatory AI services
- automatic migration from other frameworks
- invisible business logic inside Core

Roadmap and internal audit documents are repository-owned and intentionally not
shipped as consumer contracts.
