/**
 * ----------------------------------------
 * Module: Admin Product Edit Data
 * ----------------------------------------
 *
 * Loads the current record revision before constructing the editable draft.
 * ----------------------------------------
 */

import { getAdminProductFromServer } from "#app/domain/backend/store-api-client.js";

export async function load({ params, signal }) {
  return getAdminProductFromServer({ id: params.id }, { signal });
}
