import type { PageConfig } from "velodom";

export default {
  meta: {
    title: "Public API Reference",
    description: "The source-verified VeloDom V1 package and syntax catalog"
  },
  seo: {
    title: "VeloDom V1 Public API Reference",
    description: "Every supported VeloDom V1 package subpath, runtime API, compiler helper, build-time utility, and testing boundary with code examples.",
    canonical: "/reference",
    lang: "en",
    robots: "index,follow",
    keywords: [
      "VeloDom API",
      "VeloDom compiler",
      "HTML-first framework",
      "VeloDom content",
      "VeloDom localization"
    ],
    openGraph: {
      type: "website"
    },
    summary: {
      heading: "VeloDom V1 public API",
      text: "A source-verified catalog of public imports, template syntax, build-time helpers, integrations, and tooling."
    }
  }
} satisfies PageConfig;
