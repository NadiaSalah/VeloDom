/**
 * ----------------------------------------
 * Module: Mock Checkout Behavior
 * ----------------------------------------
 *
 * Prepares a fresh quote for a deliberately non-transactional checkout handoff.
 * ----------------------------------------
 */

import { quoteCart } from "#app/domain/catalog/catalog-service.js";
import { cart } from "#app/domain/cart/cart-store.js";

export const state = {
  cartLines: [],
  quoteLines: [],
  total: "$0.00",
  preparing: true,
  prepareError: "",
  checkoutResult: null,
  checkoutLoading: false,
  checkoutError: ""
};

export async function init({ state }) {
  state.cartLines = cart.state.lines.map(line => ({ ...line }));

  try {
    const quote = await quoteCart({ lines: state.cartLines });

    state.quoteLines = quote.lines.map(line => ({
      ...line,
      lineTotal: formatMoney(line.lineTotalCents)
    }));
    state.total = formatMoney(quote.totalCents);
  } catch (error) {
    state.prepareError = error?.message || "Checkout could not be prepared.";
  } finally {
    state.preparing = false;
  }
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}
