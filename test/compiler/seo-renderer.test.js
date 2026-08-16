import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import {
  join
} from "node:path";
import {
  tmpdir
} from "node:os";
import test from "node:test";
import {
  generateStaticSeoPages,
  renderSeoDocument
} from "../../src/core/vite-plugin/seo-renderer.ts";
import {
  structuredDataFixtures
} from "../../test-support/structured-data-fixtures.js";

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

test("static SEO renderer emits structured-data fixture arrays", () => {
  const jsonLd = structuredDataFixtures.map(fixture => fixture.jsonLd);
  const html = renderSeoDocument(shell, {
    title: "Structured content",
    description: "Page with multiple JSON-LD records",
    jsonLd
  });

  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type":"WebSite"/);
  assert.match(html, /"@type":"BlogPosting"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"Product"/);
});

test("static SEO renderer can replace fallback with static app content", () => {
  const html = renderSeoDocument(shell, {
    title: "Static article",
    description: "Server-delivered article preview"
  }, {
    staticContent: {
      html: "<article><h1>Static article</h1><p>Rendered at build time.</p></article>"
    }
  });

  assert.match(html, /data-vd-static-content/);
  assert.match(html, /data-vd-static-hydration="client-takeover"/);
  assert.match(html, /<article><h1>Static article<\/h1>/);
  assert.doesNotMatch(html, /data-vd-seo-fallback/);
});

test("static SEO renderer resolves async page entry hooks", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-seo-hook-"));

  try {
    await mkdir(join(root, "dist"), {
      recursive: true
    });
    await mkdir(join(root, "src", "pages", "blog", "posts", "[id]"), {
      recursive: true
    });
    await writeFile(join(root, "dist", "index.html"), shell);
    await writeFile(
      join(root, "src", "pages", "blog", "posts", "[id]", "index.html"),
      "<main>Post</main>"
    );
    await writeFile(
      join(root, "src", "pages", "blog", "posts", "[id]", "config.js"),
      `
        export default {
          seo: {
            title: "Post",
            description: "Post fallback",
            entries: async ({ page, route }) => [{
              path: "/blog/posts/7",
              title: "CMS post",
              description: page + " " + route,
              summary: {
                heading: "CMS post",
                text: "Loaded from a hook"
              }
            }]
          }
        };
      `
    );

    const result = await generateStaticSeoPages({
      root,
      outDir: "dist"
    });
    const html = await readFile(
      join(root, "dist", "blog", "posts", "7", "index.html"),
      "utf8"
    );

    assert.deepEqual(result.routes, [
      "/blog/posts/7"
    ]);
    assert.match(html, /<title>CMS post<\/title>/);
    assert.match(html, /Loaded from a hook/);
  } finally {
    await rm(root, {
      recursive: true,
      force: true
    });
  }
});

test("static SEO renderer invokes optional full-content render hooks", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-seo-content-"));

  try {
    await mkdir(join(root, "dist"), {
      recursive: true
    });
    await mkdir(join(root, "src", "pages", "docs"), {
      recursive: true
    });
    await writeFile(join(root, "dist", "index.html"), shell);
    await writeFile(
      join(root, "src", "pages", "docs", "index.html"),
      "<main>Docs</main>"
    );
    await writeFile(
      join(root, "src", "pages", "docs", "config.js"),
      `
        export default {
          path: "/docs",
          seo: {
            title: "Docs",
            description: "Documentation page"
          }
        };
      `
    );

    const result = await generateStaticSeoPages({
      root,
      outDir: "dist",
      renderPage: ({ page, route, seo }) => ({
        html: "<article><h1>" + seo.title + "</h1><p>" + page + " " + route + "</p></article>"
      })
    });
    const html = await readFile(
      join(root, "dist", "docs", "index.html"),
      "utf8"
    );

    assert.deepEqual(result.routes, [
      "/docs"
    ]);
    assert.match(html, /data-vd-static-content/);
    assert.match(html, /client-takeover/);
    assert.match(html, /<p>docs \/docs<\/p>/);
  } finally {
    await rm(root, {
      recursive: true,
      force: true
    });
  }
});

test("static SEO renderer rejects script tags from content hooks", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-seo-unsafe-"));

  try {
    await mkdir(join(root, "dist"), {
      recursive: true
    });
    await mkdir(join(root, "src", "pages", "unsafe"), {
      recursive: true
    });
    await writeFile(join(root, "dist", "index.html"), shell);
    await writeFile(
      join(root, "src", "pages", "unsafe", "index.html"),
      "<main>Unsafe</main>"
    );
    await writeFile(
      join(root, "src", "pages", "unsafe", "config.js"),
      `
        export default {
          seo: {
            title: "Unsafe",
            description: "Unsafe page"
          }
        };
      `
    );

    await assert.rejects(
      generateStaticSeoPages({
        root,
        outDir: "dist",
        renderPage: () => "<script>alert(1)</script>"
      }),
      /must not return script tags/
    );
  } finally {
    await rm(root, {
      recursive: true,
      force: true
    });
  }
});

test("static SEO renderer reads single-file page config blocks", async () => {
  const root = await mkdtemp(join(tmpdir(), "vd-seo-sfc-"));

  try {
    const shell = "<html><head><title>VeloDom</title></head><body><div id=\"app\"></div></body></html>";
    await mkdir(join(root, "dist"), {
      recursive: true
    });
    await writeFile(join(root, "dist", "index.html"), shell);
    await mkdir(join(root, "src", "pages"), {
      recursive: true
    });
    await writeFile(
      join(root, "src", "pages", "about.vd"),
      `
        <template>
          <main>
            <h1>About</h1>
          </main>
        </template>
        <config>
          export default {
            path: "/about",
            seo: {
              title: "About VeloDom",
              description: "Single-file SEO page.",
              summary: {
                heading: "About VeloDom",
                text: "Generated from a .vd config block."
              }
            }
          };
        </config>
      `
    );

    const result = await generateStaticSeoPages({
      root,
      outDir: "dist"
    });
    const html = await readFile(
      join(root, "dist", "about", "index.html"),
      "utf8"
    );

    assert.deepEqual(result.routes, [
      "/about"
    ]);
    assert.match(html, /<title>About VeloDom<\/title>/);
    assert.match(html, /Generated from a \.vd config block\./);
  } finally {
    await rm(root, {
      recursive: true,
      force: true
    });
  }
});

test("static SEO renderer transpiles self-contained TypeScript page config", async () => {
  const root = await mkdtemp(join(tmpdir(), "vd-seo-ts-config-"));

  try {
    await mkdir(join(root, "dist"), {
      recursive: true
    });
    await mkdir(join(root, "src", "pages", "typed"), {
      recursive: true
    });
    await writeFile(join(root, "dist", "index.html"), shell);
    await writeFile(
      join(root, "src", "pages", "typed", "index.html"),
      "<main>Typed config</main>"
    );
    await writeFile(
      join(root, "src", "pages", "typed", "config.ts"),
      `
        import type { PageConfig } from "velodom";

        export default {
          path: "/typed",
          seo: {
            title: "Typed config",
            description: "SEO loaded from TypeScript configuration."
          }
        } satisfies PageConfig;
      `
    );

    const result = await generateStaticSeoPages({
      root,
      outDir: "dist"
    });
    const html = await readFile(
      join(root, "dist", "typed", "index.html"),
      "utf8"
    );

    assert.deepEqual(result.routes, ["/typed"]);
    assert.match(html, /<title>Typed config<\/title>/);
    assert.match(html, /SEO loaded from TypeScript configuration/);
  } finally {
    await rm(root, {
      recursive: true,
      force: true
    });
  }
});
