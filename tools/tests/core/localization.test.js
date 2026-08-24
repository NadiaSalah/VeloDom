import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocaleFormatter,
  createLocalization,
  defineLocaleDictionary,
  generateLocaleKeyDeclaration,
  inspectLocalization
} from "../../../packages/velodom/src/localization.ts";
import { velodom } from "../../../packages/velodom/src/vite-plugin/index.ts";

const english = defineLocaleDictionary({
  nav: {
    home: "Home",
    posts: "Posts"
  },
  seo: {
    title: "VeloDom"
  }
});

test("localization reports missing dictionary keys before a build", () => {
  const diagnostics = inspectLocalization({
    defaultLocale: "en",
    locales: {
      en: { lang: "en", messages: english },
      ar: {
        lang: "ar",
        messages: {
          nav: { home: "الرئيسية" },
          seo: { title: "فيلو دوم" },
          extra: "اختياري"
        }
      }
    }
  });

  assert.deepEqual(diagnostics.map(diagnostic => [
    diagnostic.severity,
    diagnostic.locale,
    diagnostic.key
  ]), [
    ["warning", "ar", "extra"],
    ["error", "ar", "nav.posts"]
  ]);
});

test("localization expands public routes and per-locale SEO without a runtime", () => {
  const i18n = createLocalization({
    defaultLocale: "en",
    locales: {
      en: { lang: "en", messages: english },
      ar: {
        lang: "ar", messages: {
          nav: { home: "الرئيسية", posts: "المقالات" },
          seo: { title: "فيلو دوم" }
        }
      }
    }
  });

  assert.equal(i18n.t("ar", "nav.posts"), "المقالات");
  assert.equal(i18n.localizePath("en", "/blog"), "/blog");
  assert.equal(i18n.localizePath("ar", "/blog"), "/ar/blog");
  assert.equal(
    i18n.localizePath("ar", "/blog?tag=html-first#latest"),
    "/ar/blog?tag=html-first#latest"
  );
  assert.equal(
    i18n.switchLocalePath("en", "/ar/blog?tag=html-first#latest"),
    "/blog?tag=html-first#latest"
  );
  assert.deepEqual(i18n.createSeoEntries([
    {
      path: "/",
      seo: ({ t }) => ({
        title: t("seo.title"),
        description: t("nav.home")
      })
    }
  ]), [
    {
      path: "/",
      canonical: "/",
      alternates: {
        en: "/",
        ar: "/ar"
      },
      lang: "en",
      title: "VeloDom",
      description: "Home"
    },
    {
      path: "/ar",
      canonical: "/ar",
      alternates: {
        en: "/",
        ar: "/ar"
      },
      lang: "ar",
      title: "فيلو دوم",
      description: "الرئيسية"
    }
  ]);
  assert.doesNotThrow(() => i18n.assertComplete());
});

test("localization exposes pure typed-key and native formatting helpers", () => {
  assert.equal(
    generateLocaleKeyDeclaration(english, "TranslationKey"),
    [
      "/** Generated from an application-owned VeloDom locale dictionary. */",
      "export type TranslationKey =",
      '  | "nav.home"',
      '  | "nav.posts"',
      '  | "seo.title";',
      ""
    ].join("\n")
  );

  const format = createLocaleFormatter("en-US");

  assert.equal(
    format.formatNumber(1234.5),
    new Intl.NumberFormat("en-US").format(1234.5)
  );
  assert.equal(
    format.formatCurrency(12.5, "usd"),
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(12.5)
  );
  assert.equal(
    format.formatDate("2026-01-02T12:00:00Z", { timeZone: "UTC" }),
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).format(
      new Date("2026-01-02T12:00:00Z")
    )
  );
});

test("localization can fail a build policy for incomplete dictionaries", () => {
  const i18n = createLocalization({
    defaultLocale: "en",
    locales: {
      en: { messages: english },
      ar: { messages: { nav: { home: "الرئيسية" } } }
    }
  });

  assert.throws(() => i18n.assertComplete(), /nav.posts/);
});

test("Vite surfaces missing messages as build diagnostics", () => {
  const plugin = velodom({
    localization: {
      defaultLocale: "en",
      locales: {
        en: { messages: english },
        ar: { messages: { nav: { home: "الرئيسية" } } }
      }
    }
  });

  assert.throws(
    () => plugin.buildStart.call({
      error(message) {
        throw new Error(message);
      },
      warn() {}
    }),
    /\[VD_I18N\].*nav.posts/
  );
});
