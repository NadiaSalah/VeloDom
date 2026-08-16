/**
 * ----------------------------------------
 * Module: Public Request Entry
 * ----------------------------------------
 *
 * Exposes supported HTTP, auth, middleware, and request constants while
 * keeping request-router internals private.
 * ----------------------------------------
 */

/** Public JSON HTTP client values. */
export {
  ApiError,
  requestJson
} from "./http-client.ts";

/** Public JSON HTTP client types. */
export type {
  ApiErrorOptions,
  JsonRequestOptions
} from "./http-client.ts";

/** Public middleware definition utility. */
export {
  defineRequestMiddleware
} from "./middleware-engine.ts";

/** Public authentication provider utilities. */
export {
  createAuthRuntime,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  normalizeAuthSession
} from "./auth.ts";

/** Public request-related constants. */
export {
  VD_AUTH,
  VD_MIDDLEWARE,
  VD_REQUEST
} from "../constants.ts";
