/**
 * ----------------------------------------
 * Module: Optional Request Tools
 * ----------------------------------------
 *
 * Provides opt-in cache, retry, and devtools helpers without changing the
 * default request runtime or installing browser globals automatically.
 * ----------------------------------------
 */

import {
  VD_OPTIONAL_TOOLS
} from "./constants.ts";
import {
  requestJson as sendJsonRequest
} from "./requests/http-client.ts";
import type {
  DevtoolsPluginOptions,
  DevtoolsBridge,
  DevtoolsSnapshot,
  PluginContext,
  RequestCache,
  RequestCacheOptions,
  RequestRetryOptions,
  RouteHandler,
  UnknownRecord,
  VeloDomPlugin
} from "./types.ts";
import type {
  JsonRequestOptions
} from "./requests/http-client.ts";

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

/**
 * Creates an application-owned request cache around requestJson().
 *
 * Only GET-like requests without a body are cached. Mutating requests always
 * pass through to the underlying HTTP client.
 */
export function createRequestCache(
  options: RequestCacheOptions = {}
): RequestCache {
  const entries = new Map<string, CacheEntry>();
  const ttlMs = normalizeNonNegativeNumber(
    options.ttlMs,
    VD_OPTIONAL_TOOLS.DEFAULT_CACHE_TTL_MS
  );
  const createKey = typeof options.key === "function"
    ? options.key
    : createDefaultCacheKey;

  return Object.freeze({
    async requestJson(url, requestOptions = {}) {
      const jsonOptions = requestOptions as JsonRequestOptions;

      if (!isCacheableRequest(jsonOptions)) {
        return sendJsonRequest(url, jsonOptions);
      }

      const key = createKey(url, requestOptions);
      const cached = entries.get(key);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }

      const value = await sendJsonRequest(url, jsonOptions);

      entries.set(key, {
        value,
        expiresAt: ttlMs > 0
          ? Date.now() + ttlMs
          : Number.POSITIVE_INFINITY
      });

      return value;
    },

    clear(key?: string) {
      if (key === undefined) {
        entries.clear();
        return;
      }

      entries.delete(key);
    },

    get size() {
      return entries.size;
    }
  });
}

/** Wraps an application request route handler with explicit retry behavior. */
export function withRequestRetry(
  handler: RouteHandler,
  options: RequestRetryOptions = {}
): RouteHandler {
  if (typeof handler !== "function") {
    throw new TypeError("VeloDom retry wrapper requires a request handler");
  }

  const retries = normalizeRetryCount(options.retries);
  const delayMs = normalizeNonNegativeNumber(
    options.delayMs,
    VD_OPTIONAL_TOOLS.DEFAULT_RETRY_DELAY_MS
  );
  const shouldRetry = typeof options.shouldRetry === "function"
    ? options.shouldRetry
    : () => true;

  return async (params, context) => {
    let failures = 0;

    for (;;) {
      try {
        return await handler(params, context);
      } catch (error) {
        const nextAttempt = failures + 1;

        if (
          failures >= retries
          || context?.signal?.aborted
          || !shouldRetry(error, nextAttempt)
        ) {
          throw error;
        }

        failures = nextAttempt;

        if (delayMs > 0) {
          await delay(delayMs);
        }
      }
    }
  };
}

/**
 * Creates an optional devtools bridge plugin.
 *
 * The browser global is installed only when this plugin is registered and is
 * removed during plugin cleanup if it still points to the same bridge.
 */
export function createDevtoolsPlugin(
  options: DevtoolsPluginOptions = {}
): VeloDomPlugin {
  const globalName = normalizeGlobalName(options.globalName);
  const enabled = options.enabled !== false;

  return {
    setup(context) {
      if (!enabled || typeof window === "undefined") return;

      const bridge = createDevtoolsBridge(context);
      const globals = window as unknown as Record<string, unknown>;

      globals[globalName] = bridge;

      return () => {
        if (globals[globalName] === bridge) {
          Reflect.deleteProperty(globals, globalName);
        }
      };
    }
  };
}

function createDevtoolsBridge({
  app,
  navigate
}: PluginContext): DevtoolsBridge {
  return Object.freeze({
    get app() {
      return app;
    },
    inspect(): DevtoolsSnapshot {
      return {
        sharedStateNames: Object.keys(app.shared || {})
      };
    },
    navigate
  });
}

function createDefaultCacheKey(
  url: RequestInfo | URL,
  options: UnknownRecord = {}
) {
  const method = String(
    options.method || VD_OPTIONAL_TOOLS.GET_METHOD
  ).toUpperCase();

  return `${method} ${String(url)}`;
}

function isCacheableRequest(options: JsonRequestOptions) {
  const method = String(
    options.method || VD_OPTIONAL_TOOLS.GET_METHOD
  ).toUpperCase();

  return method === VD_OPTIONAL_TOOLS.GET_METHOD && options.body === undefined;
}

function normalizeRetryCount(value: unknown) {
  const retries = Number.isInteger(value)
    ? Number(value)
    : VD_OPTIONAL_TOOLS.DEFAULT_RETRIES;

  if (retries < 0) {
    throw new TypeError("VeloDom retry count cannot be negative");
  }

  return retries;
}

function normalizeNonNegativeNumber(
  value: unknown,
  fallback: number
) {
  if (value === undefined) return fallback;

  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new TypeError("VeloDom optional tool delays and TTLs cannot be negative");
  }

  return normalized;
}

function normalizeGlobalName(value: unknown) {
  const normalized = String(
    value || VD_OPTIONAL_TOOLS.DEFAULT_DEVTOOLS_GLOBAL
  ).trim();

  if (!normalized) {
    throw new TypeError("VeloDom devtools global name cannot be empty");
  }

  return normalized;
}

function delay(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
