export default {
  meta: {
    title: "VeloDom Blog",
    description: "HTML-first framework showcase"
  },
  seo: {
    title: "VeloDom Blog | HTML-first Framework Showcase",
    description: "Explore a working VeloDom blog built with reactive state, routing, components, requests, and compiler-first HTML.",
    canonical: "/",
    lang: "en",
    robots: "index,follow",
    keywords: [
      "VeloDom",
      "HTML-first framework",
      "reactive JavaScript",
      "frontend framework"
    ],
    openGraph: {
      type: "website",
      title: "VeloDom Blog",
      description: "A complete HTML-first VeloDom showcase application."
    },
    summary: {
      heading: "VeloDom Blog",
      text: "A complete HTML-first framework showcase with reactive pages, requests, routing, and reusable components."
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "VeloDom Blog",
      url: "/"
    }
  },
  allowExternalWrite: [
    "externalPostResult",
    "externalPostLoading",
    "externalPostError"
  ]
};
