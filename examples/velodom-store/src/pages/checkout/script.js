/**
 * ----------------------------------------
 * Module: Mock Checkout Behavior
 * ----------------------------------------
 *
 * Prepares an authoritative quote and one idempotent, deliberately
 * non-transactional order write through the local HTTP boundary.
 * ----------------------------------------
 */

import { quoteCartFromServer } from "#app/domain/backend/store-api-client.js";
import { cart } from "#app/domain/cart/cart-store.js";

export const state = {
  cartLines: [],
  quoteLines: [],
  subtotal: "$0.00",
  tax: "$0.00",
  total: "$0.00",
  totalCents: 0,
  idempotencyKey: "",
  preparing: true,
  prepareError: "",
  checkoutResult: null,
  checkoutLoading: false,
  checkoutError: ""
};

export async function init({ state }) {
  state.cartLines = cart.state.lines.map(line => ({ ...line }));
  state.idempotencyKey = createIdempotencyKey();

  try {
    const quote = await quoteCartFromServer({
      currency: "USD",
      lines: state.cartLines
    });

    state.quoteLines = quote.lines.map(line => ({
      ...line,
      lineTotal: formatMoney(line.lineTotalCents)
    }));
    state.subtotal = formatMoney(quote.subtotalCents);
    state.tax = formatMoney(quote.taxCents);
    state.total = formatMoney(quote.totalCents);
    state.totalCents = quote.totalCents;
  } catch (error) {
    state.prepareError = error?.message || "Checkout could not be prepared.";
  } finally {
    state.preparing = false;
  }
}

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}
