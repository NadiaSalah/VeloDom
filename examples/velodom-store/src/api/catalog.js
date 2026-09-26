/**
 * ----------------------------------------
 * Module: Storefront Request Routes
 * ----------------------------------------
 *
 * Exposes browser-safe calls to the replaceable catalog and quotation HTTP
 * contract. Authoritative business policy remains in the server fixture.
 * ----------------------------------------
 */

export {
  getProductFromServer as getProduct,
  listCatalogFromServer as listCatalog,
  quoteCartFromServer as quoteCart
} from "#app/domain/backend/store-api-client.js";
