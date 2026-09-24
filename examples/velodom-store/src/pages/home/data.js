/**
 * ----------------------------------------
 * Module: Catalog Page Data
 * ----------------------------------------
 *
 * Loads public catalog results from route query values before page init.
 * ----------------------------------------
 */

import { listCatalog } from "#app/domain/catalog/catalog-service.js";

export const cache = {
  maxAgeMs: 5_000,
  staleWhileRevalidateMs: 15_000
};

export async function load({ query }) {
  return listCatalog(query);
}
