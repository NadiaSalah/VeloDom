/**
 * ----------------------------------------
 * Module: Admin Product Detail Configuration
 * ----------------------------------------
 *
 * Maps product details into the dedicated no-index administration layout.
 * ----------------------------------------
 */

import { requireAdminPage } from "#app/domain/auth/admin-guard.js";

export default {
  path: "/admin/products/:id",
  layout: "admin",
  beforeEnter: requireAdminPage,
  seo: {
    title: "Admin Product Detail | VeloDom Store",
    description: "Inspect a product record in the VeloDom administration example.",
    canonical: "/admin/products",
    lang: "en",
    robots: "noindex,nofollow",
    summary: {
      heading: "Admin product detail",
      text: "An accessible detail route over the shared catalog domain."
    }
  }
};
