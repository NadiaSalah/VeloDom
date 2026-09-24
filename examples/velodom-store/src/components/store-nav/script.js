/**
 * ----------------------------------------
 * Module: Storefront Navigation Component
 * ----------------------------------------
 *
 * Mirrors application-owned cart and direction state into an accessible,
 * route-aware navigation bar.
 * ----------------------------------------
 */

import {
  cart,
  getCartItemCount
} from "#app/domain/cart/cart-store.js";

export const state = {
  cartCount: getCartItemCount(),
  localeButtonLabel: "Switch layout direction to Arabic RTL",
  localeButtonText: "العربية"
};

export function init({ state, ctx }) {
  const refreshCartCount = () => {
    state.cartCount = getCartItemCount();
  };
  const refreshLocaleButton = () => {
    const isArabic = ctx.direction?.locale === "ar";

    state.localeButtonText = isArabic ? "English" : "العربية";
    state.localeButtonLabel = isArabic
      ? "Switch layout direction to English LTR"
      : "Switch layout direction to Arabic RTL";
  };

  state.toggleLocale = () => {
    if (!ctx.direction) return;
    ctx.direction.setLocale(ctx.direction.locale === "ar" ? "en" : "ar");
  };

  const unsubscribeCart = cart.state._subscribe(refreshCartCount);
  const unsubscribeDirection = ctx.direction?._subscribe(refreshLocaleButton);

  refreshCartCount();
  refreshLocaleButton();
  ctx.onCleanup(() => {
    unsubscribeCart();
    unsubscribeDirection?.();
  });
}

export function mounted({ ctx }) {
  const links = [...document.querySelectorAll(".primary-link")];
  const updateActiveLink = () => {
    const current = normalizePath(window.location.pathname);

    links.forEach(link => {
      const target = normalizePath(new URL(link.href, window.location.origin).pathname);
      const active = target === "/"
        ? current === "/"
        : current === target || current.startsWith(`${target}/`);

      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  window.addEventListener("popstate", updateActiveLink);
  updateActiveLink();
  ctx.onCleanup(() => {
    window.removeEventListener("popstate", updateActiveLink);
  });
}

function normalizePath(path) {
  return String(path || "/").replace(/\/+$/, "") || "/";
}
