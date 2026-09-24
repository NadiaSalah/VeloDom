/**
 * ----------------------------------------
 * Module: Storefront Not-Found Configuration
 * ----------------------------------------
 *
 * Marks the application-owned recovery route as non-indexable.
 * ----------------------------------------
 */

export default {
  seo: {
    title: "Not Found | VeloDom Store",
    description: "The requested storefront example route was not found.",
    robots: "noindex,nofollow",
    summary: {
      heading: "Store route not found",
      text: "Return to the VeloDom Store catalog."
    }
  }
};
