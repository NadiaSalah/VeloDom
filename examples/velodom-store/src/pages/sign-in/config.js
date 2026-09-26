/**
 * ----------------------------------------
 * Module: Store Session Route Configuration
 * ----------------------------------------
 *
 * Keeps the deterministic account switcher out of search indexes while using
 * the public storefront shell.
 * ----------------------------------------
 */

export default {
  path: "/sign-in",
  seo: {
    title: "Session Fixture | VeloDom Store",
    description: "Exercise session, role, tenant, logout, and expiry behavior in the VeloDom Store reference.",
    canonical: "/sign-in",
    lang: "en",
    robots: "noindex,nofollow",
    summary: {
      heading: "Session fixture",
      text: "A deterministic local session boundary for testing authorization behavior."
    }
  }
};
