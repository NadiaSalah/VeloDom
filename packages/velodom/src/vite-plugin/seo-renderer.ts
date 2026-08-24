/**
 * ----------------------------------------
 * Module: Static SEO Renderer
 * ----------------------------------------
 *
 * Reads page-owned config.js/config.ts files after a Vite build and emits
 * route-specific
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
import {
  VD_RESOURCE_ADAPTER,
  VD_SEO,
  VD_SINGLE_FILE
} from "../constants.ts";
import {
  normalizeSeoConfig,
  resolvePageSeo
} from "../seo.ts";
import {
  parseVeloDomSingleFile
} from "./single-file.ts";
import {
  renderPageDataTransfer
} from "../page-data.ts";
import type {
  PageConfig,
  SeoConfig,
  SeoEntriesContext,
  SeoEntriesHook,
  SeoMetadata,
  SeoRouteEntry,
  SeoStaticContent,
  SeoStaticRenderHook,
  PagePrerenderConfig,
  PrerenderEntry,
  UnknownRecord
} from "../types.ts";

/** Options controlling production SEO artifact generation. */
export interface StaticSeoBuildOptions {
  root: string;
  outDir: string;
  siteUrl?: string;
  generateSitemap?: boolean;
  generateRobots?: boolean;
  entries?: SeoEntriesHook;
  renderPage?: SeoStaticRenderHook;
}

/** Result summary returned by the production SEO renderer. */
export interface StaticSeoBuildResult {
  routes: string[];
  files: string[];
}

interface StaticSeoPage {
  page: string;
  route: string;
  seo: SeoMetadata;
  renderPage?: SeoStaticRenderHook;
  data?: unknown;
}

interface StaticSeoSource {
  folder: string;
  path: string;
  type: "folder" | "single-file";
}

interface DiscoverStaticSeoOptions {
  root: string;
  entries?: SeoEntriesHook;
}

interface RenderSeoDocumentOptions {
  defaultTitle?: string;
  defaultLang?: string;
  siteUrl?: string;
  page?: string;
  route?: string;
  staticContent?: SeoStaticContent;
  staticData?: unknown;
}

/**
 * Generates route HTML, sitemap, and robots artifacts from page config SEO.
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
    discoverStaticSeoPages(pagesRoot, {
      root,
      entries: options.entries
    })
  ]);
  const files: string[] = [];

  const uniquePages = dedupePages(pages);

  for (const page of uniquePages) {
    const outputPath = resolveRouteOutput(outDir, page.route);
    const staticContent = await resolveStaticContent(page, {
      root,
      renderPage: options.renderPage
    });

    assertInsideRoot(outputPath, outDir, "SEO route output");
    await mkdir(dirname(outputPath), {
      recursive: true
    });
    await writeFile(
      outputPath,
      renderSeoDocument(baseHtml, page.seo, {
        defaultTitle: readDocumentTitle(baseHtml),
        defaultLang: readDocumentLang(baseHtml),
        page: page.page,
        siteUrl: options.siteUrl,
        route: page.route,
        staticContent,
        staticData: page.data
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
      renderAppStaticContent(
        options.staticContent,
        summary.heading,
        summary.text,
        options.page,
        options.route,
        options.staticData
      ),
      "$2"
    ].join("\n")
  );
}

async function discoverStaticSeoPages(
  pagesRoot: string,
  options: DiscoverStaticSeoOptions
): Promise<StaticSeoPage[]> {
  const templates = await findPageTemplates(pagesRoot);
  const groups = await Promise.all(
    templates.map(async template => {
      const config = await loadPageConfig(template);

      if (!config?.seo && !config?.prerender) return [];

      const seo = normalizeSeoConfig(
        config.seo,
        `SEO config for page "${template.folder}"`
      );

      if (config.prerender && !seo) {
        throw new TypeError(
          `Page "${template.folder}" prerender requires a seo config`
        );
      }

      const pages: StaticSeoPage[] = [];
      const route = normalizeStaticRoute(
        config.path || folderToRoute(template.folder)
      );
      const isDynamic = /(^|\/)\[[^/]+\](\/|$)/.test(template.folder);
      const context = {
        page: template.folder,
        route,
        root: options.root
      };

      if (seo && route && !isDynamic && !config.prerender) {
        pages.push({
          page: template.folder,
          route,
          seo: resolvePageSeo(seo, route) || seo
        });
      }

      const entries = await resolveBuildSeoEntries(
        config.seo,
        seo,
        context,
        options.entries
      );

      for (const entry of entries) {
        const entryRoute = normalizeStaticRoute(entry.path);

        if (!entryRoute) continue;

        pages.push({
          page: template.folder,
          route: entryRoute,
          seo: entry
        });
      }

      if (config.prerender) {
        pages.push(...await resolvePrerenderPages(
          template,
          config.prerender,
          seo,
          route,
          options.root
        ));
      }

      return pages;
    })
  );

  return groups.flat();
}

async function resolvePrerenderPages(
  template: StaticSeoSource,
  prerender: PagePrerenderConfig,
  seo: SeoConfig | undefined,
  configuredRoute: string,
  root: string
): Promise<StaticSeoPage[]> {
  const entries = prerender.entries
    ? await prerender.entries()
    : configuredRoute
      ? [{ path: configuredRoute }]
      : [];

  if (!Array.isArray(entries)) {
    throw new TypeError(
      `Prerender entries for page "${template.folder}" must return an array`
    );
  }

  if (!entries.length) {
    throw new Error(
      `Prerender page "${template.folder}" needs at least one concrete entry`
    );
  }

  return entries.map((entry: PrerenderEntry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new TypeError(
        `Prerender entry ${index} for page "${template.folder}" must be an object`
      );
    }

    const route = normalizeStaticRoute(entry.path);

    if (!route) {
      throw new TypeError(
        `Prerender entry ${index} for page "${template.folder}" must use a concrete path`
      );
    }

    const resolvedSeo = resolvePageSeo(seo, route);

    if (!resolvedSeo) {
      throw new TypeError(
        `Prerender entry "${route}" for page "${template.folder}" has no SEO metadata`
      );
    }

    return {
      page: template.folder,
      route,
      seo: resolvedSeo,
      renderPage: context => prerender.render({
        ...context,
        data: entry.data,
        root
      }),
      data: entry.data
    };
  });
}

async function resolveBuildSeoEntries(
  rawSeo: PageConfig["seo"],
  baseSeo: SeoConfig,
  context: SeoEntriesContext,
  globalHook: SeoEntriesHook | undefined
) {
  const rawEntries = await collectRawSeoEntries(
    rawSeo,
    context,
    globalHook
  );

  if (!rawEntries.length) return [];

  return normalizeSeoConfig({
    ...baseSeo,
    entries: rawEntries
  }, `SEO entries for page "${context.page}"`)?.entries as SeoRouteEntry[] || [];
}

async function collectRawSeoEntries(
  rawSeo: PageConfig["seo"],
  context: SeoEntriesContext,
  globalHook: SeoEntriesHook | undefined
) {
  const entries: unknown[] = [];
  const rawRecord = rawSeo as unknown as UnknownRecord | undefined;
  const rawValue = rawRecord?.entries;

  if (Array.isArray(rawValue)) {
    entries.push(...rawValue);
  }

  if (typeof rawValue === "function") {
    entries.push(...await runSeoEntriesHook(
      rawValue as SeoEntriesHook,
      context
    ));
  }

  if (globalHook) {
    entries.push(...await runSeoEntriesHook(globalHook, context));
  }

  return entries;
}

async function runSeoEntriesHook(
  hook: SeoEntriesHook,
  context: SeoEntriesContext
) {
  const result = await hook(context);

  if (result === undefined || result === null) return [];

  if (!Array.isArray(result)) {
    throw new TypeError(
      `SEO entries hook for page "${context.page}" must return an array`
    );
  }

  return result;
}

async function findPageTemplates(directory: string): Promise<StaticSeoSource[]> {
  const discovered = await findPageTemplateCandidates(directory, directory);
  const byFolder = new Map<string, StaticSeoSource>();

  for (const source of discovered) {
    const existing = byFolder.get(source.folder);

    if (!existing || source.type === "folder") {
      byFolder.set(source.folder, source);
    }
  }

  return [...byFolder.values()];
}

async function findPageTemplateCandidates(
  root: string,
  directory: string
): Promise<StaticSeoSource[]> {
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
        return findPageTemplateCandidates(root, path);
      }

      if (!entry.isFile()) return [];

      if (entry.name === "index.html") {
        const folder = relative(root, directory)
          .split(sep)
          .join("/");

        return [{
          folder,
          path,
          type: "folder" as const
        }];
      }

      if (entry.name.endsWith(VD_SINGLE_FILE.EXTENSION)) {
        const folder = relative(
          root,
          path.slice(0, -VD_SINGLE_FILE.EXTENSION.length)
        ).split(sep).join("/");

        return [{
          folder,
          path,
          type: "single-file" as const
        }];
      }

      return [];
    })
  );

  return nested.flat();
}

async function loadPageConfig(
  source: StaticSeoSource
): Promise<PageConfig | undefined> {
  if (source.type === "single-file") {
    return loadSingleFilePageConfig(source.path);
  }

  const pageDirectory = dirname(source.path);

  for (const filename of VD_RESOURCE_ADAPTER.FILES.CONFIG_VARIANTS) {
    const path = join(pageDirectory, filename);

    try {
      const details = await stat(path);
      const module = filename.endsWith(".ts")
        ? await loadTypeScriptPageConfig(path)
        : await importVersionedModule(path, details.mtimeMs);

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

async function loadTypeScriptPageConfig(path: string) {
  const source = await readFile(path, "utf8");
  let typescript: typeof import("typescript");

  try {
    typescript = await import("typescript");
  } catch (error) {
    throw new Error(
      `[VeloDom] ${path} requires TypeScript as an application dev dependency.`,
      {
        cause: error
      }
    );
  }

  const transformed = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
      verbatimModuleSyntax: false
    },
    fileName: path,
    reportDiagnostics: true
  });
  const diagnostic = transformed.diagnostics?.find(item => (
    item.category === typescript.DiagnosticCategory.Error
  ));

  if (diagnostic) {
    throw new SyntaxError(
      `[VeloDom] ${path}: ${typescript.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
    );
  }

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(transformed.outputText)}`
    );
  } catch (error) {
    throw new Error(
      `[VeloDom] Could not evaluate ${path}. Keep config.ts self-contained and use type-only imports.`,
      {
        cause: error
      }
    );
  }
}

async function importVersionedModule(path: string, version: number) {
  const url = pathToFileURL(path);

  url.searchParams.set("vd-seo", String(version));
  return import(url.href);
}

async function loadSingleFilePageConfig(
  path: string
): Promise<PageConfig | undefined> {
  const source = await readFile(path, "utf8");
  const descriptor = parseVeloDomSingleFile(source, path);

  if (!descriptor.config) return undefined;

  const module = await import(
    `data:text/javascript;charset=utf-8,${encodeURIComponent(descriptor.config)}`
  );

  return module.default as PageConfig | undefined;
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

async function resolveStaticContent(
  page: StaticSeoPage,
  options: {
    root: string;
    renderPage?: SeoStaticRenderHook;
  }
): Promise<SeoStaticContent | undefined> {
  const renderPage = page.renderPage || options.renderPage;

  if (!renderPage) return undefined;

  const result = await renderPage({
    page: page.page,
    route: page.route,
    root: options.root,
    seo: page.seo,
    data: page.data
  });

  if (result === undefined || result === null) return undefined;

  const content = typeof result === "string"
    ? {
      html: result
    }
    : result;

  if (
    typeof content !== "object"
    || typeof content.html !== "string"
  ) {
    throw new TypeError(
      `Static SEO render hook for "${page.route}" must return HTML or a static content object`
    );
  }

  if (!content.html.trim()) return undefined;

  if (
    content.mode !== undefined
    && content.mode !== "replace"
    && content.mode !== "append"
  ) {
    throw new TypeError(
      `Static SEO render hook for "${page.route}" returned unsupported mode "${String(content.mode)}"`
    );
  }

  assertSafeStaticContent(content.html, page.route);

  return {
    html: content.html.trim(),
    mode: content.mode,
    hydration: content.hydration === false
      ? false
      : "client-takeover"
  };
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

function renderAppStaticContent(
  staticContent: SeoStaticContent | undefined,
  heading: string,
  text: string,
  page: string | undefined,
  route: string | undefined,
  data: unknown
) {
  const dataTransfer = page && route
    ? renderPageDataTransfer(page, route, data)
    : "";

  if (!staticContent?.html) {
    return `${renderSummary(heading, text)}${dataTransfer}`;
  }

  const staticHtml = renderStaticContent(staticContent);

  if (staticContent.mode === "append") {
    return [
      renderSummary(heading, text),
      staticHtml,
      dataTransfer
    ].join("\n");
  }

  return `${staticHtml}${dataTransfer}`;
}

function renderStaticContent(staticContent: SeoStaticContent) {
  const hydration = staticContent.hydration === false
    ? ""
    : ` ${VD_SEO.STATIC_HYDRATION_ATTRIBUTE}="client-takeover"`;

  return [
    `<section ${VD_SEO.STATIC_CONTENT_ATTRIBUTE}${hydration} aria-label="Static page content">`,
    staticContent.html,
    "</section>"
  ].join("\n");
}

function assertSafeStaticContent(html: string, route: string) {
  if (/<\/?script\b/i.test(html)) {
    throw new Error(
      `Static SEO render hook for "${route}" must not return script tags; use seo.jsonLd or the application shell instead`
    );
  }
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
