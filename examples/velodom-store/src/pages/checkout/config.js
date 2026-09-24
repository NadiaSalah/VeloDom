/**
 * ----------------------------------------
 * Module: Mock Checkout Route Configuration
 * ----------------------------------------
 *
 * Explicitly prevents a simulated transaction screen from being indexed.
 * ----------------------------------------
 */

export default {
  seo: {
    title: "Mock Checkout | VeloDom Store",
    description: "A non-transactional checkout simulation for the VeloDom storefront reference.",
    canonical: "/checkout",
    lang: "en",
    robots: "noindex,nofollow",
    summary: {
      heading: "Mock checkout",
      text: "A deterministic, non-transactional checkout handoff that takes no payment."
    }
  }
};
