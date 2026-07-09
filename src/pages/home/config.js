export default {
  meta: {
    title: "VeloDom Blog",
    description: "HTML-first framework showcase"
  },
  seo: {
    title: "VeloDom Blog | DummyJSON CRUD Framework Showcase",
    description: "Explore a real VeloDom blog example with login, posts, comments, categories, CRUD requests, reusable components, and Tailwind CSS.",
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
      text: "A complete HTML-first framework showcase with DummyJSON posts, comments, auth, CRUD requests, routing, and reusable components."
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
