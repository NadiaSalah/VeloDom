import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createContentCollection,
  createContentRssFeed,
  createContentSitemap,
  loadContentCollection,
  parseMarkdownContent
} from "../../../packages/velodom/src/content.ts";

test("content mode parses frontmatter and safe markdown output", () => {
  const entry = parseMarkdownContent({
    collection: "posts",
    path: "html-first.md",
    source: [
      "---",
      "title: HTML-first VeloDom",
      "description: Build from ordinary HTML.",
      "date: 2026-08-16",
      "tags:",
      "  - HTML-first",
      "  - compiler",
      "draft: false",
      "---",
      "# Ignored because frontmatter title wins",
      "",
      "Hello <script>alert(1)</script>",
      "- one",
      "- two"
    ].join("\n")
  }, {
    basePath: "/blog"
  });

  assert.equal(entry.slug, "html-first");
  assert.equal(entry.path, "/blog/html-first");
  assert.equal(entry.title, "HTML-first VeloDom");
  assert.equal(entry.description, "Build from ordinary HTML.");
  assert.equal(entry.date, "2026-08-16");
  assert.deepEqual(entry.tags, [
    "HTML-first",
    "compiler"
  ]);
  assert.equal(entry.draft, false);
  assert.match(entry.bodyHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(entry.bodyHtml, /<ul>/);
});

test("content collection generates SEO, sitemap, and search records", () => {
  const collection = createContentCollection({
    collection: "docs",
    basePath: "/docs",
    files: [
      {
        collection: "docs",
        path: "draft.md",
        source: [
          "---",
          "title: Draft",
          "draft: true",
          "---",
          "Hidden"
        ].join("\n")
      },
      {
        collection: "docs",
        path: "intro.md",
        source: [
          "---",
          "title: Intro",
          "description: Start here.",
          "tags: guide, basics",
          "---",
          "# Intro",
          "Welcome to VeloDom."
        ].join("\n")
      }
    ]
  });

  assert.equal(collection.entries.length, 1);
  assert.equal(collection.entries[0].path, "/docs/intro");
  assert.equal(collection.seoEntries[0].title, "Intro");
  assert.equal(collection.sitemap[0].url, "/docs/intro");
  assert.deepEqual(collection.searchIndex[0].tags, [
    "guide",
    "basics"
  ]);
});

test("content mode loads markdown files from a collection folder", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-content-"));
  const posts = join(root, "posts");

  await mkdir(posts);
  await writeFile(join(posts, "hello.md"), [
    "---",
    "title: Hello",
    "description: Loaded from disk.",
    "---",
    "# Hello",
    "Disk content"
  ].join("\n"));

  const collection = await loadContentCollection({
    root,
    collection: "posts",
    basePath: "/blog"
  });

  assert.equal(collection.entries.length, 1);
  assert.equal(collection.entries[0].path, "/blog/hello");
});

test("content mode generates sitemap URLs and RSS XML", () => {
  const collection = createContentCollection({
    collection: "posts",
    files: [
      {
        collection: "posts",
        path: "one.md",
        source: [
          "---",
          "title: One",
          "description: First post.",
          "date: 2026-08-16",
          "---",
          "# One"
        ].join("\n")
      }
    ]
  });
  const sitemap = createContentSitemap(
    collection.entries,
    "https://example.com"
  );
  const rss = createContentRssFeed(collection.entries, {
    title: "VeloDom Blog",
    description: "Framework articles",
    siteUrl: "https://example.com"
  });

  assert.equal(sitemap[0].url, "https://example.com/posts/one");
  assert.equal(sitemap[0].lastModified, "2026-08-16");
  assert.match(rss, /<rss version="2.0">/);
  assert.match(rss, /https:\/\/example\.com\/posts\/one/);
});
