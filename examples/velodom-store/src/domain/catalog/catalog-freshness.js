/**
 * ----------------------------------------
 * Module: Catalog Page Freshness Policy
 * ----------------------------------------
 *
 * Names the public pages affected by confirmed catalog mutations. The mapping
 * is application policy; Core cannot infer which write affects which page.
 * ----------------------------------------
 */

/**
 * Invalidates public catalog variants only after an accepted server mutation.
 * @param {Pick<import("velodom").VeloDomApp, "invalidatePageData">} context
 */
export function invalidateCatalogPages(context) {
  context.invalidatePageData("home");
  context.invalidatePageData("products/[id]");
}
