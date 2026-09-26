/**
 * ----------------------------------------
 * Module: Store Backend Contract Tests
 * ----------------------------------------
 *
 * Proves the example's replaceable HTTP boundary independently rejects
 * unauthorized, cross-tenant, tampered, expired, and duplicate operations.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  createStoreBackendFixture,
  STORE_API_PREFIX
} from "../../../examples/velodom-store/server/backend-fixture.js";

const orderLines = [{
  productId: "aurora-lamp",
  variantId: "midnight",
  quantity: 1,
  unitPriceCents: 1,
  stock: 999
}];

test("public quotations ignore browser prices and reject unsupported currency", async () => {
  const backend = createStoreBackendFixture();
  const quoted = await call(backend, "/cart/quote", {
    method: "POST",
    body: { currency: "USD", lines: orderLines }
  });

  assert.equal(quoted.response.status, 200);
  assert.equal(quoted.body.lines[0].unitPriceCents, 7800);
  assert.equal(quoted.body.subtotalCents, 7800);
  assert.equal(quoted.body.taxCents, 644);
  assert.equal(quoted.body.totalCents, 8444);
  assert.equal(quoted.body.authoritative, true);

  const rejected = await call(backend, "/cart/quote", {
    method: "POST",
    body: { currency: "EUR", lines: orderLines }
  });

  assert.equal(rejected.response.status, 422);
  assert.equal(rejected.body.code, "QUOTE_CURRENCY_MISMATCH");
});

test("admin resources enforce session, role, tenant, and CSRF independently", async () => {
  const backend = createStoreBackendFixture();
  const anonymous = await call(backend, "/admin/products");

  assert.equal(anonymous.response.status, 401);
  assertPrivateNoStore(anonymous.response);

  const editor = await login(backend, "editor-north");
  assert.equal((await call(backend, "/admin/products", editor)).response.status, 403);

  const otherTenant = await login(backend, "admin-south");
  assert.equal((await call(backend, "/admin/products", otherTenant)).body.code, "TENANT_ACCESS_DENIED");

  const admin = await login(backend, "admin-north");
  const record = await call(backend, "/admin/products/aurora-lamp", admin);

  assert.equal(record.response.status, 200);
  assertPrivateNoStore(record.response);

  const write = {
    method: "PUT",
    cookie: admin.cookie,
    body: {
      id: record.body.id,
      name: "Aurora server lamp",
      summary: record.body.summary,
      status: record.body.status,
      expectedRevision: record.body.revision
    }
  };
  const missingCsrf = await call(backend, "/admin/products/aurora-lamp", write);

  assert.equal(missingCsrf.response.status, 403);
  assert.equal(missingCsrf.body.code, "CSRF_INVALID");

  const accepted = await call(backend, "/admin/products/aurora-lamp", {
    ...write,
    headers: { "x-csrf-token": admin.session.csrfToken }
  });

  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.body.product.name, "Aurora server lamp");
});

test("mock order writes validate totals, isolate owners, and reject duplicate keys", async () => {
  const backend = createStoreBackendFixture();
  const customer = await login(backend, "customer-north");
  const quote = await call(backend, "/cart/quote", {
    method: "POST",
    body: { currency: "USD", lines: orderLines }
  });
  const baseWrite = {
    method: "POST",
    cookie: customer.cookie,
    headers: {
      "x-csrf-token": customer.session.csrfToken,
      "x-idempotency-key": "customer-order-001"
    },
    body: {
      currency: "USD",
      lines: orderLines,
      expectedTotalCents: quote.body.totalCents
    }
  };
  const tampered = await call(backend, "/orders", {
    ...baseWrite,
    body: { ...baseWrite.body, expectedTotalCents: 1 }
  });

  assert.equal(tampered.response.status, 422);
  assert.equal(tampered.body.code, "ORDER_TOTAL_MISMATCH");

  const empty = await call(backend, "/orders", {
    ...baseWrite,
    headers: {
      ...baseWrite.headers,
      "x-idempotency-key": "customer-order-empty"
    },
    body: {
      currency: "USD",
      lines: [],
      expectedTotalCents: 0
    }
  });

  assert.equal(empty.response.status, 422);
  assert.equal(empty.body.code, "ORDER_EMPTY");

  const created = await call(backend, "/orders", baseWrite);

  assert.equal(created.response.status, 201);
  assert.equal(created.body.paymentStatus, "not-charged");
  assert.match(created.body.message, /No charge/);
  assertPrivateNoStore(created.response);

  const duplicate = await call(backend, "/orders", baseWrite);

  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.code, "ORDER_DUPLICATE");
  assert.deepEqual(backend.inspect(), {
    idempotencyKeyCount: 1,
    orderCount: 1,
    sessionCount: 1
  });

  const otherCustomer = await login(backend, "customer-two-north");
  const deniedOwner = await call(backend, `/orders/${created.body.id}`, otherCustomer);

  assert.equal(deniedOwner.response.status, 403);
  assert.equal(deniedOwner.body.code, "ORDER_ACCESS_DENIED");

  const otherTenant = await login(backend, "admin-south");
  const deniedTenant = await call(backend, `/orders/${created.body.id}`, otherTenant);

  assert.equal(deniedTenant.response.status, 403);
  assert.equal(deniedTenant.body.code, "TENANT_ACCESS_DENIED");
});

test("session expiry, logout, and account replacement invalidate private access", async () => {
  const backend = createStoreBackendFixture();
  const admin = await login(backend, "admin-north");
  const replacement = await login(backend, "editor-north", admin.cookie);

  assert.equal((await call(backend, "/admin/products", admin)).response.status, 401);
  assert.equal((await call(backend, "/admin/products", replacement)).response.status, 403);

  const expired = await call(backend, "/session/expire", {
    method: "POST",
    cookie: replacement.cookie,
    headers: { "x-csrf-token": replacement.session.csrfToken },
    body: {}
  });

  assert.equal(expired.response.status, 200);
  assert.equal((await call(backend, "/admin/products", replacement)).response.status, 401);

  const customer = await login(backend, "customer-north");

  const logout = await call(backend, "/session/logout", {
    method: "POST",
    cookie: customer.cookie,
    headers: { "x-csrf-token": customer.session.csrfToken },
    body: {}
  });

  assert.equal(logout.response.status, 200);
  const current = await call(backend, "/session", { cookie: customer.cookie });
  assert.equal(current.body.authenticated, false);
  assertPrivateNoStore(current.response);
});

test("pending fixture reads honor cancellation", async () => {
  const backend = createStoreBackendFixture();
  const controller = new AbortController();
  const pending = backend.handle(new Request(
    `http://store.test${STORE_API_PREFIX}/catalog?delayMs=500`,
    { signal: controller.signal }
  ));

  controller.abort();
  await assert.rejects(pending, error => error?.name === "AbortError");
});

test("concurrent duplicate order writes commit only once and role checks stay server-owned", async () => {
  const backend = createStoreBackendFixture();
  const customer = await login(backend, "customer-north");
  const options = {
    method: "POST",
    cookie: customer.cookie,
    headers: {
      "x-csrf-token": customer.session.csrfToken,
      "x-idempotency-key": "concurrent-order-001"
    },
    body: { currency: "USD", lines: orderLines, expectedTotalCents: 8444 }
  };
  const results = await Promise.all([
    call(backend, "/orders", options),
    call(backend, "/orders", options)
  ]);

  assert.deepEqual(results.map(result => result.response.status).sort(), [201, 409]);
  assert.equal(backend.inspect().orderCount, 1);

  const editor = await login(backend, "editor-north");
  const denied = await call(backend, "/orders", {
    ...options,
    cookie: editor.cookie,
    headers: { ...options.headers, "x-csrf-token": editor.session.csrfToken }
  });

  assert.equal(denied.response.status, 403);
  assert.equal(denied.body.code, "ROLE_ACCESS_DENIED");
});

test("quotations reject invalid quantities and aggregate duplicate option stock", async () => {
  const backend = createStoreBackendFixture();

  for (const quantity of [0, -1, 1.5, "invalid"]) {
    const invalid = await call(backend, "/cart/quote", {
      method: "POST",
      body: { lines: [{ ...orderLines[0], quantity }] }
    });

    assert.equal(invalid.response.status, 422);
    assert.equal(invalid.body.code, "QUOTE_INVALID");
  }

  const overStock = await call(backend, "/cart/quote", {
    method: "POST",
    body: { lines: [
      { ...orderLines[0], quantity: 4 },
      { ...orderLines[0], quantity: 4 }
    ] }
  });

  assert.equal(overStock.response.status, 422);
  assert.match(overStock.body.message, /only 6 available/);

  const valid = await call(backend, "/cart/quote", {
    method: "POST",
    body: { lines: [orderLines[0], orderLines[0]] }
  });

  assert.equal(valid.body.lines.length, 1);
  assert.equal(valid.body.lines[0].quantity, 2);
});

async function login(backend, account, cookie = "") {
  const result = await call(backend, "/session/login", {
    method: "POST",
    cookie,
    body: { account }
  });

  assert.equal(result.response.status, 200);
  return {
    cookie: result.response.headers.get("set-cookie")?.split(";")[0] || "",
    session: result.body
  };
}

async function call(backend, path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.body !== undefined) headers.set("content-type", "application/json");

  const response = await backend.handle(new Request(
    `http://store.test${STORE_API_PREFIX}${path}`,
    {
      method: options.method || "GET",
      headers,
      signal: options.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    }
  ));

  return {
    response,
    body: await response.json()
  };
}

function assertPrivateNoStore(response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie");
}
