/**
 * ----------------------------------------
 * Module: Request Middleware Engine
 * ----------------------------------------
 *
 * Resolves built-in and application middleware, then executes transform or
 * explicit next-based pipelines around request route handlers.
 * ----------------------------------------
 */

import {
  VD_MIDDLEWARE,
  VD_REQUEST
} from "../constants.ts";
import { isPlainObject } from "../shared/object.ts";
import { assertRequestActive, isRequestAbortError } from "../shared/cancellation.ts";
import {
  getThrownString,
  hasThrownProperty
} from "../shared/thrown.ts";
import type {
  MaybePromise,
  RequestContext,
  RequestMiddleware,
  RouteHandler,
  StateRecord
} from "../types.ts";

type MiddlewareMode = "transform" | "pipeline";

interface DefineMiddlewareOptions {
  mode?: MiddlewareMode;
}

interface ResolveMiddlewareOptions {
  custom?: unknown;
}

interface ExecuteMiddlewareOptions {
  middleware?: unknown[];
  params?: unknown;
  context?: RequestContext;
  handler?: RouteHandler;
}

interface MiddlewareDescriptor {
  name: string;
  handler: RequestMiddleware;
  mode: MiddlewareMode;
}

interface MiddlewareResolution {
  value?: MiddlewareDescriptor[];
  error?: string;
  available?: string[];
}

interface MiddlewareRegistryResolution {
  value?: Record<string, RequestMiddleware>;
  error?: string;
}

/** Marks a middleware function with an explicit execution mode. */
export function defineRequestMiddleware(
  handler: RequestMiddleware,
  {
    mode = VD_MIDDLEWARE.MODES.TRANSFORM
  }: DefineMiddlewareOptions = {}
) {
  if (typeof handler !== "function") {
    throw new TypeError("Middleware handler must be a function");
  }

  if (!Object.values(VD_MIDDLEWARE.MODES).includes(mode)) {
    throw new TypeError('Middleware mode must be "transform" or "pipeline"');
  }

  Object.defineProperty(handler, VD_MIDDLEWARE.MODE, {
    configurable: false,
    enumerable: false,
    value: mode,
    writable: false
  });

  return handler;
}

/** Resolves middleware names/functions against trusted registries. */
export function resolveRequestMiddleware(
  entries: unknown = [],
  {
    custom = {}
  }: ResolveMiddlewareOptions = {}
): MiddlewareResolution {
  if (!Array.isArray(entries)) {
    return {
      error: "middleware must be an array"
    };
  }

  const registry = normalizeMiddlewareRegistry(custom);

  if (registry.error) {
    return {
      error: registry.error
    };
  }

  const resolved: MiddlewareDescriptor[] = [];
  const handlers = registry.value || {};

  for (const entry of entries) {
    if (typeof entry === "function") {
      resolved.push(createMiddlewareDescriptor(
        entry.name || "inlineMiddleware",
        entry
      ));
      continue;
    }

    if (typeof entry !== "string" || !entry.trim()) {
      return {
        error: "middleware entries must be non-empty strings or functions",
        available: listMiddlewareNames(handlers)
      };
    }

    const name = normalizeMiddlewareName(entry);

    if (!name || !Object.hasOwn(handlers, name)) {
      return {
        error: `unknown middleware "${entry.trim()}"`,
        available: listMiddlewareNames(handlers)
      };
    }

    const handler = handlers[name];

    if (!handler) {
      return {
        error: `unknown middleware "${entry.trim()}"`,
        available: listMiddlewareNames(handlers)
      };
    }

    resolved.push(createMiddlewareDescriptor(name, handler));
  }

  return {
    value: resolved
  };
}

/** Executes resolved middleware and the final request handler. */
export async function executeRequestMiddleware({
  middleware = [],
  params = {},
  context = {},
  handler
}: ExecuteMiddlewareOptions = {}): Promise<{
  result: unknown;
  params: StateRecord;
}> {
  if (typeof handler !== "function") {
    throw createMiddlewareError(
      "Request middleware pipeline is missing a route handler"
    );
  }

  const routeHandler = handler;

  if (!isPlainObject(params)) {
    throw createMiddlewareError("Request params must be a plain object");
  }

  let effectiveParams = { ...params };

  /** Dispatches the requested value. */
  async function dispatch(
    index: number,
    currentParams: StateRecord
  ): Promise<unknown> {
    assertRequestActive(context.signal);
    if (index >= middleware.length) {
      effectiveParams = { ...currentParams };
      return routeHandler(effectiveParams, context);
    }

    const descriptor = normalizeMiddlewareDescriptor(middleware[index], index);
    const nextParams = { ...currentParams };

    if (descriptor.mode === VD_MIDDLEWARE.MODES.TRANSFORM) {
      const transformed = await callMiddleware(
        descriptor,
        () => descriptor.handler(nextParams, context)
      );

      if (transformed === undefined) {
        return dispatch(index + 1, nextParams);
      }

      if (!isPlainObject(transformed)) {
        throw createMiddlewareError(
          `Middleware "${descriptor.name}" must return a plain object or undefined`
        );
      }

      effectiveParams = { ...transformed };
      return dispatch(index + 1, effectiveParams);
    }

    let nextCalled = false;
    let downstream: Promise<unknown> | undefined;

    const next = (
      updatedParams: StateRecord = nextParams
    ): Promise<unknown> => {
      if (nextCalled) {
        throw createMiddlewareError(
          `Middleware "${descriptor.name}" called next() more than once`
        );
      }

      if (!isPlainObject(updatedParams)) {
        throw createMiddlewareError(
          `Middleware "${descriptor.name}" must pass a plain object to next()`
        );
      }

      nextCalled = true;
      effectiveParams = { ...updatedParams };
      downstream = dispatch(index + 1, effectiveParams);
      return downstream;
    };

    const result = await callMiddleware(
      descriptor,
      () => descriptor.handler(nextParams, context, next)
    );

    if (!nextCalled) {
      if (result === undefined) {
        throw createMiddlewareError(
          `Pipeline middleware "${descriptor.name}" must call next() or return a response`
        );
      }

      return result;
    }

    if (!downstream) {
      throw createMiddlewareError(
        `Middleware "${descriptor.name}" did not schedule downstream work`
      );
    }

    const downstreamResult = await downstream;

    return result === undefined
      ? downstreamResult
      : result;
  }

  const result = await dispatch(0, effectiveParams);
  assertRequestActive(context.signal);

  return {
    result,
    params: effectiveParams
  };
}

/** Normalizes the middleware registry. */
function normalizeMiddlewareRegistry(
  registry: unknown
): MiddlewareRegistryResolution {
  if (!isPlainObject(registry)) {
    return {
      error: "application middleware registry must be a plain object"
    };
  }

  for (const [name, handler] of Object.entries(registry)) {
    if (!name.trim() || typeof handler !== "function") {
      return {
        error: `application middleware "${name}" must be a function`
      };
    }
  }

  return {
    value: registry as Record<string, RequestMiddleware>
  };
}

/** Normalizes the middleware name. */
function normalizeMiddlewareName(value: string): string {
  const reference = value.trim();
  const separatorIndex = reference.indexOf(":");

  if (separatorIndex === -1) {
    return reference;
  }

  const source = reference.slice(0, separatorIndex).trim().toLowerCase();

  if (source !== "app") {
    return "";
  }

  return reference.slice(separatorIndex + 1).trim();
}

/** Lists the middleware names. */
function listMiddlewareNames(
  registry: Record<string, RequestMiddleware>
) {
  return Object.keys(registry).sort();
}

/** Creates the middleware descriptor. */
function createMiddlewareDescriptor(
  name: string,
  handler: RequestMiddleware
): MiddlewareDescriptor {
  const markedHandler = handler as RequestMiddleware & {
    [VD_MIDDLEWARE.MODE]?: MiddlewareMode;
  };

  return {
    name,
    handler,
    mode: markedHandler[VD_MIDDLEWARE.MODE]
      || VD_MIDDLEWARE.MODES.TRANSFORM
  };
}

/** Normalizes the middleware descriptor. */
function normalizeMiddlewareDescriptor(
  entry: unknown,
  index: number
): MiddlewareDescriptor {
  if (typeof entry === "function") {
    return createMiddlewareDescriptor(
      entry.name || `middleware${index + 1}`,
      entry as RequestMiddleware
    );
  }

  if (
    entry
    && typeof entry === "object"
    && "handler" in entry
    && typeof entry.handler === "function"
    && "mode" in entry
    && typeof entry.mode === "string"
    && (Object.values(VD_MIDDLEWARE.MODES) as string[]).includes(entry.mode)
  ) {
    return entry as unknown as MiddlewareDescriptor;
  }

  throw createMiddlewareError(
    `Middleware at index ${index} is invalid`
  );
}

/** Calls the middleware. */
async function callMiddleware<TResult>(
  descriptor: MiddlewareDescriptor,
  callback: () => MaybePromise<TResult>
): Promise<TResult> {
  try {
    return await callback();
  } catch (error) {
    if (isRequestAbortError(error) || hasThrownProperty(error, "__vdStage")) {
      throw error;
    }

    const wrapped = createMiddlewareError(
      getThrownString(
        error,
        "message",
        `Middleware "${descriptor.name}" failed`
      )
    );
    wrapped.cause = error;
    wrapped.__vdMiddleware = descriptor.name;
    throw wrapped;
  }
}

/** Creates the middleware error. */
function createMiddlewareError(message: string): Error {
  const error = new Error(message);
  error.__vdStage = VD_REQUEST.STAGES.MIDDLEWARE;
  error.__vdHint = "Check the middleware names registered through createApp({ middleware }).";
  return error;
}
