# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework for lightweight,
folder-first web applications. Framework internals are written in TypeScript;
application authors may use Vanilla JavaScript or TypeScript without changing
the authoring model.

The full framework guide, installation instructions, API examples,
architecture, release notes, and roadmap are in
[docs/README.md](docs/README.md).
The maintained documentation surface is intentionally small: the guide plus
`docs/TODO.md`, `docs/CHANGELOG.md`, `docs/NOTES.md`, and `docs/RELEASING.md`.

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

V1 is locally verified with 255 automated tests, package-consumer validation,
and production build checks. The roadmap is [docs/TODO.md](docs/TODO.md);
remaining V1 release work is external governance, a strict Firefox-capable
browser run, and starter presets that require the public npm path. Optional
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
package-consumer tests, and a dry-run tarball check. It intentionally keeps
`private: true`; this prevents accidental publication until the npm account,
name ownership, 2FA policy, version, and release approval are confirmed.

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

## Next Tasks

- Complete the strict Firefox/WebKit matrix on a graphics-capable CI/release
  machine. Local Chromium, WebKit desktop, and Mobile WebKit pass; the local
  Firefox SWGL compositor cannot map its headless framebuffer. The committed
  GitHub Actions browser-matrix workflow is ready to provide this gate after
  the repository is pushed.
- Sign in to the approved npm owner account, confirm `npm whoami`, package-name
  ownership/reservation, access level, and 2FA before considering publication.
- Confirm npm package ownership, publishing account, access, and 2FA policy.
- Approve the exact V1 release notes and tag before enabling publication.
- Publish the package before adding npm-installable starter presets.
- Continue only the optional items recorded in [docs/TODO.md](docs/TODO.md).

## Handoff Notes

- Do not move user application files into the framework package.
- Do not import private paths such as `velodom/lib/*`; use documented exports.
- Do not delete `packages/velodom/lib` or `packages/velodom/types` merely to
  clean the tree. They are ignored, generated local outputs used for testing.
- Do not remove `private: true` or publish without explicit owner approval.
- Update this file, `docs/TODO.md`, `docs/CHANGELOG.md`, and relevant decisions
  after architecture or release-readiness changes.
