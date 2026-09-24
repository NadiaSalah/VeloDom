/**
 * ----------------------------------------
 * Module: Storefront Reference Tests
 * ----------------------------------------
 *
 * Proves the example's URL-backed catalog, authoritative mock quotation, and
 * versioned guest-cart boundaries without turning them into Core APIs.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  createMockCheckout,
  getProduct,
  listCatalog,
  quoteCart
} from "../../../examples/velodom-store/src/domain/catalog/catalog-service.js";
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  createCartModel
} from "../../../examples/velodom-store/src/domain/cart/cart-store.js";

test("storefront catalog uses deterministic URL-compatible filters", async () => {
  const result = await listCatalog({
    category: "workspace",
    sort: "price-asc",
    page: "1"
  });

  assert.deepEqual(result.items.map(item => item.id), [
    "focus-timer",
    "aurora-lamp"
  ]);
  assert.deepEqual(result.filters, {
    q: "",
    category: "workspace",
    sort: "price-asc",
    page: 1
  });
  assert.equal(result.pagination.total, 2);

  const search = await listCatalog({ q: "archive", page: "not-a-page" });

  assert.deepEqual(search.items.map(item => item.id), ["marker-set"]);
  assert.equal(search.filters.page, 1);
});

test("storefront direct product lookup and quotations use fixture authority", async () => {
  const product = await getProduct({ id: "aurora-lamp" });

  assert.equal(product.name, "Aurora desk lamp");

  const quote = await quoteCart({
    lines: [{
      productId: "aurora-lamp",
      variantId: "sand",
      quantity: 2,
      unitPriceCents: 1,
      stock: 999
    }]
  });

  assert.equal(quote.lines[0].unitPriceCents, 8200);
  assert.equal(quote.totalCents, 16400);
  assert.equal(quote.mock, true);

  await assert.rejects(
    () => quoteCart({
      lines: [{
        productId: "canvas-pack",
        variantId: "clay",
        quantity: 1
      }]
    }),
    /only 0 available/
  );
});

test("mock checkout requotes and never claims a real transaction", async () => {
  const result = await createMockCheckout({
    lines: [{
      productId: "focus-timer",
      variantId: "orange",
      quantity: 1
    }]
  });

  assert.equal(result.status, "mock-handoff");
  assert.match(result.message, /No order was created/);
  assert.equal(result.quote.totalCents, 3600);
  await assert.rejects(
    () => createMockCheckout({ lines: [] }),
    /Add at least one/
  );
});

test("guest cart persists only versioned ids and quantities", () => {
  const storage = createMemoryStorage(JSON.stringify({
    version: CART_STORAGE_VERSION,
    lines: [{
      productId: "aurora-lamp",
      variantId: "midnight",
      quantity: 1
    }]
  }));
  const model = createCartModel(storage);

  model.add("focus-timer", "orange", 2);
  const payload = JSON.parse(storage.value);

  assert.deepEqual(Object.keys(payload).sort(), ["lines", "version"]);
  assert.deepEqual(Object.keys(payload.lines[0]).sort(), [
    "productId",
    "quantity",
    "variantId"
  ]);
  assert.equal(JSON.stringify(payload).includes("price"), false);
  assert.equal(JSON.stringify(payload).includes("token"), false);
  assert.equal(storage.lastKey, CART_STORAGE_KEY);
  assert.equal(model.handle.state.lines.length, 2);
});

test("guest cart survives unavailable or invalid persistence visibly", () => {
  const invalid = createCartModel(createMemoryStorage("not-json"));

  assert.deepEqual(invalid.handle.state.lines, []);
  assert.match(invalid.handle.state.persistenceNotice, /could not be read/);

  const blocked = createCartModel({
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("blocked");
    }
  });

  blocked.add("focus-timer", "orange", 1);
  assert.equal(blocked.handle.state.lines.length, 1);
  assert.match(blocked.handle.state.persistenceNotice, /remain in this tab/);
});

function createMemoryStorage(initialValue = null) {
  return {
    value: initialValue,
    lastKey: "",
    getItem(key) {
      this.lastKey = key;
      return this.value;
    },
    setItem(key, value) {
      this.lastKey = key;
      this.value = value;
    }
  };
}
