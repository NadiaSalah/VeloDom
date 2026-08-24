/**
 * ----------------------------------------
 * Module: Build-time Localization
 * ----------------------------------------
 *
 * Validates application-owned message dictionaries and produces locale route
 * and SEO records for build integrations. It never installs a translation
 * runtime, mutates browser state, or chooses a locale for an application.
 * ----------------------------------------
 */

import type {
  SeoMetadata,
  SeoRouteEntry
} from "./types.ts";

/** A nested message dictionary whose leaves are plain strings. */
export type LocaleDictionary = {
  [key: string]: string | LocaleDictionary;
};

/** One application-owned locale definition. */
export interface LocaleDefinition {
  /** Language tag written into generated static SEO documents. */
  lang?: string;
  /** Typed application messages for this locale. */
  messages: LocaleDictionary;
}

/** Configuration used by the build-time localization helper. */
export interface LocalizationOptions {
  /** Existing locale name used as the complete dictionary baseline. */
  defaultLocale: string;
  /** Named locale definitions. The names become route prefixes. */
  locales: Record<string, LocaleDefinition>;
  /** Include the default locale prefix too. Defaults to false. */
  prefixDefaultLocale?: boolean;
}

/** A missing or extra dictionary key discovered before a production build. */
export interface LocalizationDiagnostic {
  locale: string;
  key: string;
  severity: "error" | "warning";
  message: string;
}

/** Translation context provided to localized SEO entry factories. */
export interface LocalizedSeoContext {
  locale: string;
  lang: string;
  /** Resolves a required dot-separated message key from the current locale. */
  t(key: string): string;
}

/** One source route that is expanded for every configured locale. */
export interface LocalizedSeoSource {
  path: string;
  seo: SeoMetadata | ((context: LocalizedSeoContext) => SeoMetadata);
}

/** Build-time localization controller. */
export interface Localization {
  readonly defaultLocale: string;
  readonly locales: readonly string[];
  readonly diagnostics: readonly LocalizationDiagnostic[];
  /** Resolves one string message for a named locale. */
  t(locale: string, key: string): string;
  /** Prefixes an application route for the named locale. */
  localizePath(locale: string, path: string): string;
  /** Expands source routes into locale-aware static SEO entries. */
  createSeoEntries(sources: readonly LocalizedSeoSource[]): SeoRouteEntry[];
  /** Throws when the dictionaries contain missing baseline keys. */
  assertComplete(): void;
}

/** Preserves inferred dictionary keys while documenting an application dictionary. */
export function defineLocaleDictionary<T extends LocaleDictionary>(dictionary: T): T {
  validateDictionary(dictionary, "dictionary");
  return dictionary;
}

/** Creates a build-time localization controller from plain application dictionaries. */
export function createLocalization(options: LocalizationOptions): Localization {
  const normalized = normalizeOptions(options);
  const diagnostics = inspectLocaleDictionaries(normalized);
  const locales = Object.keys(normalized.locales);

  return {
    defaultLocale: normalized.defaultLocale,
    locales,
    diagnostics,
    t(locale, key) {
      return resolveMessage(normalized, locale, key);
    },
    localizePath(locale, path) {
      return localizePath(normalized, locale, path);
    },
    createSeoEntries(sources) {
      return createLocalizedSeoEntries(normalized, sources);
    },
    assertComplete() {
      const missing = diagnostics.filter(diagnostic => diagnostic.severity === "error");

      if (missing.length) {
        throw new Error(formatLocalizationDiagnostics(missing));
      }
    }
  };
}

/** Inspects locale dictionaries without creating a browser-facing runtime. */
export function inspectLocalization(options: LocalizationOptions): LocalizationDiagnostic[] {
  const normalized = normalizeOptions(options);

  return inspectLocaleDictionaries(normalized);
}

function normalizeOptions(options: LocalizationOptions): Required<LocalizationOptions> {
  if (!options || typeof options !== "object") {
    throw new TypeError("VeloDom localization options must be an object");
  }

  const defaultLocale = String(options.defaultLocale || "").trim();
  const locales = options.locales;

  if (!defaultLocale || !locales || typeof locales !== "object") {
    throw new TypeError("VeloDom localization needs defaultLocale and locales");
  }

  if (!Object.hasOwn(locales, defaultLocale)) {
    throw new TypeError(`VeloDom default locale "${defaultLocale}" is not defined`);
  }

  const normalizedLocales: Record<string, LocaleDefinition> = {};

  for (const [rawLocale, definition] of Object.entries(locales)) {
    const locale = rawLocale.trim();

    if (!locale || !definition || typeof definition !== "object") {
      throw new TypeError("VeloDom locale definitions need a name and messages");
    }

    validateDictionary(definition.messages, `locale "${locale}" messages`);
    normalizedLocales[locale] = {
      lang: String(definition.lang || locale).trim() || locale,
      messages: definition.messages
    };
  }

  return {
    defaultLocale,
    locales: normalizedLocales,
    prefixDefaultLocale: options.prefixDefaultLocale === true
  };
}

function inspectLocaleDictionaries(
  options: Required<LocalizationOptions>
): LocalizationDiagnostic[] {
  const baseline = flattenDictionary(options.locales[options.defaultLocale].messages);
  const diagnostics: LocalizationDiagnostic[] = [];

  for (const [locale, definition] of Object.entries(options.locales)) {
    if (locale === options.defaultLocale) continue;

    const messages = flattenDictionary(definition.messages);

    for (const key of baseline.keys()) {
      if (!messages.has(key)) {
        diagnostics.push({
          locale,
          key,
          severity: "error",
          message: `Locale "${locale}" is missing message "${key}"`
        });
      }
    }

    for (const key of messages.keys()) {
      if (!baseline.has(key)) {
        diagnostics.push({
          locale,
          key,
          severity: "warning",
          message: `Locale "${locale}" has extra message "${key}"`
        });
      }
    }
  }

  return diagnostics.sort((left, right) => (
    left.locale.localeCompare(right.locale)
    || left.key.localeCompare(right.key)
  ));
}

function resolveMessage(
  options: Required<LocalizationOptions>,
  locale: string,
  key: string
) {
  const definition = options.locales[String(locale || "").trim()];

  if (!definition) {
    throw new RangeError(`Unknown VeloDom locale "${locale || "<empty>"}"`);
  }

  const normalizedKey = String(key || "").trim();
  const value = flattenDictionary(definition.messages).get(normalizedKey);

  if (value === undefined) {
    throw new ReferenceError(
      `Locale "${locale}" does not define message "${normalizedKey || "<empty>"}"`
    );
  }

  return value;
}

function localizePath(
  options: Required<LocalizationOptions>,
  locale: string,
  path: string
) {
  if (!Object.hasOwn(options.locales, locale)) {
    throw new RangeError(`Unknown VeloDom locale "${locale || "<empty>"}"`);
  }

  const normalizedPath = `/${String(path || "").replace(/^\/+|\/+$/g, "")}`
    .replace(/\/{2,}/g, "/");
  const basePath = normalizedPath === "/" ? "" : normalizedPath;

  if (locale === options.defaultLocale && !options.prefixDefaultLocale) {
    return basePath || "/";
  }

  return `/${locale}${basePath}`;
}

function createLocalizedSeoEntries(
  options: Required<LocalizationOptions>,
  sources: readonly LocalizedSeoSource[]
) {
  return sources.flatMap(source => Object.entries(options.locales).map(([
    locale,
    definition
  ]) => {
    const context: LocalizedSeoContext = {
      locale,
      lang: definition.lang,
      t: key => resolveMessage(options, locale, key)
    };
    const seo = typeof source.seo === "function"
      ? source.seo(context)
      : source.seo;

    return {
      ...seo,
      lang: seo.lang || definition.lang,
      path: localizePath(options, locale, source.path)
    };
  }));
}

function validateDictionary(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`VeloDom ${label} must be a nested object`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (!key.trim()) {
      throw new TypeError(`VeloDom ${label} cannot contain an empty key`);
    }

    if (typeof child === "string") continue;
    validateDictionary(child, `${label}.${key}`);
  }
}

function flattenDictionary(
  dictionary: LocaleDictionary,
  prefix = "",
  result = new Map<string, string>()
) {
  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result.set(path, value);
    } else {
      flattenDictionary(value, path, result);
    }
  }

  return result;
}

function formatLocalizationDiagnostics(diagnostics: LocalizationDiagnostic[]) {
  return [
    "VeloDom localization is incomplete:",
    ...diagnostics.map(diagnostic => `- ${diagnostic.message}`)
  ].join("\n");
}
