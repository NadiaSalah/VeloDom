/**
 * ----------------------------------------
 * Module: Admin Product List Configuration
 * ----------------------------------------
 *
 * Selects the dedicated admin shell and prevents private workflow indexing.
 * ----------------------------------------
 */

import { requireAdminPage } from "#app/domain/auth/admin-guard.js";

export default {
  path: "/admin/products",
  layout: "admin",
  beforeEnter: requireAdminPage,
  seo: {
    title: "Product Administration | VeloDom Store",
    description: "Manage deterministic VeloDom Store fixture products.",
    canonical: "/admin/products",
    lang: "en",
    robots: "noindex,nofollow",
    summary: {
      heading: "Product administration",
      text: "An application-owned CRUD workflow built from native HTML and VeloDom requests."
    }
  }
};
