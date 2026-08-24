# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework for lightweight,
folder-first web applications. Framework internals are written in TypeScript;
application authors may use Vanilla JavaScript or TypeScript without changing
the authoring model.

The full framework guide, installation instructions, API examples,
architecture, release notes, and roadmap are in
[docs/README.md](docs/README.md).
The maintained documentation surface is intentionally small: the guide plus
`docs/AI_CONTEXT.md`, `docs/TODO.md`, `docs/CHANGELOG.md`, `docs/NOTES.md`, and
`docs/RELEASING.md`. AI assistants should start with
[docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) before generating application code.

For the publishable package, see
[packages/velodom](packages/velodom/README.md). The repository's working
application is the VeloDom documentation blog in `examples/blog`.

## Technology

- TypeScript framework source and generated ESM declarations
- Vite compiler/build integration
- ESLint and Node.js tests
- Tailwind CSS and daisyUI in the example application only
- Playwright-based real-browser verification

## Run the Workspace

```bash
npm install
npm run dev
```

Useful verification commands:

```bash
npm test
npm run check
npm run build
npm run pack:check
```

## Repository Structure

```text
packages/velodom/         Publishable framework package
packages/velodom-vscode/  Optional private VS Code language-tools package
examples/blog/            Real application consuming public package exports
tools/                    Repository tests and release/build verification
docs/                     Guide, architecture, decisions, roadmap, and history
```

Generated dependencies and build artifacts (`node_modules`, `lib`, `types`,
and `dist`) are intentionally ignored by Git and recreated through npm scripts.
They are not application source and are not published unless explicitly
allowlisted by `packages/velodom/package.json`.

## Current Status

V1 is verified with 255 automated tests, package-consumer and tarball
validation, a production build within its performance budgets, a 100/100
example-project health report, and a successful GitHub Actions matrix across
Chromium, Firefox, WebKit, and Mobile WebKit. VeloDom `1.0.0` is now published
on npm under the authenticated `engnadia` account with write-level 2FA. The
roadmap is [docs/TODO.md](docs/TODO.md); the remaining work is optional
post-publication tooling and research.
Optional
Hybrid rendering, islands, richer DevTools, and streaming/Edge adapters remain
deliberately planned or deferred rather than being folded into the V1 runtime.
The roadmap records smaller authoring-ergonomics improvements without adopting
a second template syntax. `vd create feature <name>` offers an optional
`--blog` vertical-slice template, and a nested default export such as
`src/api/posts/get.js` is now available as the request name `posts.get`.
Explicit `src/api/routes.js` remains the advanced, higher-priority route map.
Likewise, `src/api/middleware/auth.js` supplies middleware as `auth` unless an
explicit `src/api/middleware.js` registry is present.
Pages and components can now export a small plain `state` object before their
optional lifecycle `init()`, including concise state-only `count++` bindings.
Focused `vd create page <name> --demo <kind>` templates now teach static,
counter, request, form, and SEO behavior without generating unnecessary files.
The optional `velodom/localization` subpath now infers TypeScript translation
keys, can generate an application-owned key declaration, formats values through
native `Intl`, preserves query/hash values when changing locale paths, and
emits localized canonical plus `hreflang` SEO records without a translation
provider.

The npm package has a strict `files` allowlist, explicit public exports,
package-consumer tests, and a dry-run tarball check. Version `1.0.0` is
published at [npmjs.com/package/velodom](https://www.npmjs.com/package/velodom).

The V1 roadmap groups implemented production capabilities together: static
prerendering, conventional page data loading with optional public-data
cache/revalidation, build-time localization, typed build-time content loading,
an optional Node request bridge, progressive native forms, generated
application declarations, derived state, and editor tooling. Hybrid rendering
and partial hydration remain planned only behind explicit architecture and
browser-validation gates. Localization DX includes typed keys, native `Intl`
formatting, locale-aware links, and static `hreflang` output without requiring
a browser translation provider. See
[docs/TODO.md](docs/TODO.md) for the complete rationale and order.

## Completed Organization Work

- Consolidated reusable framework code under `packages/velodom`.
- Kept application-owned pages, components, layouts, APIs, and assets in the
  independent example project.
- Moved repository-only tests, fixtures, and scripts under `tools`.
- Made framework builds self-contained inside the npm package workspace.
- Registered stable optional VS Code language tools as a private workspace
  consumer pending Marketplace publisher ownership.
- Added npm metadata and automated package-boundary checks.
- Consolidated specialized documentation into the main guide and four focused
  operational files without dropping architecture or release details.
- Extended documentation checks to verify public exports, CLI examples, private
  import boundaries, and the consolidated documentation layout.
- Added root `AGENTS.md`, the machine-oriented [AI context](docs/AI_CONTEXT.md),
  and an application guide at `examples/blog/README.md` so AI-generated sites
  can follow the same public contract and Core/application boundary.
- Regenerated the npm lockfile with the Node 22/npm 10 toolchain used in GitHub
  Actions, preserving Linux optional WASI peer metadata so `npm ci` remains
  reproducible; local npm caches are ignored.
- Updated the browser-matrix workflow to `actions/checkout@v5` and
  `actions/setup-node@v5`, removing the Node 20 deprecation warning on runners.
- Made the application-owned documentation sidebars resilient to browser-specific
  `IntersectionObserver` timing through a scroll fallback, and made browser
  smoke-test failures identify the exact route step and visible page state.
- Corrected the no-JavaScript SEO smoke test so it inspects prerendered DOM
  text without calling page-side JavaScript, which Chromium and Firefox disable
  by design.
- Enabled named browser-test stages in the release workflow logs, making it
  clear when an Actions rerun is using the current test harness and where any
  future browser-specific failure occurs.
- Restored the observable `hashchange` contract for intercepted same-page
  `vd-nav` links. The router still uses history and scrolls without reloading,
  while route-aware tabs and other application listeners now update reliably
  after navigation in Chromium, Firefox, and WebKit.
- Made the hash event fallback carry the same `oldURL` and `newURL` contract in
  limited DOM environments, and added regression coverage for that behavior.
- Strengthened framework TypeScript checks for unused code, unchecked indexed
  access, implicit return paths, and accidental `switch` fallthrough. Ambiguous
  early exits now return explicitly.
- Corrected project-intelligence output: state keys are unique per owner, and
  optional runtime features not requested by templates are reported as lazy
  availability rather than as application dead-code debt.
- Static SEO output now waits for Vite to write the HTML shell before it
  renders route artifacts, including with the current Vite/Rolldown lifecycle.
- Rebuilt `examples/blog` as the polished VeloDom academic reference: a modern
  documentation application with a structured learning path, live directive
  demonstrations, dynamic study notes, and literal `<pre><code>` examples that
  are safe from template compilation through `vd-pre`.
- Corrected the reference sidebar to use app-relative hash URLs such as
  `/features#architecture`, so `vd-nav` performs same-page scrolling without
  unsupported-target warnings.
- Expanded the academic reference with dedicated, copyable lessons for file
  API routes, middleware, provider-based authentication, public-data caching
  and retries, RTL direction, native lazy images, responsive asset helpers,
  and their explicit production boundaries.
- Added a dedicated `/reference` route to the academic application. It catalogs
  every supported package boundary, all 61 public runtime/build values, the 43
  preferred directive names, and the 12 CLI commands with copyable examples.
- Extended documentation consistency checks to derive public value exports,
  preferred directives, and CLI commands directly from framework source. The
  canonical guide now fails verification when a public capability is omitted.
- Corrected project intelligence so literal examples inside `vd-pre` remain
  available to the compiler but are excluded from dead-code, reference, event,
  and directive analysis. This removed false `vd doctor` warnings from
  documentation applications.
- Removed five obsolete, unreferenced showcase components after confirming
  that no routed page or live component used them. The example now reports no
  doctor issues, 100/100 health, and SEO configuration for all six pages.
- Replaced the documentation application's temporary `VD` text marks with the
  application-owned VeloDom logo asset in its shared navigation and footer.
- Added a native, keyboard-accessible compact navigation menu below the wide
  desktop breakpoint so documentation links remain available on small desktop
  and tablet screens.
- Reorganized the showcase navigation into page-level tabs only: Learn, Guides,
  API, and Single-file. Detailed Requests, Tooling, and other lessons remain in
  the feature sidebar, preventing duplicate top-level links and hash-based tabs.
- Made the feature sidebar stateful and accessible: the URL hash, clicked lesson,
  and currently visible section now select the same active tab, with
  `aria-current` and keyboard focus styling.
- Reused the same application-owned active-section helper on the exhaustive
  `/reference` catalog, so guided lessons and public API sections share one
  consistent navigation behavior without adding UI logic to the framework core.
- Reworked that helper around the router's `hashchange` contract and a
  scroll-idle lock, removing duplicate click handling and the WebKit smooth-
  scroll race. Desktop and mobile WebKit now pass the complete browser suite.
- Simplified the example home page with an exported shallow state seed and a
  dedicated application content module; `init()` now contains only async work.
- Removed the unused Tailwind v3-era config and redundant root styling
  dependencies. Tailwind v4 and daisyUI remain owned by the example workspace.
- Removed the unreferenced 270 kB ICO duplicate; the optimized PNG remains the
  single application logo/favicon source used by the shell and shared UI.
- Increased compact-menu contrast and added an open-state treatment so the
  navigation icon remains clear on tablet and small-desktop widths.
- Added route-aware active states to the shared primary navigation. Learn,
  Guides, API, and Single-file now expose the selected route with
  `aria-current="page"` on both wide and compact menus.
- Re-audited the public feature surface against framework source: documentation
  still covers all 11 package exports, 61 public values, 43 preferred
  directives, and 12 CLI commands. The example guide now also groups page
  data, prefetch, compiler safety diagnostics, and recoverable boundaries in a
  dedicated quality lesson.
- Deferred showcase sidebar viewport observation until router hash restoration
  completes, preventing direct lesson links from momentarily selecting the
  preceding tab.

## Next Tasks

- The default npm-installable starter preset is available through
  `npx --yes --package velodom create-velodom <name>`.
- Continue only the optional items recorded in [docs/TODO.md](docs/TODO.md).

## Handoff Notes

- Do not move user application files into the framework package.
- Do not import private paths such as `velodom/lib/*`; use documented exports.
- Do not delete `packages/velodom/lib` or `packages/velodom/types` merely to
  clean the tree. They are ignored, generated local outputs used for testing.
- Do not republish, retag, or change package access without explicit owner
  approval for the exact release operation.
- Update this file, `docs/TODO.md`, `docs/CHANGELOG.md`, and relevant decisions
  after architecture or release-readiness changes.
