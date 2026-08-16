/**
 * ----------------------------------------
 * Module: Page SEO Runtime
 * ----------------------------------------
 *
 * Validates page-owned SEO config, resolves dynamic route entries, and keeps
 * document head metadata synchronized during client-side navigation.
 * ----------------------------------------
 */

import { VD_SEO } from "./constants.ts";
import { isPlainObject } from "./shared/object.ts";
import type {
  SeoConfig,
  SeoMetadata,
  SeoOpenGraph,
  SeoRouteEntry,
  SeoSummary,
  SeoTwitterCard,
  UnknownRecord
} from "./types.ts";

/** Validates and normalizes an optional SEO declaration from page config. */
export function normalizeSeoConfig(
  value: unknown,
  label = "page seo"
): SeoConfig | undefined {
  if (value === undefined || value === null) return undefined;

  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }

  const normalized: SeoConfig = {
    ...normalizeSeoMetadata(value, label)
  };

  if (value.entries !== undefined) {
    if (Array.isArray(value.entries)) {
      normalized.entries = value.entries.map((entry, index) => (
        normalizeSeoEntry(entry, `${label}.entries[${index}]`)
      ));
    } else if (typeof value.entries !== "function") {
      throw new TypeError(`${label}.entries must be an array or function`);
    }
  }

  return normalized;
}

/** Resolves page SEO for a concrete browser path. */
export function resolvePageSeo(
  config: SeoConfig | undefined,
  path: string
): SeoMetadata | undefined {
  if (!config) return undefined;

  const normalizedPath = normalizeRoutePath(path);
  const entries = Array.isArray(config.entries)
    ? config.entries
    : [];
  const entry = entries.find(candidate => (
    normalizeRoutePath(candidate.path) === normalizedPath
  ));
  const base = {
    ...config
  };

  delete base.entries;

  return entry
    ? {
      ...base,
      ...entry
    }
    : base;
}

/** Applies one page's metadata to the active browser document. */
export function applyPageSeo(
  config: SeoConfig | undefined,
  path: string,
  doc: Document = document
) {
  preserveDocumentDefaults(doc);
  removeManagedSeoNodes(doc);

  const seo = resolvePageSeo(config, path);
  const root = doc.documentElement;
  const defaultTitle = root.getAttribute(
    VD_SEO.DEFAULT_TITLE_ATTRIBUTE
  ) || "";
  const defaultLang = root.getAttribute(
    VD_SEO.DEFAULT_LANG_ATTRIBUTE
  ) || "";

  doc.title = seo?.title || defaultTitle;
  setDocumentLang(doc, seo?.lang || defaultLang);

  if (!seo) return;

  appendMeta(doc, "name", "description", seo.description);
  appendMeta(doc, "name", "robots", seo.robots);
  appendMeta(
    doc,
    "name",
    "keywords",
    seo.keywords?.join(", ")
  );

  const canonical = resolveCanonicalUrl(
    seo.canonical,
    doc.baseURI
  );

  if (canonical) {
    appendLink(doc, "canonical", canonical);
  }

  applyOpenGraph(doc, seo, canonical);
  applyTwitterCard(doc, seo);
  appendJsonLd(doc, seo.jsonLd);
}

function normalizeSeoMetadata(
  value: UnknownRecord,
  label: string
): SeoMetadata {
  const title = requireText(value.title, `${label}.title`);
  const description = requireText(
    value.description,
    `${label}.description`
  );
  const normalized: SeoMetadata = {
    title,
    description
  };

  assignOptionalText(normalized, "canonical", value.canonical, label);
  assignOptionalText(normalized, "robots", value.robots, label);
  assignOptionalText(normalized, "lang", value.lang, label);

  if (value.keywords !== undefined) {
    if (!Array.isArray(value.keywords)) {
      throw new TypeError(`${label}.keywords must be an array`);
    }

    const keywords = value.keywords.map((keyword, index) => (
      requireText(keyword, `${label}.keywords[${index}]`)
    ));

    normalized.keywords = [...new Set(keywords)];
  }

  if (value.summary !== undefined) {
    normalized.summary = normalizeSummary(
      value.summary,
      `${label}.summary`
    );
  }

  if (value.openGraph !== undefined) {
    normalized.openGraph = normalizeTextRecord(
      value.openGraph,
      `${label}.openGraph`
    ) as SeoOpenGraph;
  }

  if (value.twitter !== undefined) {
    normalized.twitter = normalizeTwitterCard(
      value.twitter,
      `${label}.twitter`
    );
  }

  if (value.jsonLd !== undefined) {
    normalized.jsonLd = normalizeJsonLd(
      value.jsonLd,
      `${label}.jsonLd`
    );
  }

  return normalized;
}

function normalizeSeoEntry(
  value: unknown,
  label: string
): SeoRouteEntry {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }

  return {
    path: requireRoutePath(value.path, `${label}.path`),
    ...normalizeSeoMetadata(value, label)
  };
}

function normalizeSummary(
  value: unknown,
  label: string
): SeoSummary {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }

  return {
    heading: requireText(value.heading, `${label}.heading`),
    text: requireText(value.text, `${label}.text`)
  };
}

function normalizeTextRecord(
  value: unknown,
  label: string
) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      requireText(entry, `${label}.${key}`)
    ])
  );
}

function normalizeTwitterCard(
  value: unknown,
  label: string
): SeoTwitterCard {
  const normalized = normalizeTextRecord(
    value,
    label
  ) as SeoTwitterCard;

  if (
    normalized.card !== undefined
    && ![
      "summary",
      "summary_large_image"
    ].includes(normalized.card)
  ) {
    throw new TypeError(
      `${label}.card must be "summary" or "summary_large_image"`
    );
  }

  return normalized;
}

function normalizeJsonLd(
  value: unknown,
  label: string
): UnknownRecord | UnknownRecord[] {
  if (Array.isArray(value)) {
    if (!value.every(isPlainObject)) {
      throw new TypeError(`${label} entries must be plain objects`);
    }

    return value;
  }

  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object or array`);
  }

  return value;
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }

  return value.trim();
}

function requireRoutePath(value: unknown, label: string) {
  const path = requireText(value, label);

  if (
    !path.startsWith("/")
    || path.includes("..")
    || path.includes("?")
    || path.includes("#")
  ) {
    throw new TypeError(`${label} must be a safe absolute route path`);
  }

  return normalizeRoutePath(path);
}

function assignOptionalText(
  target: SeoMetadata,
  key: "canonical" | "robots" | "lang",
  value: unknown,
  label: string
) {
  if (value === undefined || value === null) return;

  target[key] = requireText(value, `${label}.${key}`);
}

function normalizeRoutePath(path: string) {
  const normalized = String(path || "/")
    .trim()
    .split(/[?#]/, 1)[0]
    .replace(/\/{2,}/g, "/");

  if (normalized === "/") return normalized;

  return normalized.replace(/\/+$/g, "");
}

function preserveDocumentDefaults(doc: Document) {
  const root = doc.documentElement;

  if (!root.hasAttribute(VD_SEO.DEFAULT_TITLE_ATTRIBUTE)) {
    root.setAttribute(
      VD_SEO.DEFAULT_TITLE_ATTRIBUTE,
      doc.title
    );
  }

  if (!root.hasAttribute(VD_SEO.DEFAULT_LANG_ATTRIBUTE)) {
    root.setAttribute(
      VD_SEO.DEFAULT_LANG_ATTRIBUTE,
      root.lang || ""
    );
  }
}

function removeManagedSeoNodes(doc: Document) {
  doc.head.querySelectorAll(
    `[${VD_SEO.MANAGED_ATTRIBUTE}]`
  ).forEach(node => node.remove());
}

function setDocumentLang(doc: Document, lang: string) {
  if (lang) {
    doc.documentElement.lang = lang;
    return;
  }

  doc.documentElement.removeAttribute("lang");
}

function appendMeta(
  doc: Document,
  attribute: "name" | "property",
  key: string,
  content: string | undefined
) {
  if (!content) return;

  const meta = doc.createElement("meta");
  meta.setAttribute(attribute, key);
  meta.setAttribute("content", content);
  meta.setAttribute(VD_SEO.MANAGED_ATTRIBUTE, "");
  doc.head.append(meta);
}

function appendLink(doc: Document, rel: string, href: string) {
  const link = doc.createElement("link");
  link.setAttribute("rel", rel);
  link.setAttribute("href", href);
  link.setAttribute(VD_SEO.MANAGED_ATTRIBUTE, "");
  doc.head.append(link);
}

function applyOpenGraph(
  doc: Document,
  seo: SeoMetadata,
  canonical: string
) {
  const graph = seo.openGraph || {};

  appendMeta(
    doc,
    "property",
    "og:title",
    graph.title || seo.title
  );
  appendMeta(
    doc,
    "property",
    "og:description",
    graph.description || seo.description
  );
  appendMeta(doc, "property", "og:type", graph.type);
  appendMeta(
    doc,
    "property",
    "og:url",
    graph.url || canonical
  );
  appendMeta(doc, "property", "og:image", graph.image);
  appendMeta(
    doc,
    "property",
    "og:image:alt",
    graph.imageAlt
  );
}

function applyTwitterCard(doc: Document, seo: SeoMetadata) {
  const card = seo.twitter;

  if (!card) return;

  appendMeta(doc, "name", "twitter:card", card.card);
  appendMeta(
    doc,
    "name",
    "twitter:title",
    card.title || seo.title
  );
  appendMeta(
    doc,
    "name",
    "twitter:description",
    card.description || seo.description
  );
  appendMeta(doc, "name", "twitter:image", card.image);
  appendMeta(
    doc,
    "name",
    "twitter:image:alt",
    card.imageAlt
  );
}

function appendJsonLd(
  doc: Document,
  value: UnknownRecord | UnknownRecord[] | undefined
) {
  if (!value) return;

  const script = doc.createElement("script");
  script.type = VD_SEO.JSON_LD_TYPE;
  script.textContent = JSON.stringify(value);
  script.setAttribute(VD_SEO.MANAGED_ATTRIBUTE, "");
  doc.head.append(script);
}

function resolveCanonicalUrl(
  value: string | undefined,
  baseUrl: string
) {
  if (!value) return "";

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}
