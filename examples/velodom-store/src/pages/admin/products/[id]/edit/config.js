/**
 * ----------------------------------------
 * Module: Admin Product Edit Configuration
 * ----------------------------------------
 *
 * Keeps the private edit surface in the separate administration layout.
 * ----------------------------------------
 */

import { requireAdminPage } from "#app/domain/auth/admin-guard.js";

export default {
  path: "/admin/products/:id/edit",
  layout: "admin",
  beforeEnter: requireAdminPage,
  seo: {
    title: "Edit Product | VeloDom Store",
    description: "Edit a product in the VeloDom administration workflow example.",
    canonical: "/admin/products",
    lang: "en",
    robots: "noindex,nofollow",
    summary: {
      heading: "Edit product",
      text: "A native validated form with visible failure and conflict recovery."
    }
  }
};
