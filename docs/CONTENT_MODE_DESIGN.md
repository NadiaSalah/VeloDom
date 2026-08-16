# VeloDom Content Mode Design

Status: planned design, not implemented.

## Goal

Content Mode should make VeloDom excellent for blogs, documentation sites,
marketing pages, portfolios, and content-heavy websites without turning the
runtime into a CMS framework.

The feature must stay:

- HTML-first
- Compiler-first
- Folder-first
- Runtime lightweight
- optional
- friendly to Vanilla JavaScript and TypeScript users

## Proposed Folder Convention

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

## Generated Build-Time Data

The Vite plugin or a Node-only compiler helper can generate an internal content
manifest:

```ts
type ContentEntry = {
  collection: string;
  slug: string;
  path: string;
  title: string;
  description: string;
  date?: string;
  tags: string[];
  draft: boolean;
  bodyHtml: string;
  excerpt: string;
  seo: {
    title: string;
    description: string;
    canonical: string;
    keywords: string[];
  };
};
```

This manifest should be build-time data. It must not add mandatory browser
runtime parsing.

## Page Integration

Folder pages should consume content through normal page scripts:

```js
import { getContentCollection } from "velodom/content";

export async function init({ state }) {
  state.posts = await getContentCollection("posts");
}
```

Dynamic routes should support content entries:

```text
src/pages/blog/[slug]/
  index.html
  script.js
  config.js
```

```js
// config.js
import { getContentEntries } from "velodom/content";

export default {
  path: "/blog/:slug",
  seo: {
    entries: async () => getContentEntries("posts")
  }
};
```

## Generated Artifacts

Content Mode should be able to produce:

- dynamic route entries
- SEO metadata
- visible static fallback summaries
- sitemap entries
- RSS feed data
- search index data
- tag and category metadata

RSS and search indexes should be opt-in build artifacts, not runtime services.

## Public API Shape

Potential package subpath:

```text
velodom/content
```

Candidate helpers:

```ts
getContentCollection(name)
getContentEntry(collection, slug)
getContentEntries(collection)
createContentPlugin(options)
```

The public API should return plain objects so application authors can use
Vanilla JavaScript without framework-specific classes.

## Markdown Strategy

Initial implementation should prefer a small, explicit Markdown pipeline:

- parse frontmatter
- convert Markdown to safe HTML
- reject or sanitize scripts
- generate plain-text excerpt
- emit diagnostics for missing title/description

The first implementation should not add MDX, JSX, React components, or a CMS
runtime compatibility layer.

## Compiler Diagnostics

Content Mode should warn when:

- `title` is missing
- `description` is missing or too long
- duplicate slugs exist
- draft content is included in production output accidentally
- generated canonical paths collide
- unsafe HTML appears in Markdown output

## Non-Goals for V1.x

- full CMS admin UI
- MDX/JSX component execution inside Markdown
- server runtime database querying
- live preview server protocol
- mandatory content collections for all apps

## Implementation Order

1. Add a Node-only content parser behind the Vite plugin.
2. Generate a content manifest during build/dev.
3. Expose content helpers through a package subpath.
4. Connect content entries to static SEO route generation.
5. Add optional RSS and search-index artifact generation.
6. Add docs, examples, and tests.
