/**
 * ----------------------------------------
 * Module: Product Detail Data
 * ----------------------------------------
 *
 * Resolves a direct product route through the same replaceable catalog
 * contract used by request handlers.
 * ----------------------------------------
 */

import { getProduct } from "#app/domain/catalog/catalog-service.js";

export async function load({ params }) {
  return getProduct({ id: params.id });
}
