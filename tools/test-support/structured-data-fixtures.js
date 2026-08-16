export const structuredDataFixtures = Object.freeze([
  {
    name: "WebSite",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "VeloDom",
      url: "https://example.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://example.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  },
  {
    name: "BlogPosting",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Building HTML-first apps with VeloDom",
      description: "A practical article rendered with static SEO metadata.",
      datePublished: "2026-07-09",
      author: {
        "@type": "Person",
        name: "Nadia Salah"
      }
    }
  },
  {
    name: "BreadcrumbList",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://example.com/"
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: "https://example.com/blog"
        }
      ]
    }
  },
  {
    name: "FAQPage",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does VeloDom require TypeScript for app code?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. The framework core is TypeScript, while application code can be vanilla JavaScript or TypeScript."
          }
        }
      ]
    }
  },
  {
    name: "Product",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "VeloDom Starter",
      description: "A sample product-style structured-data fixture.",
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "0",
        availability: "https://schema.org/InStock"
      }
    }
  }
]);

export const invalidStructuredDataFixtures = Object.freeze([
  {
    name: "string value",
    jsonLd: "BlogPosting"
  },
  {
    name: "mixed array",
    jsonLd: [
      {
        "@type": "Article"
      },
      "Article"
    ]
  }
]);
