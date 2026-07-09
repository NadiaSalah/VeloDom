export default {
  seo: {
    title: "Blog Post | VeloDom Blog",
    description: "Read a post in the VeloDom demonstration blog.",
    lang: "en",
    robots: "index,follow",
    summary: {
      heading: "VeloDom blog post",
      text: "A dynamically loaded post from the VeloDom demonstration blog."
    },
    entries: async () => {
      const posts = await loadSeoPosts();

      return posts.map(post => ({
        path: `/blog/posts/${post.id}`,
        title: `${post.title} | VeloDom Blog`,
        description: post.body.slice(0, 150),
        canonical: `/blog/posts/${post.id}`,
        lang: "en",
        robots: "index,follow",
        keywords: [
          "VeloDom",
          "DummyJSON",
          ...(post.tags || [])
        ],
        openGraph: {
          type: "article",
          title: post.title,
          description: post.body.slice(0, 150)
        },
        summary: {
          heading: post.title,
          text: post.body.slice(0, 220)
        },
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          articleBody: post.body,
          url: `/blog/posts/${post.id}`
        }
      }));
    }
  }
};

async function loadSeoPosts() {
  const fallback = [
    {
      id: 1,
      title: "VeloDom DummyJSON post",
      body: "A build-time fallback SEO entry for the VeloDom DummyJSON blog showcase.",
      tags: [
        "velodom",
        "seo"
      ]
    }
  ];

  if (typeof fetch !== "function") return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 3000);

  try {
    const response = await fetch(
      "https://dummyjson.com/posts?limit=6&select=title,body,tags",
      {
        signal: controller.signal
      }
    );

    if (!response.ok) return fallback;

    const data = await response.json();

    return Array.isArray(data.posts) && data.posts.length
      ? data.posts
      : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
