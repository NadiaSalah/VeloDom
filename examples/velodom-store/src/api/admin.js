/**
 * ----------------------------------------
 * Module: Store Administration Request Routes
 * ----------------------------------------
 *
 * Exposes application-owned administration handlers through VeloDom request
 * discovery. The later backend-contract milestone adds session authorization.
 * ----------------------------------------
 */

export {
  bulkUpdateAdminProducts,
  getAdminProduct,
  listAdminProducts,
  updateAdminProduct
} from "#app/domain/admin/admin-service.js";
