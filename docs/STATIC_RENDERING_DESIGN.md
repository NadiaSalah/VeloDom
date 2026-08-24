# VeloDom Static Rendering Design

Status: V1.1 implementation. VeloDom supports an explicit build-only
`config.prerender` contract in addition to V1 static SEO summaries and the
application-owned `seo.renderPage` hook. This document defines the boundary
between richer static routes and server rendering without mislabeling client
takeover as SSR.

## Goal

Enable content-heavy applications to emit complete route HTML at build time
from explicit application data, while preserving normal HTML page templates and
the lightweight client router.

## Proposed Contract

A page `config.js` or `config.ts` may opt into a build-only `prerender` section:

```js
export default {
  path: "/blog/:slug",
  prerender: {
    entries: async () => [
      { path: "/blog/html-first", data: { slug: "html-first" } }
    ],
    render: async ({ data }) => ({
      html: `<article><h1>${data.slug}</h1></article>`,
      mode: "replace",
      hydration: "client-takeover"
    })
  }
};
```

`entries` and `render` run only in the build process. The application owns
data fetching, escaping, and authorization decisions. Generated route files
must be served before the SPA fallback.

The `entries` function is optional for a concrete `path`; parameterized pages
must return concrete paths. Each entry may provide application-owned `data`,
which is passed to the build renderer. VeloDom also serializes matching,
JSON-safe public data in an inert route-scoped page-data script, so the first
client takeover can reuse it rather than load it again. It is never embedded
in the browser configuration module. Do not place secrets, cookies, tokens,
or user-specific data in an entry.

## Explicit Boundaries

- `seo.renderPage` remains the current V1 compatibility hook for static app
  content.
- Prerender is a named build feature that may build on that hook, but it is not
  a persistent server renderer.
- `hydration: "client-takeover"` means the router replaces initial static
  content after JavaScript loads; it is not DOM reconciliation.
- `renderToString`, server components, database sessions, and universal SSR
  APIs are out of scope until a separate, tested hydration architecture exists.

## Required Verification

The implementation must prove direct static routes, dynamic build entries,
no-JavaScript output, script sanitization, unknown-route fallback, and client
takeover in both package and browser fixtures.
