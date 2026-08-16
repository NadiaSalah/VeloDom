/**
 * ----------------------------------------
 * Module: Content Mode
 * ----------------------------------------
 *
 * Responsibilities:
 * - Parse local Markdown content with small frontmatter metadata.
 * - Generate build-time content entries for pages, SEO, sitemap, RSS, and
 *   search-index workflows.
 * - Keep content processing outside the browser runtime.
 *
 * Used by:
 * - Vite plugin integrations
 * - Page config SEO entry hooks
 * - Documentation and blog applications
 *
 * Notes:
 * This module is intentionally Node/build-time oriented. It does not execute
 * Markdown as JavaScript and does not add MDX, JSX, or CMS runtime behavior.
 * ----------------------------------------
 */

import {
  readdir,
  readFile
} from "node:fs/promises";
import {
  basename,
  extname,
  join,
  relative
} from "node:path";
import type {
  SeoRouteEntry
} from "./types.ts";

/** Primitive frontmatter value supported by the built-in Markdown parser. */
export type ContentFrontmatterValue = string | number | boolean | string[] | null;

/** Frontmatter metadata parsed from a local Markdown document. */
export type ContentFrontmatter = Record<string, ContentFrontmatterValue>;

/** A local Markdown source passed to the content generator. */
export interface ContentSource {
  /** Collection name such as `posts` or `docs`. */
  collection: string;
  /** Optional explicit slug. Defaults to the file basename when `path` exists. */
  slug?: string;
  /** Optional source path used for diagnostics and slug derivation. */
  path?: string;
  /** Raw Markdown source, including optional frontmatter. */
  source: string;
}

/** Options shared by content generation helpers. */
export interface ContentGenerationOptions {
  /** Public URL prefix for generated entry paths. Defaults to `/<collection>`. */
  basePath?: string;
  /** Whether draft entries should be included. Defaults to `false`. */
  includeDrafts?: boolean;
}

/** Options for loading Markdown files from a collection directory. */
export interface ContentFileLoadOptions extends ContentGenerationOptions {
  /** Root directory that contains collection folders, for example `src/content`. */
  root: string;
  /** Collection folder name to load. */
  collection: string;
}

/** Options for generating a collection from in-memory Markdown sources. */
export interface ContentCollectionOptions extends ContentGenerationOptions {
  /** Collection name used for default paths and metadata. */
  collection: string;
  /** Markdown sources that belong to the collection. */
  files: ContentSource[];
}

/** Normalized content entry generated from Markdown and frontmatter. */
export interface ContentEntry {
  /** Collection name such as `posts` or `docs`. */
  collection: string;
  /** Stable URL slug. */
  slug: string;
  /** Public route path for the entry. */
  path: string;
  /** Human-readable title. */
  title: string;
  /** SEO and listing description. */
  description: string;
  /** Optional ISO-like date string from frontmatter. */
  date?: string;
  /** Search and listing tags. */
  tags: string[];
  /** Whether the entry is a draft. */
  draft: boolean;
  /** Parsed frontmatter values. */
  frontmatter: ContentFrontmatter;
  /** Safe HTML generated from Markdown. */
  bodyHtml: string;
  /** Plain text body used for excerpts and search indexes. */
  bodyText: string;
  /** Short plain-text excerpt. */
  excerpt: string;
  /** SEO metadata derived from the entry. */
  seo: {
    title: string;
    description: string;
    canonical: string;
    keywords: string[];
  };
}

/** Build-time collection outputs for routing, SEO, RSS, and search. */
export interface ContentCollection {
  /** Normalized entries, excluding drafts unless requested. */
  entries: ContentEntry[];
  /** SEO route entries compatible with VeloDom page `seo.entries`. */
  seoEntries: SeoRouteEntry[];
  /** Sitemap records derived from entries. */
  sitemap: ContentSitemapEntry[];
  /** Search-index records derived from entries. */
  searchIndex: ContentSearchRecord[];
}

/** Sitemap data generated from content entries. */
export interface ContentSitemapEntry {
  /** Route path or absolute URL. */
  url: string;
  /** Optional last-modified date. */
  lastModified?: string;
}

/** Search index record generated from content entries. */
export interface ContentSearchRecord {
  /** Stable search record id. */
  id: string;
  /** Search result title. */
  title: string;
  /** Search result description. */
  description: string;
  /** Public URL path. */
  url: string;
  /** Tags included in the record. */
  tags: string[];
  /** Plain text body for local indexing. */
  body: string;
}

/** RSS feed generation options. */
export interface ContentRssOptions {
  /** Feed title. */
  title: string;
  /** Absolute site URL such as `https://example.com`. */
  siteUrl: string;
  /** Optional feed description. */
  description?: string;
  /** Optional feed self path. Defaults to `/rss.xml`. */
  feedPath?: string;
}

/** Loads a Markdown collection from `root/collection` and generates content outputs. */
export async function loadContentCollection(
  options: ContentFileLoadOptions
): Promise<ContentCollection> {
  const folder = join(options.root, options.collection);
  const files = await collectMarkdownFiles(folder);
  const sources = await Promise.all(
    files.map(async file => ({
      collection: options.collection,
      path: file,
      slug: createSlugFromPath(relative(folder, file)),
      source: await readFile(file, "utf8")
    }))
  );

  return createContentCollection({
    basePath: options.basePath,
    collection: options.collection,
    files: sources,
    includeDrafts: options.includeDrafts
  });
}

/** Generates normalized entries and derived artifacts from Markdown sources. */
export function createContentCollection(
  options: ContentCollectionOptions
): ContentCollection {
  const entries = options.files
    .map(file => parseMarkdownContent(file, {
      basePath: options.basePath
    }))
    .filter(entry => options.includeDrafts === true || !entry.draft)
    .sort(compareContentEntries);

  return {
    entries,
    seoEntries: createContentSeoEntries(entries),
    sitemap: createContentSitemap(entries),
    searchIndex: createContentSearchIndex(entries)
  };
}

/** Parses one Markdown source into a normalized content entry. */
export function parseMarkdownContent(
  source: ContentSource,
  options: ContentGenerationOptions = {}
): ContentEntry {
  const parsed = splitFrontmatter(source.source);
  const title = getString(parsed.frontmatter.title)
    || inferTitle(parsed.markdown)
    || createTitleFromSlug(source.slug || source.path || "untitled");
  const description = getString(parsed.frontmatter.description)
    || createExcerpt(markdownToText(parsed.markdown), 160);
  const slug = normalizeSlug(
    source.slug
      || (source.path ? createSlugFromPath(source.path) : title)
  );
  const basePath = normalizeBasePath(options.basePath || `/${source.collection}`);
  const path = `${basePath}/${slug}`;
  const tags = getStringList(parsed.frontmatter.tags);
  const date = getString(parsed.frontmatter.date);
  const bodyText = markdownToText(parsed.markdown);
  const entry: ContentEntry = {
    collection: source.collection,
    slug,
    path,
    title,
    description,
    tags,
    draft: parsed.frontmatter.draft === true,
    frontmatter: parsed.frontmatter,
    bodyHtml: markdownToHtml(parsed.markdown),
    bodyText,
    excerpt: createExcerpt(bodyText, 180),
    seo: {
      title,
      description,
      canonical: path,
      keywords: tags
    }
  };

  if (date) {
    entry.date = date;
  }

  return entry;
}

/** Converts content entries into VeloDom SEO route entries. */
export function createContentSeoEntries(entries: ContentEntry[]): SeoRouteEntry[] {
  return entries.map(entry => ({
    path: entry.path,
    title: entry.seo.title,
    description: entry.seo.description,
    canonical: entry.seo.canonical,
    keywords: entry.seo.keywords,
    openGraph: {
      type: "article",
      title: entry.seo.title,
      description: entry.seo.description
    },
    summary: {
      heading: entry.title,
      text: entry.excerpt
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: entry.title,
      description: entry.description,
      articleBody: entry.bodyText,
      url: entry.path
    }
  }));
}

/** Creates sitemap records from content entries. */
export function createContentSitemap(
  entries: ContentEntry[],
  siteUrl = ""
): ContentSitemapEntry[] {
  const baseUrl = siteUrl.replace(/\/+$/, "");

  return entries.map(entry => {
    const item: ContentSitemapEntry = {
      url: baseUrl
        ? `${baseUrl}${entry.path}`
        : entry.path
    };

    if (entry.date) {
      item.lastModified = entry.date;
    }

    return item;
  });
}

/** Creates local search-index records from content entries. */
export function createContentSearchIndex(entries: ContentEntry[]): ContentSearchRecord[] {
  return entries.map(entry => ({
    id: `${entry.collection}:${entry.slug}`,
    title: entry.title,
    description: entry.description,
    url: entry.path,
    tags: entry.tags,
    body: entry.bodyText
  }));
}

/** Creates an RSS XML document from content entries. */
export function createContentRssFeed(
  entries: ContentEntry[],
  options: ContentRssOptions
): string {
  const siteUrl = options.siteUrl.replace(/\/+$/, "");
  const feedPath = options.feedPath || "/rss.xml";
  const items = entries.map(entry => [
    "    <item>",
    `      <title>${escapeHtml(entry.title)}</title>`,
    `      <link>${escapeHtml(`${siteUrl}${entry.path}`)}</link>`,
    `      <guid>${escapeHtml(`${siteUrl}${entry.path}`)}</guid>`,
    `      <description>${escapeHtml(entry.description)}</description>`,
    entry.date ? `      <pubDate>${escapeHtml(new Date(entry.date).toUTCString())}</pubDate>` : "",
    "    </item>"
  ].filter(Boolean).join("\n")).join("\n");

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<rss version=\"2.0\">",
    "  <channel>",
    `    <title>${escapeHtml(options.title)}</title>`,
    `    <link>${escapeHtml(siteUrl)}</link>`,
    `    <description>${escapeHtml(options.description || options.title)}</description>`,
    `    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeHtml(`${siteUrl}${feedPath}`)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>"
  ].join("\n");
}

async function collectMarkdownFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, {
    withFileTypes: true
  });
  const nested = await Promise.all(entries.map(entry => {
    const fullPath = join(folder, entry.name);

    if (entry.isDirectory()) {
      return collectMarkdownFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".md")
      ? [fullPath]
      : [];
  }));

  return nested.flat().sort();
}

function splitFrontmatter(source: string) {
  if (!source.startsWith("---")) {
    return {
      frontmatter: {},
      markdown: source
    };
  }

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

  if (end < 0) {
    return {
      frontmatter: {},
      markdown: source
    };
  }

  return {
    frontmatter: parseFrontmatter(lines.slice(1, end)),
    markdown: lines.slice(end + 1).join("\n").trim()
  };
}

function parseFrontmatter(lines: string[]): ContentFrontmatter {
  const frontmatter: ContentFrontmatter = {};
  let arrayKey = "";

  lines.forEach(line => {
    const arrayItem = line.match(/^\s*-\s+(.+)$/);

    if (arrayItem && arrayKey) {
      const current = frontmatter[arrayKey];

      if (Array.isArray(current)) {
        current.push(String(parseScalar(arrayItem[1])));
      }

      return;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!pair) return;

    const [, key, rawValue] = pair;

    if (rawValue.trim() === "") {
      frontmatter[key] = [];
      arrayKey = key;
      return;
    }

    frontmatter[key] = parseScalar(rawValue);
    arrayKey = "";
  });

  return frontmatter;
}

function parseScalar(value: string): ContentFrontmatterValue {
  const trimmed = value.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;
  let inCode = false;
  let codeLines: string[] = [];

  const closeList = () => {
    if (!inList) return;

    html.push("</ul>");
    inList = false;
  };

  lines.forEach(line => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
        return;
      }

      closeList();
      inCode = true;
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (!line.trim()) {
      closeList();
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);

    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      return;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/);

    if (listItem) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }

      html.push(`  <li>${escapeHtml(listItem[1])}</li>`);
      return;
    }

    closeList();
    html.push(`<p>${escapeHtml(line.trim())}</p>`);
  });

  closeList();

  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("\n");
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/[`*_>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTitle(markdown: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
}

function createExcerpt(text: string, limit: number) {
  if (text.length <= limit) return text;

  return `${text.slice(0, limit).trimEnd()}…`;
}

function createSlugFromPath(path: string) {
  const normalized = path.replaceAll("\\", "/");
  const extension = extname(normalized);
  const withoutExtension = extension
    ? normalized.slice(0, -extension.length)
    : normalized;

  return normalizeSlug(withoutExtension || basename(path, extension));
}

function createTitleFromSlug(value: string) {
  return normalizeSlug(value)
    .split("-")
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

function normalizeSlug(value: string) {
  return String(value || "untitled")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.[A-Za-z0-9]+$/u, "")
    .replace(/[^A-Za-z0-9/]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "")
    .replace(/\/-/g, "/")
    .replace(/-\//g, "/")
    .toLowerCase() || "untitled";
}

function normalizeBasePath(value: string) {
  return `/${String(value || "").replace(/^\/+|\/+$/g, "")}`;
}

function getString(value: ContentFrontmatterValue | undefined) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getStringList(value: ContentFrontmatterValue | undefined) {
  if (Array.isArray(value)) {
    return value.map(item => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map(item => item.trim()).filter(Boolean);
  }

  return [];
}

function compareContentEntries(left: ContentEntry, right: ContentEntry) {
  return (right.date || "").localeCompare(left.date || "")
    || left.title.localeCompare(right.title);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
