/**
 * ----------------------------------------
 * Module: Storefront Catalog Service
 * ----------------------------------------
 *
 * Implements deterministic catalog reads and authoritative mock quotations.
 * It models a replaceable backend contract without entering framework Core.
 * ----------------------------------------
 */

import {
  products,
  STORE_CURRENCY
} from "./products.js";

export const CATALOG_PAGE_SIZE = 4;

/** Lists products with URL-compatible search, filter, sort, and pagination. */
export async function listCatalog(input = {}) {
  await applyFixtureBehavior(input);
  const filters = normalizeCatalogFilters(input);
  const query = filters.q.toLocaleLowerCase("en");
  const matched = products.filter(product => {
    const matchesCategory = filters.category === "all"
      || product.category === filters.category;
    const haystack = `${product.name} ${product.summary} ${product.categoryLabel}`
      .toLocaleLowerCase("en");

    return matchesCategory && (!query || haystack.includes(query));
  });
  const sorted = [...matched].sort(createProductComparator(filters.sort));
  const pageCount = Math.max(1, Math.ceil(sorted.length / CATALOG_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * CATALOG_PAGE_SIZE;

  return {
    items: sorted.slice(offset, offset + CATALOG_PAGE_SIZE),
    categories: getCategories(),
    currency: STORE_CURRENCY,
    filters: {
      ...filters,
      page
    },
    pagination: {
      page,
      pageCount,
      pageSize: CATALOG_PAGE_SIZE,
      total: sorted.length,
      hasPrevious: page > 1,
      hasNext: page < pageCount
    }
  };
}

/** Resolves one product by stable public id. */
export async function getProduct(input = {}) {
  await applyFixtureBehavior(input);
  const id = String(input.id ?? input.params?.id ?? "").trim();
  const product = products.find(candidate => candidate.id === id);

  if (!product) {
    throw new Error(`Product "${id || "unknown"}" was not found.`);
  }

  return product;
}

/** Revalidates cart ids, stock, and prices against the mock backend facts. */
export async function quoteCart(input = {}) {
  await applyFixtureBehavior(input);
  const requestedLines = Array.isArray(input.lines) ? input.lines : [];
  const lines = requestedLines.map(requested => quoteLine(requested));

  return {
    currency: STORE_CURRENCY,
    lines,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    totalCents: lines.reduce((total, line) => total + line.lineTotalCents, 0),
    quotedAt: "2026-09-21T00:00:00.000Z",
    mock: true
  };
}

/** Creates a visibly mocked handoff after a fresh authoritative quotation. */
export async function createMockCheckout(input = {}) {
  const quote = await quoteCart(input);

  if (quote.lines.length === 0) {
    throw new Error("Add at least one available item before checkout.");
  }

  return {
    id: `mock-${quote.lines.map(line => line.productId).join("-")}`,
    status: "mock-handoff",
    message: "Simulation complete. No order was created and no payment was taken.",
    quote
  };
}

/** Returns category options derived from the fixture rather than duplicated UI data. */
export function getCategories() {
  return [...new Map(products.map(product => [
    product.category,
    product.categoryLabel
  ])).entries()].map(([id, label]) => ({ id, label }));
}

/** Returns product records for build-time SEO entry generation. */
export function getProductEntries() {
  return products;
}

function normalizeCatalogFilters(input) {
  const category = readScalar(input.category, "all");
  const sort = readScalar(input.sort, "featured");

  return {
    q: readScalar(input.q, "").slice(0, 80),
    category: getCategories().some(item => item.id === category)
      ? category
      : "all",
    sort: ["featured", "price-asc", "price-desc", "name"].includes(sort)
      ? sort
      : "featured",
    page: normalizePositiveInteger(readScalar(input.page, "1"))
  };
}

function createProductComparator(sort) {
  if (sort === "price-asc") {
    return (left, right) => left.priceCents - right.priceCents;
  }
  if (sort === "price-desc") {
    return (left, right) => right.priceCents - left.priceCents;
  }
  if (sort === "name") {
    return (left, right) => left.name.localeCompare(right.name, "en");
  }

  return (left, right) => left.featuredRank - right.featuredRank;
}

function quoteLine(requested) {
  const productId = String(requested?.productId || "").trim();
  const variantId = String(requested?.variantId || "").trim();
  const quantity = normalizePositiveInteger(requested?.quantity);
  const product = products.find(candidate => candidate.id === productId);
  const variant = product?.variants.find(candidate => candidate.id === variantId);

  if (!product || !variant) {
    throw new Error("The cart contains a product option that is no longer available.");
  }
  if (variant.stock < quantity) {
    throw new Error(`${product.name} (${variant.label}) has only ${variant.stock} available.`);
  }

  const unitPriceCents = product.priceCents + variant.adjustmentCents;

  return {
    productId,
    variantId,
    name: product.name,
    variantLabel: variant.label,
    quantity,
    stock: variant.stock,
    unitPriceCents,
    lineTotalCents: unitPriceCents * quantity
  };
}

function readScalar(value, fallback) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return String(candidate ?? fallback).trim();
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

async function applyFixtureBehavior(input) {
  if (input?.mode === "error") {
    throw new Error("The mock catalog is temporarily unavailable.");
  }
  const delayMs = Number(input?.delayMs || 0);

  if (Number.isFinite(delayMs) && delayMs > 0) {
    await new Promise(resolvePromise => {
      setTimeout(resolvePromise, Math.min(delayMs, 500));
    });
  }
}
