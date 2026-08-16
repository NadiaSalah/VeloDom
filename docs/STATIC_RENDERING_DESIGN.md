# VeloDom Static Rendering Design

Status: approved V2 design. V1 already supports static SEO summaries and the
application-owned `seo.renderPage` build hook. This document defines a safe
path to richer static routes without mislabeling client takeover as SSR.

## Goal

Enable content-heavy applications to emit complete route HTML at build time
from explicit application data, while preserving normal HTML page templates and
the lightweight client router.

## Proposed Contract

A future page `config.js` or `config.ts` may opt into a build-only `prerender`
section:

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

## Explicit Boundaries

- `seo.renderPage` remains the current V1 compatibility hook for static app
  content.
- Prerender is a named build feature that may build on that hook, but it is not
  a persistent server renderer.
- `hydration: "client-takeover"` means the router replaces initial static
  content after JavaScript loads; it is not DOM reconciliation.
- `renderToString`, server components, database sessions, and universal SSR
  APIs are out of scope until a separate, tested hydration architecture exists.

## Required Verification Before Implementation

Any V2 implementation must prove direct static routes, dynamic build entries,
no-JavaScript output, script sanitization, unknown-route fallback, and client
takeover in both package and browser fixtures.
