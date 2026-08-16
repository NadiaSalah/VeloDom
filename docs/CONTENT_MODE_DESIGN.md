# VeloDom Content Mode

Status: implemented V1 build-time helper layer, with future improvements
tracked separately.

## Goal

Content Mode makes VeloDom friendlier for blogs, documentation sites,
marketing pages, portfolios, and content-heavy websites without turning the
browser runtime into a CMS framework.

The feature stays:

- HTML-first
- compiler-first
- folder-first
- runtime lightweight
- optional
- friendly to Vanilla JavaScript and TypeScript users

## Current V1 Scope

The public `velodom/content` package subpath is available in `package.json`
exports and is implemented by the Node/build-time module
`src/core/content.ts`.

Current helpers:

```js
import {
  createContentCollection,
  createContentRssFeed,
  createContentSearchIndex,
  createContentSeoEntries,
  createContentSitemap,
  loadContentCollection,
  parseMarkdownContent
} from "velodom/content";
```

The helper layer can:

- load Markdown files from a local collection folder
- parse small frontmatter metadata
- infer titles, descriptions, slugs, excerpts, tags, and draft status
- generate safe HTML from basic Markdown without executing JavaScript
- produce SEO route entries compatible with page `seo.entries`
- produce sitemap records
- produce local search-index records
- produce RSS XML
- expose TypeScript types for content entries and derived artifacts

This is build-time/tooling behavior. It is not bundled as a mandatory browser
runtime service.

## Folder Convention

Applications can use a normal local content folder:

```text
src/content/
  posts/
    html-first.md
    compiler-first.md
  docs/
    getting-started.md
```

Each Markdown file may provide frontmatter:

```md
---
title: HTML-first VeloDom
description: Why VeloDom starts from normal HTML.
date: 2026-08-16
tags:
  - HTML-first
  - compiler
draft: false
---

# HTML-first VeloDom

Content stays readable and portable.
```

## Page Config Integration

Dynamic pages can expose explicit SEO entries from local content:

```js
// src/pages/blog/[slug]/config.js
import { loadContentCollection } from "velodom/content";

export default {
  path: "/blog/:slug",
  seo: {
    entries: async () => {
      const posts = await loadContentCollection({
        root: "src/content",
        collection: "posts",
        basePath: "/blog"
      });

      return posts.seoEntries;
    }
  }
};
```

The application owns the content source and decides when to use it. VeloDom
does not fabricate dynamic route content without explicit app data.

## Generated Data Shape

`createContentCollection()` and `loadContentCollection()` return:

```ts
type ContentCollection = {
  entries: ContentEntry[];
  seoEntries: SeoRouteEntry[];
  sitemap: ContentSitemapEntry[];
  searchIndex: ContentSearchRecord[];
};
```

Each `ContentEntry` includes:

- collection
- slug
- path
- title
- description
- optional date
- tags
- draft flag
- parsed frontmatter
- safe body HTML
- plain body text
- excerpt
- derived SEO metadata

## RSS and Search Indexes

RSS and local search indexes are generated artifacts, not runtime services:

```js
import {
  createContentRssFeed,
  loadContentCollection
} from "velodom/content";

const posts = await loadContentCollection({
  root: "src/content",
  collection: "posts",
  basePath: "/blog"
});

const rss = createContentRssFeed(posts.entries, {
  title: "VeloDom Blog",
  description: "Framework articles",
  siteUrl: "https://example.com"
});
```

## Markdown Strategy

The V1 helper intentionally uses a small, explicit Markdown pipeline:

- parse frontmatter
- convert common Markdown blocks and inline text to escaped HTML
- keep scripts escaped as text
- generate plain-text excerpts
- keep returned values as plain objects

It does not add MDX, JSX, React components, or a CMS runtime compatibility
layer.

## Current Non-Goals

- full CMS admin UI
- MDX/JSX component execution inside Markdown
- server runtime database querying
- live preview server protocol
- mandatory content collections for every application
- automatic full-page SSR or hydration

## Future Content Improvements

Future V1.x work should extend the existing helper layer only when real project
needs appear. Possible improvements:

- richer collection queries
- pagination helpers
- asset/image integration
- clearer content diagnostics for missing metadata and duplicate slugs
- faster or incremental content builds
- feed/search artifact extensions

These improvements should remain optional and build-time oriented.
