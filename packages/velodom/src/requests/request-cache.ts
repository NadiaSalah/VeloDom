/**
 * ----------------------------------------
 * Module: Optional Request Cache
 * ----------------------------------------
 *
 * Coordinates explicitly cached GET reads through the existing JSON client.
 * Bounds retained entries, fences invalidated completions, and shares in-flight
 * work without allowing one consumer's cancellation to abort another's read.
 * Private identity and post-write invalidation remain application-owned.
 * ----------------------------------------
 */

import { VD_INTERNAL, VD_OPTIONAL_TOOLS } from "../constants.ts";
import { requestJson } from "./http-client.ts";
import type { JsonRequestOptions } from "./http-client.ts";
import type { RequestCache, RequestCacheOptions, UnknownRecord } from "../types.ts";

interface CacheEntry {
  baseKey: string;
  expiresAt: number;
  value: unknown;
}

interface PendingRead {
  baseKey: string;
  controller: AbortController;
  consumers: number;
  promise: Promise<unknown>;
}

/**
 * Creates a bounded, opt-in GET cache; mutations use requestJson unchanged.
 * clear() invalidates stored and pending entries without discarding results
 * already awaited by a caller. Use application scope/recovery for private UI.
 */
export function createRequestCache(options: RequestCacheOptions = {}): RequestCache {
  const ttlMs = Number(options.ttlMs ?? VD_OPTIONAL_TOOLS.DEFAULT_CACHE_TTL_MS);
  const maxEntries = options.maxEntries ?? VD_OPTIONAL_TOOLS.DEFAULT_CACHE_MAX_ENTRIES;

  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new TypeError("VeloDom request cache TTL must be a non-negative finite number");
  }
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 0) {
    throw new TypeError("VeloDom request cache maxEntries must be a non-negative safe integer");
  }
  const entries = new Map<string, CacheEntry>();
  const pending = new Map<string, PendingRead>();
  let activeScope: string | undefined;

  const synchronizeScope = () => {
    const scope = typeof options.scope === "function" ? options.scope() : (options.scope ?? "");

    if (typeof scope !== "string") throw new TypeError("VeloDom request cache scope must be a string");
    if (scope !== activeScope) {
      activeScope = scope;
      entries.clear();
      pending.clear();
    }
    return scope;
  };

  const prune = () => {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= Date.now()) entries.delete(key);
    }
  };

  return Object.freeze({
    async requestJson(url: RequestInfo | URL, requestOptions: UnknownRecord = {}) {
      const jsonOptions = requestOptions as JsonRequestOptions;
      const signal = jsonOptions.signal;

      if (signal?.aborted) throw createAbortError();
      const scope = synchronizeScope();
      const method = String(jsonOptions.method || VD_OPTIONAL_TOOLS.GET_METHOD).toUpperCase();

      // Request objects carry additional hidden transport state; do not guess it.
      if (maxEntries === 0 || method !== VD_OPTIONAL_TOOLS.GET_METHOD
        || jsonOptions.body !== undefined || (typeof Request !== "undefined" && url instanceof Request)) {
        return requestJson(url, jsonOptions);
      }
      const baseKey = typeof options.key === "function"
        ? options.key(url, requestOptions)
        : `${method} ${String(url)}`;

      if (typeof baseKey !== "string") throw new TypeError("VeloDom request cache key must be a string");
      const headers = [...new Headers(jsonOptions.headers).entries()]
        .sort(([left], [right]) => left.localeCompare(right));
      const key = JSON.stringify([scope, baseKey, headers, jsonOptions.credentials || "same-origin"]);
      prune();
      const cached = entries.get(key);

      if (cached) {
        entries.delete(key);
        entries.set(key, cached);
        return cached.value;
      }
      let read = pending.get(key);

      if (!read) {
        // Saturated tracking bypasses the cache, not the application request.
        if (pending.size >= maxEntries) return requestJson(url, jsonOptions);
        const controller = new AbortController();
        const task: PendingRead = {
          baseKey, controller, consumers: 0,
          promise: Promise.resolve(undefined)
        };
        pending.set(key, task);
        task.promise = requestJson(url, { ...jsonOptions, signal: controller.signal })
          .then(value => {
            synchronizeScope();
            // Identity, not a reusable key, fences clear() and scope switch-back.
            if (pending.get(key) === task && !controller.signal.aborted) {
              prune();
              entries.delete(key);
              entries.set(key, {
                baseKey, value,
                expiresAt: ttlMs > 0 ? Date.now() + ttlMs : Infinity
              });
              while (entries.size > maxEntries) {
                const oldest = entries.keys().next().value;
                if (oldest === undefined) break;
                entries.delete(oldest);
              }
            }
            return value;
          }).finally(() => {
            if (pending.get(key) === task) pending.delete(key);
          });
        read = task;
      }
      return joinRead(read, signal, () => {
        if (pending.get(key) === read) pending.delete(key);
      });
    },
    clear(baseKey?: string) {
      if (baseKey === undefined) {
        entries.clear();
        pending.clear();
        return;
      }
      for (const [key, entry] of entries) {
        if (entry.baseKey === baseKey) entries.delete(key);
      }
      for (const [key, read] of pending) {
        if (read.baseKey === baseKey) pending.delete(key);
      }
    },
    get size() {
      synchronizeScope();
      prune();
      return entries.size;
    }
  });
}

/** Release each subscriber once; only the final cancellation aborts transport. */
function joinRead(read: PendingRead, signal: AbortSignal | null | undefined, detach: () => void) {
  read.consumers++;
  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    const release = () => {
      if (settled) return false;
      settled = true;
      read.consumers--;
      signal?.removeEventListener("abort", onAbort);
      return true;
    };
    const onAbort = () => {
      if (!release()) return;
      if (read.consumers === 0) {
        detach();
        read.controller.abort();
      }
      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
    // Attach both handlers even after cancellation so rejected transport work
    // is observed and cannot produce an abandoned unhandled rejection.
    read.promise.then(value => {
      if (release()) resolve(value);
    }, error => {
      if (release()) reject(error);
    });
  });
}

/** Matches the standard cancellation name used by the existing HTTP client. */
function createAbortError() {
  return new DOMException(VD_INTERNAL.REQUEST_ABORT_MESSAGE, VD_INTERNAL.ABORT_ERROR_NAME);
}
