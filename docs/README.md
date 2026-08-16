# VeloDom Documentation Map

This directory contains focused design and usage documents that support the
main [README](../README.md). The README is the beginner and public API guide;
these files explain deeper contracts, tradeoffs, and future research without
making those ideas part of the browser runtime.

## Start Here

1. [Framework identity](FRAMEWORK_IDENTITY.md) explains the HTML-first,
   compiler-first, folder-first, runtime-lightweight boundaries.
2. [Developer experience](DX_RUBRIC.md) explains how tooling is evaluated
   without adding runtime complexity.
3. [Adapters](ADAPTERS.md) documents the resource contract used by Vite and
   possible future build-tool integrations.
4. [Deployment](DEPLOYMENT.md) covers static hosting, route fallback, and SEO
   artifacts.

## Current Optional Capabilities

| Document | Scope |
| --- | --- |
| [Assets](ASSETS.md) | Build-time image inspection and responsive attributes. |
| [Content mode](CONTENT_MODE_DESIGN.md) | Markdown collections, sitemap, RSS, search records, and SEO data. |
| [Editor integration](EDITOR_INTELLIGENCE.md) | Compiler-backed diagnostics and the optional VS Code prototype. |
| [Development tools](DEVTOOLS_PROTOCOL.md) | Opt-in, development-only inspection protocol and UI. |

## Approved Research, Not V1 Runtime Promises

| Document | Boundary |
| --- | --- |
| [Static rendering](STATIC_RENDERING_DESIGN.md) | Build-only route HTML; not universal SSR/hydration. |
| [Progressive forms](PROGRESSIVE_FORMS.md) | Enhance native HTML submission through optional adapters. |
| [Localization](LOCALIZATION_DESIGN.md) | Optional build tooling, separate from direction/RTL support. |
| [Future research](FUTURE_RESEARCH.md) | Deferred ideas that still require proof and scope review. |

## Documentation Rules

- Keep beginner instructions and public API examples in `README.md`.
- Keep release tasks in `todo.md`, historical changes in `CHANGELOG.md`, and
  architectural decisions in `NOTES.md`.
- A design document does not mean a feature is shipped. Current behavior must
  be supported by implementation, tests, and the package boundary.
- Prefer examples using `mountVeloDom()` for conventional Vite applications.
  Use `createApp()` only when demonstrating explicit adapter composition.
- Keep application-owned business behavior outside `src/core`.
