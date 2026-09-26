/**
 * ----------------------------------------
 * Module: Product Detail Data
 * ----------------------------------------
 *
 * Resolves a direct product route through the same replaceable catalog
 * contract used by request handlers.
 * ----------------------------------------
 */

import { getProduct as getProductForBuild } from "#app/domain/catalog/catalog-service.js";
import { getProductFromServer } from "#app/domain/backend/store-api-client.js";

export async function load({ params, mode, signal }) {
  return mode === "client"
    ? getProductFromServer({ id: params.id }, { signal })
    : getProductForBuild({ id: params.id });
}
