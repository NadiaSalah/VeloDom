/**
 * ----------------------------------------
 * Module: Admin Product Detail Data
 * ----------------------------------------
 *
 * Loads one record from the shared administration service.
 * ----------------------------------------
 */

import { getAdminProduct } from "#app/domain/admin/admin-service.js";

export async function load({ params }) {
  return getAdminProduct({ id: params.id });
}
