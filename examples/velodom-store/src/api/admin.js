/**
 * ----------------------------------------
 * Module: Store Administration Request Routes
 * ----------------------------------------
 *
 * Keeps declarative request names stable while administration crosses the
 * replaceable HTTP boundary. Authorization remains server-owned.
 * ----------------------------------------
 */

export {
  bulkUpdateAdminProductsOnServer as bulkUpdateAdminProducts,
  getAdminProductFromServer as getAdminProduct,
  listAdminProductsFromServer as listAdminProducts,
  updateAdminProductOnServer as updateAdminProduct
} from "#app/domain/backend/store-api-client.js";
