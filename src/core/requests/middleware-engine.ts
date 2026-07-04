import {
  VD_MIDDLEWARE,
  VD_REQUEST
} from "../constants.ts";

export function defineRequestMiddleware(
  handler,
  {
    mode = VD_MIDDLEWARE.MODES.TRANSFORM
  } = {}
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

export function resolveRequestMiddleware(entries = [], { custom = {} } = {}) {
  if (!Array.isArray(entries)) {
    return {
      error: "middleware must be an array"
    };
  }

  const registry = normalizeMiddlewareRegistry(custom);

  if (registry.error) {
    return registry;
  }

  const resolved = [];

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
        available: listMiddlewareNames(registry.value)
      };
    }

    const name = normalizeMiddlewareName(entry);

    if (!name || !Object.hasOwn(registry.value, name)) {
      return {
        error: `unknown middleware "${entry.trim()}"`,
        available: listMiddlewareNames(registry.value)
      };
    }

    resolved.push(createMiddlewareDescriptor(name, registry.value[name]));
  }

  return {
    value: resolved
  };
}

export async function executeRequestMiddleware({
  middleware = [],
  params = {},
  context = {},
  handler
}: any = {}) {
  if (typeof handler !== "function") {
    throw createMiddlewareError(
      "Request middleware pipeline is missing a route handler"
    );
  }

  if (!isPlainObject(params)) {
    throw createMiddlewareError("Request params must be a plain object");
  }

  let effectiveParams = { ...params };

  async function dispatch(index, currentParams) {
    if (index >= middleware.length) {
      effectiveParams = { ...currentParams };
      return handler(effectiveParams, context);
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
    let downstream;

    const next = (updatedParams = nextParams) => {
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

    const downstreamResult = await downstream;

    return result === undefined
      ? downstreamResult
      : result;
  }

  const result = await dispatch(0, effectiveParams);

  return {
    result,
    params: effectiveParams
  };
}

function normalizeMiddlewareRegistry(registry) {
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
    value: registry
  };
}

function normalizeMiddlewareName(value) {
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

function listMiddlewareNames(registry) {
  return Object.keys(registry).sort();
}

function createMiddlewareDescriptor(name, handler) {
  return {
    name,
    handler,
    mode: handler[VD_MIDDLEWARE.MODE] || VD_MIDDLEWARE.MODES.TRANSFORM
  };
}

function normalizeMiddlewareDescriptor(entry, index) {
  if (typeof entry === "function") {
    return createMiddlewareDescriptor(
      entry.name || `middleware${index + 1}`,
      entry
    );
  }

  if (
    entry
    && typeof entry === "object"
    && typeof entry.handler === "function"
    && Object.values(VD_MIDDLEWARE.MODES).includes(entry.mode)
  ) {
    return entry;
  }

  throw createMiddlewareError(
    `Middleware at index ${index} is invalid`
  );
}

async function callMiddleware(descriptor, callback) {
  try {
    return await callback();
  } catch (error) {
    if (error?.__vdStage) {
      throw error;
    }

    const wrapped = createMiddlewareError(
      error?.message || `Middleware "${descriptor.name}" failed`
    );
    wrapped.cause = error;
    wrapped.__vdMiddleware = descriptor.name;
    throw wrapped;
  }
}

function createMiddlewareError(message) {
  const error = new Error(message);
  error.__vdStage = VD_REQUEST.STAGES.MIDDLEWARE;
  error.__vdHint = "Check the middleware names registered through createApp({ middleware }).";
  return error;
}

function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
