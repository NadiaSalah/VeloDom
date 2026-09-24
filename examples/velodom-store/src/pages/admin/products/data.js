/**
 * ----------------------------------------
 * Module: Admin Product List Data
 * ----------------------------------------
 *
 * Loads one backend-style search page from URL query values.
 * ----------------------------------------
 */

import { listAdminProducts } from "#app/domain/admin/admin-service.js";

export async function load({ query }) {
  return listAdminProducts(query);
}
