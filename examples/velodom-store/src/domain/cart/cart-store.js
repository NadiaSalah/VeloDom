/**
 * ----------------------------------------
 * Module: Guest Cart State
 * ----------------------------------------
 *
 * Owns the example's versioned guest-cart persistence. Only product option
 * ids and quantities are stored; prices, stock, sessions, and credentials are
 * deliberately excluded and must be revalidated by the backend contract.
 * ----------------------------------------
 */

import { createSharedState } from "velodom";

export const CART_STORAGE_KEY = "velodom-store:guest-cart:v1";
export const CART_STORAGE_VERSION = 1;

/** Creates an isolated cart model for the application or deterministic tests. */
export function createCartModel(storage = getBrowserStorage()) {
  const restored = restoreLines(storage);
  const handle = createSharedState({
    lines: restored.lines,
    persistenceNotice: restored.notice
  }, {
    name: "cart"
  });

  const persist = () => {
    try {
      if (!storage) throw new Error("storage unavailable");
      storage.setItem(CART_STORAGE_KEY, JSON.stringify({
        version: CART_STORAGE_VERSION,
        lines: handle.state.lines
      }));
      handle.state.persistenceNotice = "";
      return true;
    } catch {
      handle.state.persistenceNotice = "Cart changes remain in this tab because browser storage is unavailable.";
      return false;
    }
  };

  return Object.freeze({
    handle,
    add(productId, variantId, quantity = 1) {
      const normalized = normalizeLine({ productId, variantId, quantity });
      const existing = handle.state.lines.find(line => (
        line.productId === normalized.productId
        && line.variantId === normalized.variantId
      ));
      const lines = existing
        ? handle.state.lines.map(line => line === existing
          ? { ...line, quantity: line.quantity + normalized.quantity }
          : line)
        : [...handle.state.lines, normalized];

      handle.state.lines = lines;
      persist();
      return normalized;
    },
    update(productId, variantId, quantity) {
      const nextQuantity = Number(quantity);

      if (!Number.isInteger(nextQuantity)) return false;
      handle.state.lines = nextQuantity <= 0
        ? handle.state.lines.filter(line => !matchesLine(line, productId, variantId))
        : handle.state.lines.map(line => matchesLine(line, productId, variantId)
          ? { ...line, quantity: nextQuantity }
          : line);
      persist();
      return true;
    },
    remove(productId, variantId) {
      handle.state.lines = handle.state.lines.filter(
        line => !matchesLine(line, productId, variantId)
      );
      persist();
    },
    clear() {
      handle.state.lines = [];
      persist();
    },
    persist
  });
}

export const cartModel = createCartModel();
export const cart = cartModel.handle;

/** Returns the current item quantity without retaining price or stock facts. */
export function getCartItemCount(lines = cart.state.lines) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

function restoreLines(storage) {
  if (!storage) {
    return {
      lines: [],
      notice: "Cart persistence is unavailable; this tab will keep changes in memory."
    };
  }

  try {
    const source = storage.getItem(CART_STORAGE_KEY);

    if (!source) return { lines: [], notice: "" };
    const payload = JSON.parse(source);

    if (payload?.version !== CART_STORAGE_VERSION || !Array.isArray(payload.lines)) {
      return {
        lines: [],
        notice: "An older or invalid guest cart was ignored safely."
      };
    }

    return {
      lines: payload.lines.map(normalizeLine),
      notice: ""
    };
  } catch {
    return {
      lines: [],
      notice: "The saved guest cart could not be read and was ignored safely."
    };
  }
}

function normalizeLine(line) {
  const productId = String(line?.productId || "").trim();
  const variantId = String(line?.variantId || "").trim();
  const quantity = Number(line?.quantity);

  if (!productId || !variantId || !Number.isInteger(quantity) || quantity <= 0) {
    throw new TypeError("Guest cart lines require productId, variantId, and a positive integer quantity.");
  }

  return { productId, variantId, quantity };
}

function matchesLine(line, productId, variantId) {
  return line.productId === String(productId)
    && line.variantId === String(variantId);
}

function getBrowserStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
