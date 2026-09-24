/**
 * ----------------------------------------
 * Module: Product Detail Behavior
 * ----------------------------------------
 *
 * Revalidates the complete prospective cart before accepting a guest-cart
 * change. Browser state never becomes the authority for price or stock.
 * ----------------------------------------
 */

import { quoteCart } from "#app/domain/catalog/catalog-service.js";
import {
  cart,
  cartModel
} from "#app/domain/cart/cart-store.js";

export const state = {
  product: null,
  productInitials: "",
  productAccent: "#5b4df7",
  price: "",
  selectedVariantId: "",
  quantity: 1,
  maxStock: 1,
  variantOptions: [],
  adding: false,
  cartMessage: "",
  cartError: ""
};

export function init({ state, data }) {
  state.product = data;
  state.productAccent = data.accent;
  state.productInitials = data.name
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
  state.variantOptions = data.variants.map(variant => ({
    ...variant,
    disabled: variant.stock < 1,
    optionLabel: `${variant.label} · ${variant.stock} available`
  }));
  state.selectedVariantId = data.variants.find(variant => variant.stock > 0)?.id || "";

  const updateSelectedVariant = () => {
    const variant = data.variants.find(item => item.id === state.selectedVariantId);

    state.maxStock = variant?.stock || 1;
    state.price = formatMoney(data.priceCents + (variant?.adjustmentCents || 0));
  };

  state.selectVariant = event => {
    state.selectedVariantId = event.target.value;
    state.quantity = 1;
    updateSelectedVariant();
  };
  state.addToCart = async () => {
    state.cartMessage = "";
    state.cartError = "";
    state.adding = true;

    try {
      const quantity = Number(state.quantity);
      const prospectiveLines = mergeProspectiveLine(
        cart.state.lines,
        data.id,
        state.selectedVariantId,
        quantity
      );

      await quoteCart({ lines: prospectiveLines });
      cartModel.add(data.id, state.selectedVariantId, quantity);
      state.cartMessage = cart.state.persistenceNotice
        || "Added after a fresh mock stock and price check.";
    } catch (error) {
      state.cartError = error?.message || "This item could not be added.";
    } finally {
      state.adding = false;
    }
  };

  updateSelectedVariant();
}

function mergeProspectiveLine(lines, productId, variantId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Choose a valid quantity.");
  }

  const existing = lines.find(line => (
    line.productId === productId && line.variantId === variantId
  ));

  return existing
    ? lines.map(line => line === existing
      ? { ...line, quantity: line.quantity + quantity }
      : line)
    : [...lines, { productId, variantId, quantity }];
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}
