/**
 * ----------------------------------------
 * Module: Admin Product List Configuration
 * ----------------------------------------
 *
 * Selects the dedicated admin shell and prevents private workflow indexing.
 * ----------------------------------------
 */

export default {
  path: "/admin/products",
  layout: "admin",
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
