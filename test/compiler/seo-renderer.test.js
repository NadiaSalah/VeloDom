import assert from "node:assert/strict";
import test from "node:test";
import {
  renderSeoDocument
} from "../../src/core/vite-plugin/seo-renderer.ts";

const shell = `<!doctype html>
<html lang="en">
<head><title>VeloDom</title></head>
<body><div id="app"></div><script src="/app.js"></script></body>
</html>`;

test("static SEO renderer emits metadata and visible fallback content", () => {
  const html = renderSeoDocument(shell, {
    title: "Guide & Examples",
    description: "Learn <VeloDom> safely.",
    canonical: "/guide",
    lang: "ar",
    keywords: ["VeloDom", "HTML first"],
    openGraph: {
      type: "article"
    },
    summary: {
      heading: "A concise guide",
      text: "Server-delivered content for visitors and crawlers."
    },
    jsonLd: {
      "@context": "https://schema.org",
      name: "</script><script>alert(1)</script>"
    }
  }, {
    siteUrl: "https://example.com"
  });

  assert.match(html, /<title>Guide &amp; Examples<\/title>/);
  assert.match(html, /content="Learn &lt;VeloDom&gt; safely\."/);
  assert.match(html, /href="https:\/\/example\.com\/guide"/);
  assert.match(html, /data-vd-seo-fallback/);
  assert.match(html, /<h1>A concise guide<\/h1>/);
  assert.match(html, /lang="ar"/);
  assert.match(html, /data-vd-default-title="VeloDom"/);
  assert.doesNotMatch(
    html,
    /<\/script><script>alert\(1\)<\/script>/
  );
  assert.match(html, /\\u003c\/script>/);
});

test("static SEO renderer falls back to title and description summary", () => {
  const html = renderSeoDocument(shell, {
    title: "Fallback title",
    description: "Fallback description"
  });

  assert.match(html, /<h1>Fallback title<\/h1>/);
  assert.match(html, /<p>Fallback description<\/p>/);
});
