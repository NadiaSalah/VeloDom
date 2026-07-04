import { isPlainObject } from "./shared/object.ts";

export function createRouteTable(pageNames: string[] = [], configs: any = {}) {
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

export function resolveRouteLocation(input, routeTable) {
  const url = new URL(
    String(input || "/"),
    "http://velodom.local"
  );
  const pathname = normalizePathname(url.pathname);
  const pathSegments = splitPath(pathname);

  for (const route of routeTable) {
    const params = matchSegments(route.segments, pathSegments);

    if (!params) continue;

    return {
      matched: true,
      page: route.page,
      path: pathname,
      pattern: route.path,
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
    params: {},
    query: parseQuery(url.searchParams),
    meta: {},
    beforeEnter: null
  };
}

export async function runNavigationGuards(guards, to, from) {
  for (const guard of guards) {
    if (typeof guard !== "function") continue;

    const result = await guard({
      to,
      from
    });

    if (result === false) {
      return {
        allowed: false,
        redirect: ""
      };
    }

    if (typeof result === "string" && result.startsWith("/")) {
      return {
        allowed: false,
        redirect: result
      };
    }
  }

  return {
    allowed: true,
    redirect: ""
  };
}

function folderToRoutePattern(page) {
  if (page === "home") return "/";

  return `/${String(page || "")
    .split("/")
    .filter(Boolean)
    .map(segment => {
      const dynamic = segment.match(/^\[([A-Za-z_$][\w$]*)\]$/);

      return dynamic
        ? `:${dynamic[1]}`
        : segment;
    })
    .join("/")}`;
}

function normalizeRoutePattern(path) {
  const normalized = normalizePathname(path);

  if (normalized.includes("..")) {
    throw new TypeError(`Invalid route pattern "${path}"`);
  }

  return normalized;
}

function normalizePathname(path) {
  const value = String(path || "/")
    .trim()
    .replace(/\/{2,}/g, "/");
  const withLeadingSlash = value.startsWith("/")
    ? value
    : `/${value}`;

  if (withLeadingSlash === "/") return "/";

  return withLeadingSlash.replace(/\/+$/g, "");
}

function splitPath(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean);
}

function calculateRouteScore(segments) {
  return segments.reduce((score, segment) => (
    score + (segment.startsWith(":") ? 2 : 3)
  ), 0) + segments.length;
}

function matchSegments(routeSegments, pathSegments) {
  if (routeSegments.length !== pathSegments.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const expected = routeSegments[index];
    const actual = pathSegments[index];

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

function decodePathValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
