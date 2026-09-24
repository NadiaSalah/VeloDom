/**
 * ----------------------------------------
 * Module: Cart Page Behavior
 * ----------------------------------------
 *
 * Requotes every cart mutation through the application backend fixture and
 * keeps failed or stale edits recoverable instead of silently confirming them.
 * ----------------------------------------
 */

import { quoteCart } from "#app/domain/catalog/catalog-service.js";
import {
  cart,
  cartModel
} from "#app/domain/cart/cart-store.js";

export const state = {
  quote: null,
  quoteLines: [],
  quoteLoading: true,
  quoteError: "",
  total: "$0.00",
  persistenceNotice: ""
};

export async function init({ state }) {
  const refreshQuote = async () => {
    state.quoteLoading = true;
    state.quoteError = "";
    state.persistenceNotice = cart.state.persistenceNotice;

    try {
      const quote = await quoteCart({ lines: cart.state.lines });

      state.quote = quote;
      state.quoteLines = quote.lines.map(line => ({
        ...line,
        unitPrice: formatMoney(line.unitPriceCents),
        lineTotal: formatMoney(line.lineTotalCents)
      }));
      state.total = formatMoney(quote.totalCents);
    } catch (error) {
      state.quote = null;
      state.quoteLines = [];
      state.quoteError = error?.message || "The cart could not be quoted.";
    } finally {
      state.quoteLoading = false;
    }
  };

  state.changeQuantity = async (productId, variantId, quantity) => {
    cartModel.update(productId, variantId, quantity);
    await refreshQuote();
  };
  state.removeLine = async (productId, variantId) => {
    cartModel.remove(productId, variantId);
    await refreshQuote();
  };
  state.clearCart = async () => {
    cartModel.clear();
    await refreshQuote();
  };
  state.retryQuote = refreshQuote;

  await refreshQuote();
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}
