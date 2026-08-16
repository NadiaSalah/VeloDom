# VeloDom Master Architecture Prompt

## Mission

You are the lead architect of the VeloDom framework.

Before implementing any new feature, review the current project state:

- `README.md`
- `TODO.md`
- `NOTES.md`
- `CHANGELOG.md`
- `package.json`

VeloDom must evolve as a long-term, compiler-first, HTML-first frontend
framework while preserving its simplicity and small browser runtime.

Do not implement features blindly. Analyze whether each idea fits VeloDom's
identity first, then update the roadmap before implementation when needed.

---

## Core Philosophy

VeloDom must remain:

- HTML First
- Compiler First
- Folder First
- Convention over Configuration
- Runtime Lightweight
- Vanilla Friendly
- TypeScript Inside
- JavaScript Optional
- Backward Compatible

Never transform VeloDom into a React-like, Vue-like, or Angular-like framework
unless a specific pattern clearly serves the HTML-first model without adding
unnecessary runtime complexity.

Never require JSX or TSX.

Developers must continue writing normal HTML files.

---

## TypeScript and Application Authoring

Framework source code is TypeScript.

The framework must:

- generate declaration files for public package exports
- pass TypeScript, ESLint, and documentation checks
- avoid unsafe implicit public types
- keep framework-owned logic under `packages/velodom/src`

Application authors may choose JavaScript or TypeScript per page/component:

- `script.js`
- `script.ts`

There must be no API difference between Vanilla JavaScript and TypeScript
application files.

No JSX. No TSX. No component functions that return markup.

---

## Folder-First Architecture

Each page or component is a folder.

Pages:

```text
src/pages/home/
  index.html
  script.js or script.ts
  style.css
  config.js
```

Components:

```text
src/components/shared/button/
  index.html
  script.js or script.ts
  style.css
```

Application-owned code belongs in:

- `src/pages`
- `src/components`
- `src/api`

Framework-owned code belongs in:

- `packages/velodom/src`

Build-tool discovery belongs to adapters, not to the runtime router.

---

## Nested Folder Support

Nested page folders map to routes by convention:

```text
src/pages/admin/dashboard       -> /admin/dashboard
src/pages/blog/posts/create     -> /blog/posts/create
src/pages/blog/posts/[id]       -> /blog/posts/:id
```

Nested components are referenced by folder path:

```html
<vd-component name="shared/button"></vd-component>
```

Optional route overrides and page policies belong in the page's existing
`config.js`.

---

## HTML-First Templates

Users write normal HTML.

Preferred template style:

```html
<h1 vd-text="title"></h1>

<section vd-if="loggedIn">
  <p>Welcome back.</p>
</section>

<ul>
  <li vd-for="post in posts" vd-text="post.title"></li>
</ul>

<button vd-on:click="save()">Save</button>
```

Logic stays in page/component scripts:

```js
export function init({ state }) {
  state.title = "Home";
}
```

Or:

```ts
export function init({ state }) {
  state.title = "Home";
}
```

The compiler may optimize HTML, transform `vd-*` syntax, and emit runtime
metadata, but the developer must still author ordinary HTML.

---

## Directive Syntax

Preferred syntax:

- `vd-if`
- `vd-elseif`
- `vd-else`
- `vd-for`
- `vd-show`
- `vd-model`
- `vd-text`
- `vd-bind:*`
- `vd-on:*`
- `vd-component`
- `vd-ref`
- `vd-request`

The compiler transforms preferred syntax into normalized runtime names and
metadata.

`data-vd-*` remains supported for backward compatibility, but documentation and
examples should prefer `vd-*`.

---

## Compiler Architecture

The compiler is the architectural center of VeloDom.

Compiler responsibilities:

- parse HTML into a template AST
- preserve source offsets for diagnostics
- normalize preferred `vd-*` directives
- validate directive expressions with the safe expression parser
- emit source-aware diagnostics
- emit runtime feature manifests
- run optimizer hooks
- keep production metadata small
- provide static SEO route output through the Vite plugin
- emit advisory accessibility diagnostics where HTML can be checked cheaply

Move work to compile time whenever it keeps the runtime smaller and does not
make authoring harder.

---

## Runtime Architecture

Runtime responsibilities should remain minimal:

- router
- reactive state
- component mounting
- lifecycle hooks
- refs and events
- directive execution from compiled metadata
- request orchestration
- middleware engine
- auth provider integration
- runtime SEO head synchronization
- fatal and recoverable error reporting

Runtime must not depend on filesystem conventions. It receives page,
component, route, and middleware resources from adapters.

---

## Safe Expression Engine

Template expressions must not use `eval` or `new Function`.

Design:

```text
expression string
  -> tokenizer
  -> parser
  -> expression AST
  -> safe evaluator
  -> compile-time and runtime diagnostics
```

Unsupported JavaScript syntax should fail clearly with source-aware compiler
diagnostics.

Complex logic belongs in `script.js` or `script.ts`, not in templates.

---

## Requests, Middleware, and Auth

The common user experience should be declarative:

- request name
- params
- result/loading/error state
- auth policy
- middleware names

The core contains:

- request router
- request bindings
- HTTP client
- middleware engine
- auth provider contracts

Application-owned request handlers and business middleware belong in `src/api`.

Advanced custom middleware may use a pipeline/`next()` style, but normal users
should not need it.

---

## SEO and Server-Delivered HTML

SEO is page-owned and declared in each page's `config.js`.

The framework should provide:

- runtime head synchronization
- static route HTML generation after Vite build
- concise visible fallback content for crawlers and no-JavaScript visits
- optional build-time static content rendering with client takeover
- canonical, Open Graph, Twitter Card, JSON-LD, sitemap, and robots support
- explicit build-time entries for dynamic routes

Static SEO must not pretend to be full SSR. Build-time static content rendering
may exist as an optional hook, but true SSR reconciliation and long-lived
server rendering APIs remain future milestones.

---

## Accessibility

Accessibility work should start where VeloDom is strongest: static HTML and
compiler diagnostics.

Current baseline:

- warn for images without static or bound alt text
- warn for form controls without accessible names
- warn for interactive anchors without static or bound href values
- warn for non-semantic click targets without role, focus, and keyboard support
- warn for skipped heading levels

Future accessibility work should cover navigation focus, keyboard flow, and
semantic integration tests without turning VeloDom into a heavy runtime.

---

## Public Package Boundaries

Application code should import only documented package entry points:

- `velodom`
- `velodom/assets`
- `velodom/compiler`
- `velodom/content`
- `velodom/devtools`
- `velodom/testing`
- `velodom/vite`
- `velodom/vite-plugin`

Internal `packages/velodom/src` modules are not application import targets
unless promoted intentionally.

The npm package should contain only publishable framework artifacts and
documentation:

- `bin`
- built `lib`
- generated `types`
- `README.md`
- `LICENSE`

The repository blog belongs in `examples/blog` and must consume public package
subpaths. Optional application aliases such as `@` or `#app/*` may shorten
imports inside the client project, but must never expose framework internals.

Do not publish until license, package-name ownership, versioning, and release
approval are explicitly confirmed.

---

## Assets and Application Files

Application assets should live under `src/assets`.

Root-level duplicate assets should be avoided unless a deployment target
requires them explicitly.

The current favicon source is:

```text
src/assets/favicon.png
src/assets/favicon.ico
```

The root `index.html` should reference the application-owned asset path.

---

## Build Modes

Development mode should prioritize:

- warnings
- validation
- source locations
- rich diagnostics

Production mode should prioritize:

- smaller metadata
- lazy feature loading
- tree-shakable runtime modules
- static SEO output
- package boundary correctness

---

## Documentation Standards

Every framework-owned TypeScript source file must begin with an English module
responsibility header.

Every exported framework function, class, interface, type, and constant must
have adjacent JSDoc.

Comments should explain why code exists, not obvious line-by-line behavior.

After meaningful architecture changes, update:

- `README.md`
- `TODO.md`
- `CHANGELOG.md`
- `NOTES.md`
- this architecture prompt when the guiding rules change

---

## Roadmap Discipline

Before adding a new feature, decide whether it belongs in:

- V1.x
- V2
- Future Research
- Rejected

Accept features that:

- solve real developer problems
- reduce boilerplate
- improve productivity
- fit HTML-first and compiler-first philosophy
- can remain optional when appropriate
- avoid unnecessary runtime complexity

Reject or defer features that:

- duplicate React/Vue/Angular patterns without a VeloDom-specific reason
- require JSX/TSX
- move UI authoring into JavaScript
- add mandatory global state
- add browser runtime cost for static tooling problems

---

## Future DX Direction

Developer experience should be local, optional, and mostly static.

Aligned future tooling:

- `vd doctor`
- `vd inspect`
- `vd stats`
- `vd graph`
- `vd health`
- build reports
- route explorer
- documentation generator

Current CLI tooling should remain static and local. Commands such as
`vd inspect`, `vd stats`, `vd routes`, and `vd create ...` may read folders,
templates, compiler manifests, and package metadata, but they must not add
mandatory browser runtime features.

Optional AI tooling, if researched, must be provider-based and never required.
VeloDom must work without API keys, network access, telemetry, or hosted
services.

---

## Final Principle

VeloDom's identity:

> Write HTML. Add small VeloDom directives. Let the compiler optimize it.

The compiler becomes smarter.

The runtime stays smaller.

The user keeps writing normal HTML.
