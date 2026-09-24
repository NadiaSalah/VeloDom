/**
 * ----------------------------------------
 * Module: Admin Product Detail Behavior
 * ----------------------------------------
 *
 * Formats immutable display values while leaving editing to the explicit form
 * route.
 * ----------------------------------------
 */

export const state = {
  product: null,
  price: "",
  editHref: ""
};

export function init({ state, data }) {
  state.product = data;
  state.price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(data.priceCents / 100);
  state.editHref = `/admin/products/${data.id}/edit`;
}
