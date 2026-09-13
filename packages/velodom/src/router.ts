/**
 * ----------------------------------------
 * Module: Route Matching
 * ----------------------------------------
 *
 * Builds ranked route records, resolves params and query strings, and executes
 * navigation guards without loading browser resources.
 * ----------------------------------------
 */

import { isPlainObject } from "./shared/object.ts";
import { isAppRelativePath } from "./shared/path.ts";
import type {
  NavigationGuard,
  PageConfig,
  RouteLocation
} from "./types.ts";

interface NavigationGuardRunResult {
  allowed: boolean;
  redirect: string;
}

interface RouteRecord {
  page: string;
  path: string;
  segments: string[];
  meta: Record<string, unknown>;
  beforeEnter: NavigationGuard | null;
  score: number;
}

/** Builds a specificity-ranked route table from discovered page folders. */
export function createRouteTable(
  pageNames: string[] = [],
  configs: Record<string, PageConfig> = {}
): RouteRecord[] {
  return pageNames
    .filter(page => page !== "404")
    .map(page => {
      const config = configs[page] || {};
      const path = normalizeRoutePattern(
        config.path || folderToRoutePattern(page)
      );
      const segments = splitPath(path);

      return {
        page,
        path,
        segments,
        meta: isPlainObject(config.meta)
          ? {
            ...config.meta
          }
          : {},
        beforeEnter: typeof config.beforeEnter === "function"
          ? config.beforeEnter
          : null,
        score: calculateRouteScore(segments)
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Resolves a URL-like input against a route table. */
export function resolveRouteLocation(
  input: string | URL,
  routeTable: readonly RouteRecord[]
): RouteLocation {
  const url = new URL(
    String(input || "/"),
    "http://velodom.local"
  );
  const pathname = normalizePathname(url.pathname);
  const pathSegments = splitPath(pathname);
  const hash = normalizeHash(url.hash);

  for (const route of routeTable) {
    const params = matchSegments(route.segments, pathSegments);

    if (!params) continue;

    return {
      matched: true,
      page: route.page,
      path: pathname,
      pattern: route.path,
      hash,
      params,
      query: parseQuery(url.searchParams),
      meta: {
        ...route.meta
      },
      beforeEnter: route.beforeEnter
    };
  }

  return {
    matched: false,
    page: "",
    path: pathname,
    pattern: "",
    hash,
    params: {},
    query: parseQuery(url.searchParams),
    meta: {},
    beforeEnter: null
  };
}

/** Normalizes the hash. */
function normalizeHash(hash: string): string {
  return String(hash || "").replace(/^#/, "");
}

/** Runs navigation guards sequentially until one blocks or redirects. */
export async function runNavigationGuards(
  guards: readonly (NavigationGuard | null | undefined)[],
  to: RouteLocation,
  from: RouteLocation | null
): Promise<NavigationGuardRunResult> {
  for (const guard of guards) {
    if (typeof guard !== "function") continue;

    const result: unknown = await guard({
      to,
      from
    });

    if (result === true || result === undefined) {
      continue;
    }

    if (result === false) {
      return {
        allowed: false,
        redirect: ""
      };
    }

    if (typeof result === "string") {
      if (!isAppRelativePath(result)) {
        throw new TypeError(
          "Navigation guard redirects must use an app-relative path such as /login"
        );
      }

      return {
        allowed: false,
        redirect: result
      };
    }

    throw new TypeError(
      "Navigation guards must return true, false, undefined, or an app-relative path"
    );
  }

  return {
    allowed: true,
    redirect: ""
  };
}

/** Performs the internal `folderToRoutePattern()` operation. */
function folderToRoutePattern(page: string): string {
  if (page === "home") return "/";

  return `/${String(page || "")
    .split("/")
    .filter(Boolean)
    .map(segment => {
      const dynamic = segment.match(/^\[([A-Za-z_$][\w$]*)\]$/);

      return dynamic?.[1]
        ? `:${dynamic[1]}`
        : segment;
    })
    .join("/")}`;
}

/** Normalizes the route pattern. */
function normalizeRoutePattern(path: string): string {
  const normalized = normalizePathname(path);

  if (normalized.includes("..")) {
    throw new TypeError(`Invalid route pattern "${path}"`);
  }

  return normalized;
}

/** Normalizes the pathname. */
function normalizePathname(path: string): string {
  const value = String(path || "/")
    .trim()
    .replace(/\/{2,}/g, "/");
  const withLeadingSlash = value.startsWith("/")
    ? value
    : `/${value}`;

  if (withLeadingSlash === "/") return "/";

  return withLeadingSlash.replace(/\/+$/g, "");
}

/** Splits the path. */
function splitPath(path: string): string[] {
  return String(path || "")
    .split("/")
    .filter(Boolean);
}

/** Calculates the route score. */
function calculateRouteScore(segments: readonly string[]): number {
  return segments.reduce<number>((score, segment) => (
    score + (segment.startsWith(":") ? 2 : 3)
  ), 0) + segments.length;
}

/** Performs the internal `matchSegments()` operation. */
function matchSegments(
  routeSegments: readonly string[],
  pathSegments: readonly string[]
): Record<string, string> | null {
  if (routeSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const expected = routeSegments[index];
    const actual = pathSegments[index];

    if (!expected || actual === undefined) return null;

    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodePathValue(actual);
      continue;
    }

    if (expected !== actual) {
      return null;
    }
  }

  return params;
}

/** Parses the query. */
function parseQuery(searchParams: URLSearchParams) {
  const query: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length > 1
      ? values
      : values[0] || "";
  }

  return query;
}

/** Decodes the path value. */
function decodePathValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
