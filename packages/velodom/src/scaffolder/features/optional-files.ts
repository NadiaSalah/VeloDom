/**
 * ----------------------------------------
 * Module: Optional Feature Files
 * ----------------------------------------
 *
 * Produces application-owned localization and test files shared by initial
 * project creation and the idempotent `vd add` workflow.
 * ----------------------------------------
 */

import type {
  ScaffoldLanguage,
  ScaffoldTesting
} from "../types.ts";

/** Creates the first-party localization example files for one source language. */
export function createLocalizationFeatureFiles(
  language: ScaffoldLanguage
): Record<string, string> {
  const extension = language === "typescript" ? "ts" : "js";
  const type = language === "typescript" ? ": \"en\" | \"ar\"" : "";
  const localeType = language === "typescript" ? ': "en" | "ar"' : "";
  const stateLocale = language === "typescript" ? ' as "en" | "ar"' : "";

  return {
    [`src/i18n.${extension}`]: `import {
  createLocalization,
  defineLocaleDictionary,
  definePluralMessage,
} from "velodom/localization";

/** Application-owned dictionaries consumed by VeloDom build integration. */
export const localizationOptions = {
  defaultLocale: "en",
  locales: {
    en: {
      lang: "en",
      direction: "ltr",
      messages: defineLocaleDictionary({
        greeting: "Hello {name}",
        itemCount: definePluralMessage({
          one: "{count} item",
          other: "{count} items",
        }),
      }),
    },
    ar: {
      lang: "ar",
      direction: "rtl",
      messages: defineLocaleDictionary({
        greeting: "مرحبًا {name}",
        itemCount: definePluralMessage({
          one: "عنصر واحد",
          other: "{count} عناصر",
        }),
      }),
    },
  },
}${language === "typescript" ? " as const" : ""};

/** Typed localization controller shared by application pages and build hooks. */
export const i18n = createLocalization(localizationOptions);

/** Applies one explicit locale and writing direction to the current document. */
export function applyLocale(locale${type}) {
  document.documentElement.lang = locale;
  document.documentElement.dir = i18n.direction(locale);
}
`,
    "src/pages/localization/index.html": `<main class="shell hero">
  <p>Optional localization</p>
  <h1 vd-text="greeting"></h1>
  <p vd-text="itemLabel"></p>
  <div>
    <button class="button" type="button" vd-on:click="setLocale('en')">English</button>
    <button class="button" type="button" vd-on:click="setLocale('ar')">العربية</button>
    <button class="button" type="button" vd-on:click="increment()">Add item</button>
  </div>
</main>
`,
    [`src/pages/localization/script.${extension}`]: `import { applyLocale, i18n } from "../../i18n.${extension}";

/** Shallow page state for the generated locale-switching example. */
export const state = {
  locale: "en"${stateLocale},
  count: 1,
  greeting: i18n.t("en", "greeting", { name: "VeloDom" }),
  itemLabel: i18n.plural("en", "itemCount", 1),
  setLocale(locale${localeType}) {
    this.locale = locale;
    this.greeting = i18n.t(locale, "greeting", { name: "VeloDom" });
    this.itemLabel = i18n.plural(locale, "itemCount", this.count);
    applyLocale(locale);
  },
  increment() {
    this.count += 1;
    this.itemLabel = i18n.plural(this.locale, "itemCount", this.count);
  },
};
`,
    [`src/pages/localization/config.${extension}`]: `export default {
  path: "/localization",
  seo: {
    title: "Localization",
    description: "English and Arabic localization example.",
  },
};
`
  };
}

/** Creates real unit and/or browser test files for an existing project. */
export function createTestingFeatureFiles(
  language: ScaffoldLanguage,
  testing: Exclude<ScaffoldTesting, "none">,
  devCommand = "npm run dev"
): Record<string, string> {
  const extension = language === "typescript" ? "ts" : "js";
  const files: Record<string, string> = {};

  if (testing === "unit" || testing === "all") {
    files["tests/unit/project.test.js"] = `import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("project depends on VeloDom", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.match(manifest.dependencies.velodom, /^\\^?\\d+\\./);
});
`;
  }

  if (testing === "e2e" || testing === "all") {
    files[`tests/e2e/home.spec.${extension}`] = `import { expect, test } from "@playwright/test";

test("renders the VeloDom application", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
});
`;
    files["playwright.config.js"] = `import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "${devCommand} -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
`;
  }

  return files;
}
