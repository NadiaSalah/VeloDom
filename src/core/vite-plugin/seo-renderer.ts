/**
 * ----------------------------------------
 * Module: Static SEO Renderer
 * ----------------------------------------
 *
 * Reads page-owned config.js files after a Vite build and emits route-specific
 * HTML containing metadata plus a concise, visible content fallback.
 * ----------------------------------------
 */

import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile
} from "node:fs/promises";
import {
  dirname,
  join,
  relative,
  resolve,
  sep
} from "node:path";
import { pathToFileURL } from "node:url";
import { VD_SEO } from "../constants.ts";
import {
  normalizeSeoConfig,
  resolvePageSeo
} from "../seo.ts";
import type {
  PageConfig,
  SeoMetadata
} from "../types.ts";

/** Options controlling production SEO artifact generation. */
export interface StaticSeoBuildOptions {
  root: string;
  outDir: string;
  siteUrl?: string;
  generateSitemap?: boolean;
  generateRobots?: boolean;
}

/** Result summary returned by the production SEO renderer. */
export interface StaticSeoBuildResult {
  routes: string[];
  files: string[];
}

interface StaticSeoPage {
  route: string;
  seo: SeoMetadata;
}

interface RenderSeoDocumentOptions {
  defaultTitle?: string;
  defaultLang?: string;
  siteUrl?: string;
  route?: string;
}

/**
 * Generates route HTML, sitemap, and robots artifacts from page config.js SEO.
 */
export async function generateStaticSeoPages(
  options: StaticSeoBuildOptions
): Promise<StaticSeoBuildResult> {
  const root = resolve(options.root);
  const outDir = resolve(root, options.outDir);
  const baseHtmlPath = join(outDir, "index.html");
  const pagesRoot = join(root, "src", "pages");

  await access(baseHtmlPath);

  const [baseHtml, pages] = await Promise.all([
    readFile(baseHtmlPath, "utf8"),
    discoverStaticSeoPages(pagesRoot)
  ]);
  const files: string[] = [];

  const uniquePages = dedupePages(pages);

  for (const page of uniquePages) {
    const outputPath = resolveRouteOutput(outDir, page.route);

    assertInsideRoot(outputPath, outDir, "SEO route output");
    await mkdir(dirname(outputPath), {
      recursive: true
    });
    await writeFile(
      outputPath,
      renderSeoDocument(baseHtml, page.seo, {
        defaultTitle: readDocumentTitle(baseHtml),
        defaultLang: readDocumentLang(baseHtml),
        siteUrl: options.siteUrl,
        route: page.route
      })
    );
    files.push(outputPath);
  }

  const routes = uniquePages.map(page => page.route);
  const indexableRoutes = uniquePages
    .filter(page => isIndexable(page.seo))
    .map(page => page.route);
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const shouldWriteSitemap = Boolean(
    siteUrl
    && options.generateSitemap !== false
    && indexableRoutes.length
  );

  if (siteUrl && shouldWriteSitemap) {
    const sitemapPath = join(outDir, "sitemap.xml");

    await writeFile(
      sitemapPath,
      createSitemap(siteUrl, indexableRoutes)
    );
    files.push(sitemapPath);
  }

  if (siteUrl && options.generateRobots !== false) {
    const robotsPath = join(outDir, "robots.txt");

    await writeFile(
      robotsPath,
      createRobots(siteUrl, shouldWriteSitemap)
    );
    files.push(robotsPath);
  }

  return {
    routes,
    files
  };
}

/**
 * Renders normalized SEO metadata and fallback content into one HTML document.
 */
export function renderSeoDocument(
  source: string,
  seo: SeoMetadata,
  options: RenderSeoDocumentOptions = {}
): string {
  const canonical = resolveCanonical(
    seo.canonical || options.route,
    options.siteUrl
  );
  const metadata = renderHeadMetadata(seo, canonical);
  const summary = seo.summary || {
    heading: seo.title,
    text: seo.description
  };
  let html = preserveDocumentDefaults(
    source,
    options.defaultTitle || readDocumentTitle(source),
    options.defaultLang ?? readDocumentLang(source)
  );

  html = replaceDocumentLang(html, seo.lang);
  html = replaceDocumentTitle(html, seo.title);
  html = html.replace(
    /<\/head>/i,
    `${metadata}\n</head>`
  );

  return html.replace(
    /(<(?:div|main)\b[^>]*\bid=["']app["'][^>]*>)[\s\S]*?(<\/(?:div|main)>)/i,
    [
      "$1",
      renderSummary(summary.heading, summary.text),
      "$2"
    ].join("\n")
  );
}

async function discoverStaticSeoPages(
  pagesRoot: string
): Promise<StaticSeoPage[]> {
  const templates = await findPageTemplates(pagesRoot);
  const groups = await Promise.all(
    templates.map(async templatePath => {
      const pageDirectory = dirname(templatePath);
      const folder = relative(pagesRoot, pageDirectory)
        .split(sep)
        .join("/");
      const config = await loadPageConfig(pageDirectory);

      if (!config?.seo) return [];

      const seo = normalizeSeoConfig(
        config.seo,
        `SEO config for page "${folder}"`
      );

      if (!seo) return [];

      const pages: StaticSeoPage[] = [];
      const route = normalizeStaticRoute(
        config.path || folderToRoute(folder)
      );
      const isDynamic = /(^|\/)\[[^/]+\](\/|$)/.test(folder);

      if (route && !isDynamic) {
        pages.push({
          route,
          seo: resolvePageSeo(seo, route) || seo
        });
      }

      for (const entry of seo.entries || []) {
        const entryRoute = normalizeStaticRoute(entry.path);

        if (!entryRoute) continue;

        pages.push({
          route: entryRoute,
          seo: resolvePageSeo(seo, entryRoute) || entry
        });
      }

      return pages;
    })
  );

  return groups.flat();
}

async function findPageTemplates(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directory, {
      withFileTypes: true
    });
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }

  const nested = await Promise.all(
    entries.map(async entry => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return findPageTemplates(path);
      }

      return entry.isFile() && entry.name === "index.html"
        ? [path]
        : [];
    })
  );

  return nested.flat();
}

async function loadPageConfig(
  pageDirectory: string
): Promise<PageConfig | undefined> {
  for (const filename of ["config.js", "page.config.js"]) {
    const path = join(pageDirectory, filename);

    try {
      const details = await stat(path);
      const url = pathToFileURL(path);

      url.searchParams.set("vd-seo", String(details.mtimeMs));
      const module = await import(url.href);

      return module.default as PageConfig | undefined;
    } catch (error) {
      if (
        error instanceof Error
        && "code" in error
        && error.code === "ENOENT"
      ) {
        continue;
      }

      throw error;
    }
  }

  return undefined;
}

function dedupePages(pages: StaticSeoPage[]) {
  const byRoute = new Map<string, StaticSeoPage>();

  for (const page of pages) {
    if (byRoute.has(page.route)) {
      throw new Error(
        `Duplicate static SEO route "${page.route}" in page configs`
      );
    }

    byRoute.set(page.route, page);
  }

  return [...byRoute.values()];
}

function normalizeStaticRoute(value: string) {
  const route = String(value || "").trim();

  if (
    !route.startsWith("/")
    || route.includes("..")
    || /[:*[\]?#]/.test(route)
  ) {
    return "";
  }

  if (route === "/") return route;

  return route.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
}

function folderToRoute(folder: string) {
  return folder === "home" ? "/" : `/${folder}`;
}

function resolveRouteOutput(outDir: string, route: string) {
  if (route === "/") return join(outDir, "index.html");

  return join(
    outDir,
    ...route.slice(1).split("/"),
    "index.html"
  );
}

function preserveDocumentDefaults(
  source: string,
  title: string,
  lang: string
) {
  return source.replace(/<html\b([^>]*)>/i, (_match, attributes) => {
    const cleaned = String(attributes)
      .replace(
        new RegExp(`\\s${VD_SEO.DEFAULT_TITLE_ATTRIBUTE}=(["']).*?\\1`, "i"),
        ""
      )
      .replace(
        new RegExp(`\\s${VD_SEO.DEFAULT_LANG_ATTRIBUTE}=(["']).*?\\1`, "i"),
        ""
      );

    return [
      "<html",
      cleaned,
      ` ${VD_SEO.DEFAULT_TITLE_ATTRIBUTE}="${escapeAttribute(title)}"`,
      ` ${VD_SEO.DEFAULT_LANG_ATTRIBUTE}="${escapeAttribute(lang)}">`
    ].join("");
  });
}

function replaceDocumentLang(source: string, lang: string | undefined) {
  if (!lang) return source;

  return source.replace(/<html\b([^>]*)>/i, (_match, attributes) => {
    const cleaned = String(attributes).replace(
      /\slang=(["']).*?\1/i,
      ""
    );

    return `<html${cleaned} lang="${escapeAttribute(lang)}">`;
  });
}

function replaceDocumentTitle(source: string, title: string) {
  const value = `<title>${escapeText(title)}</title>`;

  if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(source)) {
    return source.replace(
      /<title\b[^>]*>[\s\S]*?<\/title>/i,
      value
    );
  }

  return source.replace(/<\/head>/i, `${value}\n</head>`);
}

function renderHeadMetadata(
  seo: SeoMetadata,
  canonical: string
) {
  const tags = [
    renderMeta("name", "description", seo.description),
    renderMeta("name", "robots", seo.robots),
    renderMeta("name", "keywords", seo.keywords?.join(", "))
  ];
  const graph = seo.openGraph || {};

  if (canonical) {
    tags.push(
      `<link rel="canonical" href="${escapeAttribute(canonical)}" ${VD_SEO.MANAGED_ATTRIBUTE}>`
    );
  }

  tags.push(
    renderMeta("property", "og:title", graph.title || seo.title),
    renderMeta(
      "property",
      "og:description",
      graph.description || seo.description
    ),
    renderMeta("property", "og:type", graph.type),
    renderMeta("property", "og:url", graph.url || canonical),
    renderMeta("property", "og:image", graph.image),
    renderMeta("property", "og:image:alt", graph.imageAlt)
  );

  if (seo.twitter) {
    tags.push(
      renderMeta("name", "twitter:card", seo.twitter.card),
      renderMeta(
        "name",
        "twitter:title",
        seo.twitter.title || seo.title
      ),
      renderMeta(
        "name",
        "twitter:description",
        seo.twitter.description || seo.description
      ),
      renderMeta("name", "twitter:image", seo.twitter.image),
      renderMeta(
        "name",
        "twitter:image:alt",
        seo.twitter.imageAlt
      )
    );
  }

  if (seo.jsonLd) {
    tags.push(
      `<script type="${VD_SEO.JSON_LD_TYPE}" ${VD_SEO.MANAGED_ATTRIBUTE}>${
        JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c")
      }</script>`
    );
  }

  return tags.filter(Boolean).join("\n");
}

function renderMeta(
  attribute: "name" | "property",
  key: string,
  content: string | undefined
) {
  if (!content) return "";

  return `<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(content)}" ${VD_SEO.MANAGED_ATTRIBUTE}>`;
}

function renderSummary(heading: string, text: string) {
  return [
    `<section ${VD_SEO.FALLBACK_ATTRIBUTE} aria-label="Page summary">`,
    `  <h1>${escapeText(heading)}</h1>`,
    `  <p>${escapeText(text)}</p>`,
    "</section>"
  ].join("\n");
}

function resolveCanonical(
  value: string | undefined,
  siteUrl: string | undefined
) {
  const base = normalizeSiteUrl(siteUrl);

  if (!value) return "";

  if (!base) return value;

  try {
    return new URL(value, `${base}/`).href;
  } catch {
    return value;
  }
}

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) return "";

    return url.href.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function createSitemap(siteUrl: string, routes: string[]) {
  const urls = routes
    .map(route => (
      `  <url><loc>${escapeText(new URL(route, `${siteUrl}/`).href)}</loc></url>`
    ))
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    ""
  ].join("\n");
}

function createRobots(siteUrl: string, includeSitemap: boolean) {
  const lines = [
    "User-agent: *",
    "Allow: /"
  ];

  if (includeSitemap) {
    lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
  }

  return `${lines.join("\n")}\n`;
}

function isIndexable(seo: SeoMetadata) {
  return !seo.robots?.toLowerCase().includes("noindex");
}

function readDocumentTitle(source: string) {
  return source.match(
    /<title\b[^>]*>([\s\S]*?)<\/title>/i
  )?.[1].trim() || "";
}

function readDocumentLang(source: string) {
  return source.match(
    /<html\b[^>]*\slang=(["'])(.*?)\1/i
  )?.[2] || "";
}

function escapeText(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return escapeText(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function assertInsideRoot(
  target: string,
  root: string,
  label: string
) {
  const resolvedTarget = resolve(target);
  const resolvedRoot = resolve(root);

  if (
    resolvedTarget !== resolvedRoot
    && !resolvedTarget.startsWith(`${resolvedRoot}${sep}`)
  ) {
    throw new Error(
      `${label} must stay inside "${resolvedRoot}"`
    );
  }
}
