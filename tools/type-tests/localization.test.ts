/**
 * ----------------------------------------
 * Module: Localization Type Assertions
 * ----------------------------------------
 *
 * Ensures inferred dictionary and locale names remain useful for TypeScript
 * applications without affecting the published runtime package.
 * ----------------------------------------
 */

import {
  createLocalization,
  defineLocaleDictionary
} from "../../packages/velodom/src/localization.ts";

const messages = defineLocaleDictionary({
  nav: {
    home: "Home"
  }
});

const i18n = createLocalization({
  defaultLocale: "en",
  locales: {
    en: { messages },
    ar: { messages: { nav: { home: "الرئيسية" } } }
  }
});

i18n.t("ar", "nav.home");

// @ts-expect-error Translation keys come from the default dictionary.
i18n.t("ar", "nav.missing");

// @ts-expect-error Locale names come from the application localization options.
i18n.t("fr", "nav.home");
