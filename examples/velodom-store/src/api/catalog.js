/**
 * ----------------------------------------
 * Module: Storefront Request Routes
 * ----------------------------------------
 *
 * Exposes the app-owned catalog, quotation, and mock-checkout handlers through
 * VeloDom request discovery. A real deployment would replace these fixtures
 * with calls to an authorized backend.
 * ----------------------------------------
 */

export {
  createMockCheckout,
  getProduct,
  listCatalog,
  quoteCart
} from "#app/domain/catalog/catalog-service.js";
