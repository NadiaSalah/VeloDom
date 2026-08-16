import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPageSeo,
  normalizeSeoConfig,
  resolvePageSeo
} from "../../packages/velodom/src/seo.ts";
import {
  invalidStructuredDataFixtures,
  structuredDataFixtures
} from "../../test-support/structured-data-fixtures.js";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.documentElement.removeAttribute("data-vd-default-title");
  document.documentElement.removeAttribute("data-vd-default-lang");
  document.documentElement.lang = "en";
  document.head.innerHTML = "<title>Application</title>";
});

test("SEO config validates and normalizes dynamic entries", () => {
  const config = normalizeSeoConfig({
    title: "Posts",
    description: "All posts",
    keywords: ["VeloDom", "VeloDom"],
    entries: [
      {
        path: "/posts/1/",
        title: "First post",
        description: "First post summary"
      }
    ]
  });

  assert.deepEqual(config.keywords, ["VeloDom"]);
  assert.equal(config.entries[0].path, "/posts/1");
  assert.equal(
    resolvePageSeo(config, "/posts/1").title,
    "First post"
  );
});

test("runtime SEO replaces managed metadata during navigation", () => {
  applyPageSeo({
    title: "First page",
    description: "First description",
    canonical: "/first",
    lang: "ar",
    openGraph: {
      type: "article"
    },
    jsonLd: {
      "@type": "Article"
    }
  }, "/first");

  assert.equal(document.title, "First page");
  assert.equal(document.documentElement.lang, "ar");
  assert.equal(
    document.querySelector('meta[name="description"]').content,
    "First description"
  );
  assert.equal(
    document.querySelector('meta[property="og:type"]').content,
    "article"
  );
  assert.match(
    document.querySelector('link[rel="canonical"]').href,
    /\/first$/
  );

  applyPageSeo(undefined, "/second");

  assert.equal(document.title, "Application");
  assert.equal(document.documentElement.lang, "en");
  assert.equal(
    document.querySelector("[data-vd-seo]"),
    null
  );
});

test("SEO config accepts common structured-data fixtures", () => {
  for (const fixture of structuredDataFixtures) {
    const config = normalizeSeoConfig({
      title: fixture.name,
      description: `${fixture.name} structured data`,
      jsonLd: fixture.jsonLd
    });

    assert.deepEqual(config.jsonLd, fixture.jsonLd);
  }
});

test("SEO config accepts arrays of structured-data fixtures", () => {
  const jsonLd = structuredDataFixtures.map(fixture => fixture.jsonLd);
  const config = normalizeSeoConfig({
    title: "Structured data collection",
    description: "Multiple JSON-LD blocks for one page",
    jsonLd
  });

  assert.deepEqual(config.jsonLd, jsonLd);
});

test("SEO config rejects invalid structured-data fixtures", () => {
  for (const fixture of invalidStructuredDataFixtures) {
    assert.throws(
      () => normalizeSeoConfig({
        title: fixture.name,
        description: "Invalid structured data",
        jsonLd: fixture.jsonLd
      }),
      /jsonLd/
    );
  }
});

test("invalid SEO config fails before a page is mounted", () => {
  assert.throws(
    () => normalizeSeoConfig({
      title: "",
      description: "Description"
    }),
    /title must be a non-empty string/
  );
});
