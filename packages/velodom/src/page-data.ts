/**
 * ----------------------------------------
 * Module: Page Data Contract
 * ----------------------------------------
 *
 * Resolves conventional page data modules in the browser and transfers
 * explicitly supplied build data through safe JSON script markers. The module
 * contains no fetching policy: applications own data access. An optional,
 * per-app in-memory freshness cache avoids repeat client loads only when a
 * page explicitly opts in.
 * ----------------------------------------
 */

import { VD_PAGE_DATA } from "./constants.ts";
import type {
  PageDataContext,
  PageDataCachePolicy,
  PageDataLoader,
  ResourceLoader,
  RouteLocation,
  UnknownRecord
} from "./types.ts";

interface PageDataModule extends UnknownRecord {
  cache?: PageDataCachePolicy;
}

interface CachedPageData {
  data: unknown;
  loadedAt: number;
}

/** Holds the private cache used by one browser router instance. */
export interface PageDataCache {
  load(module: PageDataModule, context: Omit<PageDataContext, "mode">): Promise<unknown>;
}

/** Resolves the preferred `load` export or default export from a page data module. */
export function resolvePageDataLoader(
  module: PageDataModule,
  page: string
): PageDataLoader {
  const loader = module.load || module.default;

  if (typeof loader !== "function") {
    throw new TypeError(
      `Page data module for "${page}" must export load(context) or a default function`
    );
  }

  return loader as PageDataLoader;
}

/** Creates an isolated, opt-in page-data cache for one VeloDom application. */
export function createPageDataCache(
  now: () => number = Date.now
): PageDataCache {
  const entries = new Map<string, CachedPageData>();

  return {
    async load(module, context) {
      const policy = resolveCachePolicy(module, context.page);

      if (!policy) {
        return runPageDataLoader(module, context);
      }

      const key = createCacheKey(context);
      const entry = entries.get(key);
      const age = entry ? Math.max(0, now() - entry.loadedAt) : Infinity;

      if (entry && age <= policy.maxAgeMs) {
        return entry.data;
      }

      const staleLimit = policy.maxAgeMs + policy.staleWhileRevalidateMs;

      if (entry && age <= staleLimit) {
        // Keep navigation immediate; the refreshed value is used on the next visit.
        void refreshPageData(entries, key, module, context, now);
        return entry.data;
      }

      return refreshPageData(entries, key, module, context, now);
    }
  };
}

/** Loads application-owned client data for one resolved page route. */
export async function loadClientPageData(
  loader: ResourceLoader<UnknownRecord> | undefined,
  context: Omit<PageDataContext, "mode">,
  cache?: PageDataCache
): Promise<unknown> {
  if (!loader) return undefined;

  const module = await loader() as PageDataModule;

  return cache
    ? cache.load(module, context)
    : runPageDataLoader(module, context);
}

/** Renders build-only page data for direct static-route visits. */
export function renderPageDataTransfer(
  page: string,
  route: string,
  data: unknown
): string {
  if (data === undefined) return "";

  return [
    `<script type="application/json" ${VD_PAGE_DATA.ATTRIBUTE}`,
    ` ${VD_PAGE_DATA.PAGE_ATTRIBUTE}="${escapeAttribute(page)}"`,
    ` ${VD_PAGE_DATA.ROUTE_ATTRIBUTE}="${escapeAttribute(route)}">`,
    serializePageData(data, route),
    "</script>"
  ].join("");
}

/** Reads and consumes matching build data before the router replaces `#app`. */
export function consumePageDataTransfer(
  doc: Document,
  page: string,
  route: RouteLocation
): {
  found: boolean;
  data: unknown;
} {
  const node = doc.querySelector(VD_PAGE_DATA.SCRIPT_SELECTOR);

  if (!node || node.tagName !== "SCRIPT") {
    return {
      found: false,
      data: undefined
    };
  }

  const script = node as HTMLScriptElement;
  const expectedPage = script.getAttribute(VD_PAGE_DATA.PAGE_ATTRIBUTE);
  const expectedRoute = script.getAttribute(VD_PAGE_DATA.ROUTE_ATTRIBUTE);

  if (expectedPage !== page || expectedRoute !== route.path) {
    return {
      found: false,
      data: undefined
    };
  }

  try {
    return {
      found: true,
      data: JSON.parse(script.textContent || "null")
    };
  } catch (error) {
    throw new SyntaxError(
      `Invalid static page data for "${route.path}"`,
      {
        cause: error
      }
    );
  } finally {
    script.remove();
  }
}

function serializePageData(data: unknown, route: string) {
  try {
    return JSON.stringify(data)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  } catch (error) {
    throw new TypeError(
      `Static page data for "${route}" must be JSON-serializable`,
      {
        cause: error
      }
    );
  }
}

async function runPageDataLoader(
  module: PageDataModule,
  context: Omit<PageDataContext, "mode">
) {
  const load = resolvePageDataLoader(module, context.page);

  return load({
    ...context,
    mode: VD_PAGE_DATA.MODES.CLIENT
  });
}

async function refreshPageData(
  entries: Map<string, CachedPageData>,
  key: string,
  module: PageDataModule,
  context: Omit<PageDataContext, "mode">,
  now: () => number
) {
  const data = await runPageDataLoader(module, context);

  entries.set(key, {
    data,
    loadedAt: now()
  });

  return data;
}

function resolveCachePolicy(
  module: PageDataModule,
  page: string
): Required<PageDataCachePolicy> | null {
  if (module.cache === undefined) return null;

  if (!module.cache || typeof module.cache !== "object") {
    throw new TypeError(`Page data cache for "${page}" must be an object`);
  }

  const maxAgeMs = Number(module.cache.maxAgeMs);
  const staleWhileRevalidateMs = Number(module.cache.staleWhileRevalidateMs || 0);

  if (!Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
    throw new TypeError(`Page data cache for "${page}" needs a non-negative maxAgeMs`);
  }

  if (!Number.isFinite(staleWhileRevalidateMs) || staleWhileRevalidateMs < 0) {
    throw new TypeError(
      `Page data cache for "${page}" needs a non-negative staleWhileRevalidateMs`
    );
  }

  return {
    maxAgeMs,
    staleWhileRevalidateMs
  };
}

function createCacheKey(context: Omit<PageDataContext, "mode">) {
  return `${VD_PAGE_DATA.CACHE_KEY_PREFIX}${context.page}:${context.route.path}:${stableJson(context.query)}`;
}

function stableJson(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .map(key => [key, value[key]])
  );
}

function escapeAttribute(value: string) {
  return value.replace(/[&"'<>]/g, character => ({
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&#39;",
    "<": "&lt;",
    ">": "&gt;"
  })[character] || character);
}
