/**
 * ----------------------------------------
 * Module: Cart Route Configuration
 * ----------------------------------------
 *
 * Keeps user-specific guest-cart UI out of static indexing.
 * ----------------------------------------
 */

export default {
  seo: {
    title: "Guest Cart | VeloDom Store",
    description: "Review the application-owned mock guest cart.",
    canonical: "/cart",
    lang: "en",
    robots: "noindex,nofollow",
    summary: {
      heading: "Guest cart",
      text: "A client-owned reference cart whose prices and availability are requoted before use."
    }
  }
};
