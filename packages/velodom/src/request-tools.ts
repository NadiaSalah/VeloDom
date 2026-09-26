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
import type {
  DevtoolsPluginOptions,
  DevtoolsBridge,
  DevtoolsSnapshot,
  PluginContext,
  RequestRetryOptions,
  RouteHandler,
  VeloDomPlugin
} from "./types.ts";
import {
  createDevtoolsRuntimeSession
} from "./devtools/runtime.ts";
import {
  VELODOM_DEVTOOLS_PROTOCOL_VERSION
} from "./devtools/protocol.ts";
import {
  assertRequestActive, isRequestAbortError, waitForRetryDelay
} from "./requests/cancellation.ts";
/** Optional cache stays available here while its coordination is owned by one module. */
export { createRequestCache } from "./requests/request-cache.ts";

/** Wraps a handler with explicit retry; cancellation is never a retryable failure. */
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
      assertRequestActive(context?.signal);
      try {
        const result = await handler(params, context);
        assertRequestActive(context?.signal);
        return result;
      } catch (error) {
        const nextAttempt = failures + 1;

        if (
          failures >= retries
          || context?.signal?.aborted
          || isRequestAbortError(error)
          || !shouldRetry(error, nextAttempt)
        ) {
          throw error;
        }

        failures = nextAttempt;

        if (delayMs > 0) {
          await waitForRetryDelay(delayMs, context?.signal);
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
      if (!enabled || typeof window === "undefined") return undefined;

      const globals = window as unknown as Record<string, unknown>;
      const existing = globals[globalName];

      if (isDevtoolsBridge(existing)) return undefined;

      const bridge = createDevtoolsBridge(context, options);

      globals[globalName] = bridge;

      return () => {
        if (globals[globalName] === bridge) {
          Reflect.deleteProperty(globals, globalName);
        }
        bridge.destroy();
      };
    }
  };
}

/** Creates the devtools bridge. */
function createDevtoolsBridge({
  app,
  navigate
}: PluginContext, options: DevtoolsPluginOptions) {
  const session = createDevtoolsRuntimeSession(app, {
    eventLimit: options.eventLimit
  });
  const bridge = {
    get app() {
      return app;
    },
    protocolVersion: VELODOM_DEVTOOLS_PROTOCOL_VERSION,
    clearEvents: () => session.clearEvents(),
    destroy: () => session.destroy(),
    highlight: (id: string) => session.highlight(id),
    inspect: (): DevtoolsSnapshot => session.inspect(),
    navigate,
    subscribe: (callback: Parameters<DevtoolsBridge["subscribe"]>[0]) => (
      session.subscribe(callback)
    )
  };

  return Object.freeze(bridge);
}

/** Returns whether a global value already implements the public bridge. */
function isDevtoolsBridge(value: unknown): value is DevtoolsBridge {
  return Boolean(value)
    && typeof value === "object"
    && typeof (value as DevtoolsBridge).inspect === "function"
    && typeof (value as DevtoolsBridge).subscribe === "function";
}

/** Normalizes the retry count. */
function normalizeRetryCount(value: unknown) {
  const retries = Number.isInteger(value)
    ? Number(value)
    : VD_OPTIONAL_TOOLS.DEFAULT_RETRIES;

  if (retries < 0) {
    throw new TypeError("VeloDom retry count cannot be negative");
  }

  return retries;
}

/** Normalizes the non negative number. */
function normalizeNonNegativeNumber(
  value: unknown,
  fallback: number
) {
  if (value === undefined) return fallback;

  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new TypeError("VeloDom retry delays must be finite and non-negative");
  }

  return normalized;
}

/** Normalizes the global name. */
function normalizeGlobalName(value: unknown) {
  const normalized = String(
    value || VD_OPTIONAL_TOOLS.DEFAULT_DEVTOOLS_GLOBAL
  ).trim();

  if (!normalized) {
    throw new TypeError("VeloDom devtools global name cannot be empty");
  }

  return normalized;
}
