import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createLocaleFormatter,
  createLocalization,
  defineLocaleDictionary,
  definePluralMessage,
  extractLocaleKeyUsage,
  generateLocaleKeyDeclaration,
  getLocaleKeyCompletions,
  inspectLocalization
} from "../../../packages/velodom/src/localization.ts";
import { runVeloDomCli } from "../../../packages/velodom/src/cli.ts";
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

test("localization supports named parameters, explicit plurals, completions, and direction", () => {
  const dictionary = defineLocaleDictionary({
    greeting: "Hello {name}",
    items: definePluralMessage({
      one: "{count} item",
      other: "{count} items"
    })
  });
  const i18n = createLocalization({
    defaultLocale: "en",
    locales: {
      en: { lang: "en-US", messages: dictionary },
      ar: {
        lang: "ar-EG",
        messages: {
          greeting: "مرحبًا {name}",
          items: definePluralMessage({
            one: "عنصر واحد",
            other: "{count} عناصر"
          })
        }
      }
    }
  });

  assert.equal(i18n.t("en", "greeting", { name: "Nadia" }), "Hello Nadia");
  assert.equal(i18n.plural("en", "items", 1), "1 item");
  assert.equal(i18n.plural("en", "items", 3), "3 items");
  assert.equal(i18n.direction("ar"), "rtl");
  assert.deepEqual(i18n.keys, ["greeting", "items"]);
  assert.deepEqual(getLocaleKeyCompletions(dictionary).map(item => [
    item.label,
    item.kind
  ]), [
    ["greeting", "message"],
    ["items", "plural"]
  ]);
  assert.deepEqual(extractLocaleKeyUsage([
    'i18n.t(locale, "greeting"); t("seo.title"); i18n.plural("en", "items", 2);'
  ]), ["greeting", "items", "seo.title"]);
  assert.throws(() => i18n.t("en", "greeting"), /requires interpolation/);
  assert.throws(() => i18n.t("en", "greeting", { name: Infinity }), /finite/);
  assert.throws(() => i18n.t("en", "greeting", { name: {} }), /primitive/);
  assert.throws(() => i18n.t("en", "items"), /is plural/);
});

test("localization reports unused, unknown, and explicit direction mismatches", () => {
  const diagnostics = inspectLocalization({
    defaultLocale: "en",
    locales: {
      en: { messages: english },
      ar: { direction: "ltr", messages: english }
    }
  }, ["nav.home", "unknown.key"]);

  assert.ok(diagnostics.some(item => item.code === "VD_I18N_DIRECTION"));
  assert.ok(diagnostics.some(item => item.code === "VD_I18N_UNUSED_KEY" && item.key === "nav.posts"));
  assert.ok(diagnostics.some(item => item.code === "VD_I18N_UNKNOWN_KEY"));
});

test("vd i18n extracts and checks a static application-owned config", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-i18n-"));
  const output = [];

  try {
    await mkdir(join(root, "src/pages/home"), { recursive: true });
    await writeFile(join(root, "src/i18n.js"), `
      import {
        defineLocaleDictionary,
        definePluralMessage
      } from "velodom/localization";
      export const localizationOptions = {
        defaultLocale: "en",
        locales: {
          en: {
            direction: "ltr",
            messages: defineLocaleDictionary({
              greeting: "Hello",
              items: definePluralMessage({ one: "{count} item", other: "{count} items" })
            })
          },
          ar: {
            lang: "ar",
            direction: "rtl",
            messages: defineLocaleDictionary({
              greeting: "مرحبًا",
              items: definePluralMessage({ one: "عنصر واحد", other: "{count} عناصر" })
            })
          }
        }
      };
    `);
    await writeFile(
      join(root, "src/pages/home/script.js"),
      'export const state = { title: i18n.t(locale, "greeting"), count: i18n.plural(locale, "items", 2) };\n'
    );

    assert.equal(await runVeloDomCli(["i18n", "extract", "--json", "--root", root], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 0);
    assert.deepEqual(JSON.parse(output.join("\n")).keys, ["greeting", "items"]);

    output.length = 0;
    assert.equal(await runVeloDomCli(["i18n", "check", "--root", root], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 0);
    assert.match(output.join("\n"), /dictionaries and quoted usage agree/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
