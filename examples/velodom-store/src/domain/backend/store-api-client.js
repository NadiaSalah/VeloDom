/**
 * ----------------------------------------
 * Module: Store HTTP API Client
 * ----------------------------------------
 *
 * Defines the browser-visible, replaceable HTTP contract used by the example.
 * It contains endpoint paths and request shaping only—never server credentials,
 * permission rules, inventory authority, or order transitions.
 * ----------------------------------------
 */

import { requestJson } from "velodom";

/** @typedef {import("./contracts.js").StoreRequestContext} StoreRequestContext */
/** @typedef {import("./contracts.js").StoreQueryInput} StoreQueryInput */

/** Public fixture origin/path; replace it explicitly with the application's backend. */
export const STORE_API_BASE = "/__fixture-api";

/**
 * Reads the current no-store server session.
 * @param {StoreQueryInput} [_input]
 * @param {StoreRequestContext} [context]
 * @returns {Promise<import("./contracts.js").StoreSession>}
 */
export function getStoreSession(_input = {}, context = {}) {
  return /** @type {Promise<import("./contracts.js").StoreSession>} */ (requestJson(`${STORE_API_BASE}/session`, {
    cache: "no-store",
    credentials: "same-origin",
    signal: context.signal
  }));
}

/**
 * Replaces the current fixture session with one explicit demo account.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 * @returns {Promise<import("./contracts.js").StoreSession>}
 */
export function loginStoreSession(input = {}, context = {}) {
  return /** @type {Promise<import("./contracts.js").StoreSession>} */ (requestJson(`${STORE_API_BASE}/session/login`, {
    method: "POST",
    credentials: "same-origin",
    signal: context.signal,
    body: {
      account: readScalar(input.account)
    }
  }));
}

/**
 * Ends the current fixture session with its server-issued CSRF token.
 * @param {StoreQueryInput} [_input]
 * @param {StoreRequestContext} [context]
 * @returns {Promise<import("./contracts.js").StoreSession>}
 */
export async function logoutStoreSession(_input = {}, context = {}) {
  return /** @type {Promise<import("./contracts.js").StoreSession>} */ (requestPrivateJson("/session/logout", {
    method: "POST",
    body: {}
  }, context));
}

/**
 * Expires the current session for a deterministic recovery demonstration.
 * @param {StoreQueryInput} [_input]
 * @param {StoreRequestContext} [context]
 */
export async function expireStoreSession(_input = {}, context = {}) {
  return requestPrivateJson("/session/expire", {
    method: "POST",
    body: {}
  }, context);
}

/**
 * Lists the public catalog through the replaceable HTTP boundary.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 */
export function listCatalogFromServer(input = {}, context = {}) {
  return requestJson(withQuery("/catalog", input), {
    credentials: "same-origin",
    signal: context.signal
  });
}

/**
 * Resolves one public product through the replaceable HTTP boundary.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 */
export function getProductFromServer(input = {}, context = {}) {
  const id = encodeURIComponent(readScalar(input.id ?? input.params?.id));

  return requestJson(`${STORE_API_BASE}/catalog/${id}`, {
    credentials: "same-origin",
    signal: context.signal
  });
}

/**
 * Requests authoritative currency, stock, price, and tax values.
 * @param {import("./contracts.js").QuoteInput} [input]
 * @param {StoreRequestContext} [context]
 * @returns {Promise<import("./contracts.js").StoreQuote>}
 */
export function quoteCartFromServer(input = {}, context = {}) {
  return /** @type {Promise<import("./contracts.js").StoreQuote>} */ (requestJson(`${STORE_API_BASE}/cart/quote`, {
    method: "POST",
    credentials: "same-origin",
    signal: context.signal,
    body: input
  }));
}

/**
 * Creates one mock order using CSRF and an explicit idempotency key.
 * @param {Partial<import("./contracts.js").CreateOrderInput>} [input]
 * @param {StoreRequestContext} [context]
 * @returns {Promise<import("./contracts.js").StoreOrder>}
 */
export function createOrderFromServer(input = {}, context = {}) {
  return /** @type {Promise<import("./contracts.js").StoreOrder>} */ (requestPrivateJson("/orders", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": readScalar(input.idempotencyKey)
    },
    body: {
      lines: input.lines,
      currency: input.currency,
      expectedTotalCents: input.expectedTotalCents
    }
  }, context));
}

/**
 * Reads one private order status; the server enforces owner and tenant scope.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 * @returns {Promise<import("./contracts.js").StoreOrder>}
 */
export function getOrderFromServer(input = {}, context = {}) {
  const id = encodeURIComponent(readScalar(input.id));

  return /** @type {Promise<import("./contracts.js").StoreOrder>} */ (requestJson(`${STORE_API_BASE}/orders/${id}`, {
    cache: "no-store",
    credentials: "same-origin",
    signal: context.signal
  }));
}

/**
 * Lists authorized admin products with server-side pagination.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 */
export function listAdminProductsFromServer(input = {}, context = {}) {
  return requestJson(withQuery("/admin/products", input), {
    cache: "no-store",
    credentials: "same-origin",
    signal: context.signal
  });
}

/**
 * Reads one authorized admin product record.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 */
export function getAdminProductFromServer(input = {}, context = {}) {
  const id = encodeURIComponent(readScalar(input.id ?? input.params?.id));

  return requestJson(`${STORE_API_BASE}/admin/products/${id}`, {
    cache: "no-store",
    credentials: "same-origin",
    signal: context.signal
  });
}

/**
 * Sends one CSRF-protected optimistic admin update.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 */
export function updateAdminProductOnServer(input = {}, context = {}) {
  const id = encodeURIComponent(readScalar(input.id));

  return requestPrivateJson(`/admin/products/${id}`, {
    method: "PUT",
    body: input
  }, context);
}

/**
 * Sends one CSRF-protected, explicitly confirmed bulk status update.
 * @param {StoreQueryInput} [input]
 * @param {StoreRequestContext} [context]
 */
export function bulkUpdateAdminProductsOnServer(input = {}, context = {}) {
  return requestPrivateJson("/admin/products/bulk", {
    method: "POST",
    body: input
  }, context);
}

/**
 * Adds an app-owned CSRF header; authorization still happens on the backend.
 * @param {string} path
 * @param {import("velodom").JsonRequestOptions} options
 * @param {StoreRequestContext} context
 */
async function requestPrivateJson(path, options, context) {
  const session = context?.session?.raw || await getStoreSession({}, context);
  const csrfToken = String(
    /** @type {{ csrfToken?: unknown } | null} */ (session)?.csrfToken || ""
  ).trim();

  return requestJson(`${STORE_API_BASE}${path}`, {
    ...options,
    credentials: "same-origin",
    signal: context.signal,
    headers: {
      ...(options.headers || {}),
      "X-CSRF-Token": csrfToken
    }
  });
}

/** @param {string} path @param {StoreQueryInput} input */
function withQuery(path, input) {
  const query = new URLSearchParams();

  Object.entries(input || {}).forEach(([name, value]) => {
    if (value === undefined || value === null || value === "") return;

    const values = Array.isArray(value) ? value : [value];

    values.forEach(item => query.append(name, String(item)));
  });

  const text = query.toString();
  return `${STORE_API_BASE}${path}${text ? `?${text}` : ""}`;
}

/** @param {unknown} value */
function readScalar(value) {
  const candidate = Array.isArray(value) ? value[0] : value;

  return String(candidate ?? "").trim();
}
