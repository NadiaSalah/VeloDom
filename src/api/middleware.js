import {
  defineRequestMiddleware,
  VD_MIDDLEWARE
} from "../core/index.js";

export function trimStringFields(params = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [
        key,
        typeof value === "string"
          ? value.trim()
          : value
      ])
  );
}

export function removeEmptyFields(params = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

export async function requestLogger(params, context, next) {
  const startedAt = performance.now();

  try {
    return await next(params);
  } finally {
    const duration = Math.round(performance.now() - startedAt);
    console.info(`[VeloDom] ${context.routeName} completed in ${duration}ms`);
  }
}

export default {
  trimStringFields,
  removeEmptyFields,
  requestLogger: defineRequestMiddleware(requestLogger, {
    mode: VD_MIDDLEWARE.MODES.PIPELINE
  })
};
