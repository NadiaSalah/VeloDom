/**
 * ----------------------------------------
 * Module: Admin Product Detail Data
 * ----------------------------------------
 *
 * Loads one record from the shared administration service.
 * ----------------------------------------
 */

import { getAdminProductFromServer } from "#app/domain/backend/store-api-client.js";

export async function load({ params, signal }) {
  return getAdminProductFromServer({ id: params.id }, { signal });
}
