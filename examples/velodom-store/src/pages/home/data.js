/**
 * ----------------------------------------
 * Module: Catalog Page Data
 * ----------------------------------------
 *
 * Loads public catalog results from route query values before page init.
 * ----------------------------------------
 */

import { listCatalog as listCatalogForBuild } from "#app/domain/catalog/catalog-service.js";
import { listCatalogFromServer } from "#app/domain/backend/store-api-client.js";

export const cache = {
  maxAgeMs: 5_000,
  staleWhileRevalidateMs: 15_000
};

export async function load({ query, mode, signal }) {
  return mode === "client"
    ? listCatalogFromServer(query, { signal })
    : listCatalogForBuild(query);
}
