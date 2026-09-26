/**
 * ----------------------------------------
 * Module: Admin Product List Data
 * ----------------------------------------
 *
 * Loads one backend-style search page from URL query values.
 * ----------------------------------------
 */

import { listAdminProductsFromServer } from "#app/domain/backend/store-api-client.js";

export async function load({ query, signal }) {
  return listAdminProductsFromServer(query, { signal });
}
