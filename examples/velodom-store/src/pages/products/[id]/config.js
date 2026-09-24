/**
 * ----------------------------------------
 * Module: Product Detail Route Configuration
 * ----------------------------------------
 *
 * Generates build-time metadata for every deterministic direct product route.
 * ----------------------------------------
 */

import { getProductEntries } from "../../../domain/catalog/catalog-service.js";

export default {
  seo: {
    title: "Product | VeloDom Store",
    description: "View a mock product in the VeloDom storefront reference.",
    summary: {
      heading: "VeloDom Store product",
      text: "A direct product route backed by deterministic example data."
    },
    entries: async () => getProductEntries().map(product => ({
      path: `/products/${product.id}`,
      title: `${product.name} | VeloDom Store`,
      description: product.summary,
      canonical: `/products/${product.id}`,
      lang: "en",
      robots: "index,follow",
      keywords: ["VeloDom", product.categoryLabel, product.name],
      summary: {
        heading: product.name,
        text: product.description
      },
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: (product.priceCents / 100).toFixed(2),
          availability: product.variants.some(variant => variant.stock > 0)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock"
        }
      }
    }))
  }
};
