/**
 * ----------------------------------------
 * Module: Admin Product Edit Data
 * ----------------------------------------
 *
 * Loads the current record revision before constructing the editable draft.
 * ----------------------------------------
 */

import { getAdminProduct } from "#app/domain/admin/admin-service.js";

export async function load({ params }) {
  return getAdminProduct({ id: params.id });
}
