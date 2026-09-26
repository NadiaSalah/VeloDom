/**
 * ----------------------------------------
 * Module: Deterministic Store Backend Fixture
 * ----------------------------------------
 *
 * Implements a replaceable HTTP boundary for sessions, catalog reads, cart
 * quotations, administration writes, and mock order status. It exists only in
 * the example's server/tooling process and must never enter a browser bundle.
 * ----------------------------------------
 */

import { createHash } from "node:crypto";
import {
  AdminConflictError,
  AdminValidationError,
  bulkUpdateAdminProducts,
  getAdminProduct,
  listAdminProducts,
  updateAdminProduct
} from "../src/domain/admin/admin-service.js";
import {
  getProduct,
  listCatalog,
  quoteCart
} from "../src/domain/catalog/catalog-service.js";
import { resetCatalogRepository } from "../src/domain/catalog/catalog-repository.js";

export const STORE_API_PREFIX = "/__fixture-api";

const SESSION_COOKIE = "vd-store-session";
const SESSION_DURATION_MS = 30 * 60 * 1000;
const TAX_RATE_BPS = 825;
const SERVER_SIGNING_SECRET = "velodom-store-server-fixture-secret-not-for-browser";
const PRODUCT_TENANT_ID = "north";
const accounts = Object.freeze({
  "admin-north": Object.freeze({
    id: "user-admin-north",
    name: "Nora Admin",
    tenantId: "north",
    roles: Object.freeze(["admin"])
  }),
  "editor-north": Object.freeze({
    id: "user-editor-north",
    name: "Eli Editor",
    tenantId: "north",
    roles: Object.freeze(["editor"])
  }),
  "customer-north": Object.freeze({
    id: "user-customer-north",
    name: "Casey Customer",
    tenantId: "north",
    roles: Object.freeze(["customer"])
  }),
  "customer-two-north": Object.freeze({
    id: "user-customer-two-north",
    name: "Cameron Customer",
    tenantId: "north",
    roles: Object.freeze(["customer"])
  }),
  "admin-south": Object.freeze({
    id: "user-admin-south",
    name: "Sam Admin",
    tenantId: "south",
    roles: Object.freeze(["admin"])
  })
});

/** Creates isolated backend state and a Fetch-compatible request handler. */
export function createStoreBackendFixture() {
  const sessions = new Map();
  const orders = new Map();
  const idempotencyKeys = new Map();
  let sessionSequence = 1;
  let orderSequence = 1;

  resetCatalogRepository();

  return {
    async handle(request) {
      const url = new URL(request.url);

      if (!url.pathname.startsWith(STORE_API_PREFIX)) return null;

      try {
        await waitForFixtureDelay(url, request.signal);
        const route = url.pathname.slice(STORE_API_PREFIX.length) || "/";
        const method = request.method.toUpperCase();

        if (method === "GET" && route === "/session") {
          return readSessionResponse(request, sessions);
        }
        if (method === "POST" && route === "/session/login") {
          const body = await readJsonBody(request);
          const accountName = String(body.account || "");
          const account = Object.hasOwn(accounts, accountName)
            ? accounts[accountName]
            : null;

          if (!account) {
            throw new HttpProblem(400, "UNKNOWN_FIXTURE_ACCOUNT", "Choose a known fixture account.");
          }

          const previousSession = getSession(request, sessions);

          if (previousSession) sessions.delete(previousSession.id);

          const id = createOpaqueValue("session", account.id, sessionSequence++);
          const session = {
            id,
            account,
            csrfToken: createOpaqueValue("csrf", id, 1),
            expiresAt: Date.now() + SESSION_DURATION_MS
          };

          sessions.set(id, session);
          return jsonResponse(200, toPublicSession(session), {
            ...privateHeaders(),
            "set-cookie": createSessionCookie(id)
          });
        }
        if (method === "POST" && route === "/session/logout") {
          const session = requireSession(request, sessions);

          requireCsrf(request, session);
          sessions.delete(session.id);
          return jsonResponse(200, {
            authenticated: false,
            message: "Signed out from the deterministic fixture."
          }, {
            ...privateHeaders(),
            "set-cookie": clearSessionCookie()
          });
        }
        if (method === "POST" && route === "/session/expire") {
          const session = requireSession(request, sessions);

          requireCsrf(request, session);
          session.expiresAt = 0;
          return jsonResponse(200, {
            message: "Fixture session expired."
          }, privateHeaders());
        }
        if (method === "GET" && route === "/catalog") {
          return jsonResponse(
            200,
            await listCatalog(Object.fromEntries(url.searchParams.entries())),
            publicHeaders()
          );
        }
        if (method === "GET" && route.startsWith("/catalog/")) {
          const id = decodeRoutePart(route.slice("/catalog/".length));

          return jsonResponse(200, await getProduct({ id }), publicHeaders());
        }
        if (method === "POST" && route === "/cart/quote") {
          const body = await readJsonBody(request);
          const quote = await createAuthoritativeQuote(body);

          return jsonResponse(200, quote, noStoreHeaders());
        }
        if (method === "POST" && route === "/orders") {
          const session = requireSession(request, sessions);

          requireOrderRole(session);
          requireCsrf(request, session);
          const body = await readJsonBody(request);
          const key = String(request.headers.get("x-idempotency-key") || "").trim();

          if (key.length < 8 || key.length > 80) {
            throw new HttpProblem(
              400,
              "ORDER_IDEMPOTENCY_KEY_REQUIRED",
              "Send an 8–80 character X-Idempotency-Key for order creation."
            );
          }

          const keyScope = `${session.account.id}:${key}`;

          const quote = await createAuthoritativeQuote(body);
          const expectedTotalCents = Number(body.expectedTotalCents);

          if (quote.lines.length === 0) {
            throw new HttpProblem(
              422,
              "ORDER_EMPTY",
              "Add at least one available item before creating an order."
            );
          }

          if (!Number.isInteger(expectedTotalCents) || expectedTotalCents !== quote.totalCents) {
            throw new HttpProblem(
              422,
              "ORDER_TOTAL_MISMATCH",
              "The submitted total does not match the authoritative quote."
            );
          }

          // Check again after asynchronous quotation; no yield may separate the
          // idempotency decision from recording this single-process fixture write.
          requireSession(request, sessions);
          if (idempotencyKeys.has(keyScope)) {
            throw new HttpProblem(
              409,
              "ORDER_DUPLICATE",
              "This order write was already accepted; check its status instead of retrying blindly."
            );
          }

          const id = `mock-order-${String(orderSequence++).padStart(3, "0")}`;
          const order = {
            id,
            tenantId: session.account.tenantId,
            userId: session.account.id,
            status: "pending-mock",
            paymentStatus: "not-charged",
            quote,
            createdAt: "2026-09-24T00:00:00.000Z"
          };

          orders.set(id, order);
          idempotencyKeys.set(keyScope, id);
          return jsonResponse(201, {
            ...toPublicOrder(order),
            message: "Mock order recorded. No charge or payment provider was used."
          }, privateHeaders());
        }
        if (method === "GET" && route.startsWith("/orders/")) {
          const session = requireSession(request, sessions);
          const id = decodeRoutePart(route.slice("/orders/".length));
          const order = orders.get(id);

          if (!order) {
            throw new HttpProblem(404, "ORDER_NOT_FOUND", "Order was not found.");
          }

          requireTenant(session, order.tenantId);
          if (
            order.userId !== session.account.id
            && !session.account.roles.includes("admin")
          ) {
            throw new HttpProblem(403, "ORDER_ACCESS_DENIED", "This order belongs to another account.");
          }

          return jsonResponse(200, toPublicOrder(order), privateHeaders());
        }
        if (route === "/admin/products" && method === "GET") {
          const session = requireAdminSession(request, sessions);

          requireTenant(session, PRODUCT_TENANT_ID);
          return jsonResponse(
            200,
            await listAdminProducts(Object.fromEntries(url.searchParams.entries())),
            privateHeaders()
          );
        }
        if (route === "/admin/products/bulk" && method === "POST") {
          const session = requireAdminSession(request, sessions);

          requireTenant(session, PRODUCT_TENANT_ID);
          requireCsrf(request, session);
          const body = await readJsonBody(request);

          return jsonResponse(
            200,
            await bulkUpdateAdminProducts(body),
            privateHeaders()
          );
        }
        if (route.startsWith("/admin/products/")) {
          const session = requireAdminSession(request, sessions);

          requireTenant(session, PRODUCT_TENANT_ID);
          const id = decodeRoutePart(route.slice("/admin/products/".length));

          if (method === "GET") {
            return jsonResponse(
              200,
              await getAdminProduct({ id }),
              privateHeaders()
            );
          }
          if (method === "PUT") {
            requireCsrf(request, session);
            const body = await readJsonBody(request);

            if (body.tenantId && body.tenantId !== PRODUCT_TENANT_ID) {
              throw new HttpProblem(403, "TENANT_ACCESS_DENIED", "Product belongs to another tenant.");
            }

            return jsonResponse(
              200,
              await updateAdminProduct({ ...body, id }),
              privateHeaders()
            );
          }
        }

        throw new HttpProblem(404, "FIXTURE_ROUTE_NOT_FOUND", "Fixture API route was not found.");
      } catch (error) {
        return toErrorResponse(error);
      }
    },

    /** Returns non-sensitive counters for integration assertions. */
    inspect() {
      return {
        idempotencyKeyCount: idempotencyKeys.size,
        orderCount: orders.size,
        sessionCount: sessions.size
      };
    },

    /** Restores all deterministic state without exposing the server secret. */
    reset() {
      sessions.clear();
      orders.clear();
      idempotencyKeys.clear();
      sessionSequence = 1;
      orderSequence = 1;
      resetCatalogRepository();
    }
  };
}

async function createAuthoritativeQuote(body) {
  const currency = String(body.currency || "USD").trim().toUpperCase();

  if (currency !== "USD") {
    throw new HttpProblem(
      422,
      "QUOTE_CURRENCY_MISMATCH",
      "The fixture catalog is authoritative in USD."
    );
  }

  let quote;

  try {
    quote = await quoteCart({ lines: body.lines });
  } catch (error) {
    throw new HttpProblem(422, "QUOTE_INVALID", error.message);
  }
  const subtotalCents = quote.totalCents;
  const taxCents = Math.round(subtotalCents * TAX_RATE_BPS / 10_000);

  return {
    ...quote,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    taxRateBps: TAX_RATE_BPS,
    authoritative: true
  };
}

function readSessionResponse(request, sessions) {
  const session = getSession(request, sessions);

  return jsonResponse(
    200,
    session
      ? toPublicSession(session)
      : {
        authenticated: false,
        user: null,
        roles: []
      },
    privateHeaders()
  );
}

function requireAdminSession(request, sessions) {
  const session = requireSession(request, sessions);

  if (!session.account.roles.includes("admin")) {
    throw new HttpProblem(403, "ROLE_ACCESS_DENIED", "Administrator role required.");
  }

  return session;
}

function requireOrderRole(session) {
  if (!session.account.roles.some(role => role === "admin" || role === "customer")) {
    throw new HttpProblem(403, "ROLE_ACCESS_DENIED", "Customer or administrator role required.");
  }
}

function requireSession(request, sessions) {
  const session = getSession(request, sessions);

  if (!session) {
    throw new HttpProblem(401, "SESSION_REQUIRED", "Sign in before using this resource.");
  }

  return session;
}

function getSession(request, sessions) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const id = cookies[SESSION_COOKIE];
  const session = id ? sessions.get(id) : null;

  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(session.id);
    return null;
  }

  return session;
}

function requireCsrf(request, session) {
  const token = String(request.headers.get("x-csrf-token") || "").trim();

  if (!token || token !== session.csrfToken) {
    throw new HttpProblem(403, "CSRF_INVALID", "A valid session CSRF token is required.");
  }
}

function requireTenant(session, tenantId) {
  if (session.account.tenantId !== tenantId) {
    throw new HttpProblem(403, "TENANT_ACCESS_DENIED", "Resource belongs to another tenant.");
  }
}

function toPublicSession(session) {
  return {
    authenticated: true,
    csrfToken: session.csrfToken,
    expiresAt: new Date(session.expiresAt).toISOString(),
    roles: [...session.account.roles],
    user: {
      id: session.account.id,
      name: session.account.name,
      tenantId: session.account.tenantId,
      roles: [...session.account.roles]
    }
  };
}

function toPublicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    quote: order.quote,
    createdAt: order.createdAt
  };
}

async function readJsonBody(request) {
  const text = await request.text();

  if (!text) return {};

  try {
    const value = JSON.parse(text);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("JSON body must be an object");
    }

    return value;
  } catch (error) {
    throw new HttpProblem(400, "INVALID_JSON", error.message || "Invalid JSON body.");
  }
}

async function waitForFixtureDelay(url, signal) {
  const value = Number(url.searchParams.get("delayMs") || 0);

  if (!Number.isFinite(value) || value <= 0) return;

  await new Promise((resolvePromise, rejectPromise) => {
    const finish = callback => {
      signal?.removeEventListener("abort", abort);
      callback();
    };
    const timer = setTimeout(() => finish(resolvePromise), Math.min(value, 1_000));
    const abort = () => {
      clearTimeout(timer);
      const error = new Error("Request aborted");

      error.name = "AbortError";
      finish(() => rejectPromise(error));
    };

    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function createOpaqueValue(kind, subject, sequence) {
  return createHash("sha256")
    .update(`${SERVER_SIGNING_SECRET}:${kind}:${subject}:${sequence}`)
    .digest("hex")
    .slice(0, 32);
}

function createSessionCookie(id) {
  return `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header) {
  return Object.fromEntries(String(header)
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separator = part.indexOf("=");

      return separator < 0
        ? [part, ""]
        : [part.slice(0, separator), part.slice(separator + 1)];
    }));
}

function decodeRoutePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpProblem(400, "INVALID_ROUTE_VALUE", "Route value is not valid URL encoding.");
  }
}

function publicHeaders() {
  return {
    "cache-control": "public, max-age=30"
  };
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store"
  };
}

function privateHeaders() {
  return {
    "cache-control": "private, no-store",
    vary: "Cookie"
  };
}

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}

function toErrorResponse(error) {
  if (error?.name === "AbortError") throw error;

  if (error instanceof AdminValidationError) {
    return jsonResponse(422, {
      code: error.code,
      message: error.message,
      errors: error.fields
    }, privateHeaders());
  }
  if (error instanceof AdminConflictError) {
    return jsonResponse(409, {
      code: error.code,
      message: error.message,
      current: error.current
    }, privateHeaders());
  }
  if (error instanceof HttpProblem) {
    return jsonResponse(error.status, {
      code: error.code,
      message: error.message
    }, error.status === 401 || error.status === 403
      ? privateHeaders()
      : noStoreHeaders());
  }

  return jsonResponse(500, {
    code: "FIXTURE_INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Fixture request failed."
  }, noStoreHeaders());
}

class HttpProblem extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "HttpProblem";
    this.status = status;
    this.code = code;
  }
}
