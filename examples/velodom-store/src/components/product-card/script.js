/**
 * ----------------------------------------
 * Module: Product Card Component
 * ----------------------------------------
 *
 * Presents one typed-looking product record using normal component props and
 * locale-aware native currency formatting.
 * ----------------------------------------
 */

export function init({ state, props }) {
  const product = props.product || {};
  const locale = props.locale || "en-US";
  const currency = props.currency || "USD";
  const available = Array.isArray(product.variants)
    && product.variants.some(variant => variant.stock > 0);

  state.productAccent = product.accent || "#4f46e5";
  state.productInitials = String(product.name || "Product")
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
  state.productName = product.name || "Product";
  state.productSummary = product.summary || "";
  state.categoryLabel = product.categoryLabel || "Catalog";
  state.productPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(Number(product.priceCents || 0) / 100);
  state.availabilityLabel = available ? "Available" : "Unavailable";
  state.productHref = `/products/${product.id}`;
}
