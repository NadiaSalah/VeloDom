import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocalization,
  defineLocaleDictionary,
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
      lang: "en",
      title: "VeloDom",
      description: "Home"
    },
    {
      path: "/ar",
      lang: "ar",
      title: "فيلو دوم",
      description: "الرئيسية"
    }
  ]);
  assert.doesNotThrow(() => i18n.assertComplete());
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
