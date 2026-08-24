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

/** Dot-separated leaf keys inferred from one application message dictionary. */
export type LocaleMessageKey<T extends LocaleDictionary> = {
  [Key in Extract<keyof T, string>]: T[Key] extends string
    ? Key
    : T[Key] extends LocaleDictionary
      ? `${Key}.${LocaleMessageKey<T[Key]>}`
      : never;
}[Extract<keyof T, string>];

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
export interface LocalizedSeoContext<TKey extends string = string> {
  locale: string;
  lang: string;
  /** Resolves a required dot-separated message key from the current locale. */
  t(key: TKey): string;
}

/** One source route that is expanded for every configured locale. */
export interface LocalizedSeoSource<TKey extends string = string> {
  path: string;
  seo: SeoMetadata | ((context: LocalizedSeoContext<TKey>) => SeoMetadata);
}

/** Build-time localization controller. */
export interface Localization<TLocale extends string = string, TKey extends string = string> {
  readonly defaultLocale: string;
  readonly locales: readonly TLocale[];
  readonly diagnostics: readonly LocalizationDiagnostic[];
  /** Resolves one string message for a named locale. */
  t(locale: TLocale, key: TKey): string;
  /** Prefixes an application route while preserving its query string and hash. */
  localizePath(locale: TLocale, path: string): string;
  /** Replaces a known locale prefix in an application URL and preserves its suffix. */
  switchLocalePath(locale: TLocale, path: string): string;
  /** Expands source routes into locale-aware static SEO entries. */
  createSeoEntries(sources: readonly LocalizedSeoSource<TKey>[]): SeoRouteEntry[];
  /** Throws when the dictionaries contain missing baseline keys. */
  assertComplete(): void;
}

/** Native locale-formatting helpers with no translation provider or state. */
export interface LocaleFormatter {
  readonly locale: string;
  /** Formats a date, time, and optional time zone through `Intl.DateTimeFormat`. */
  formatDate(
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions
  ): string;
  /** Formats a finite number through `Intl.NumberFormat`. */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  /** Formats a finite amount as a currency through `Intl.NumberFormat`. */
  formatCurrency(
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ): string;
  /** Formats a relative amount through `Intl.RelativeTimeFormat`. */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ): string;
}

/** Preserves inferred dictionary keys while documenting an application dictionary. */
export function defineLocaleDictionary<T extends LocaleDictionary>(dictionary: T): T {
  validateDictionary(dictionary, "dictionary");
  return dictionary;
}

/** Creates a build-time localization controller from plain application dictionaries. */
export function createLocalization<
  const TLocales extends Record<string, LocaleDefinition>,
  const TDefaultLocale extends Extract<keyof TLocales, string>
>(
  options: LocalizationOptions & {
    defaultLocale: TDefaultLocale;
    locales: TLocales;
  }
): Localization<
  Extract<keyof TLocales, string>,
  LocaleMessageKey<TLocales[TDefaultLocale]["messages"]>
> {
  const normalized = normalizeOptions(options);
  const diagnostics = inspectLocaleDictionaries(normalized);
  const locales = Object.keys(normalized.locales) as Extract<keyof TLocales, string>[];

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
    switchLocalePath(locale, path) {
      return switchLocalePath(normalized, locale, path);
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

/**
 * Produces an application-owned `.d.ts` type declaration from a dictionary.
 *
 * The helper stays pure so projects choose whether to write it from a build
 * script, a Vite hook, or no file at all.
 */
export function generateLocaleKeyDeclaration<T extends LocaleDictionary>(
  dictionary: T,
  typeName = "VeloDomTranslationKey"
) {
  validateDictionary(dictionary, "dictionary");

  const normalizedTypeName = String(typeName || "").trim();

  if (!/^[A-Za-z_$][\w$]*$/.test(normalizedTypeName)) {
    throw new TypeError("VeloDom locale declaration type names must be valid identifiers");
  }

  const keys = [...flattenDictionary(dictionary).keys()].sort((left, right) => (
    left.localeCompare(right)
  ));
  const values = keys.length
    ? keys.map(key => `  | ${JSON.stringify(key)}`).join("\n")
    : "  never";

  return [
    "/** Generated from an application-owned VeloDom locale dictionary. */",
    `export type ${normalizedTypeName} =`,
    `${values};`,
    ""
  ].join("\n");
}

/** Creates native `Intl` helpers for one explicit locale without global state. */
export function createLocaleFormatter(locale: string): LocaleFormatter {
  const normalizedLocale = requireLocale(locale);

  return {
    locale: normalizedLocale,
    formatDate(value, options) {
      return new Intl.DateTimeFormat(normalizedLocale, options).format(
        normalizeDate(value)
      );
    },
    formatNumber(value, options) {
      return new Intl.NumberFormat(normalizedLocale, options).format(
        requireFiniteNumber(value, "number")
      );
    },
    formatCurrency(value, currency, options) {
      const normalizedCurrency = String(currency || "").trim().toUpperCase();

      if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
        throw new TypeError("VeloDom currency codes must be ISO 4217 three-letter codes");
      }

      return new Intl.NumberFormat(normalizedLocale, {
        ...options,
        style: "currency",
        currency: normalizedCurrency
      }).format(requireFiniteNumber(value, "currency value"));
    },
    formatRelativeTime(value, unit, options) {
      return new Intl.RelativeTimeFormat(normalizedLocale, options).format(
        requireFiniteNumber(value, "relative time value"),
        unit
      );
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

  const { pathname, suffix } = splitPathSuffix(path);
  const normalizedPath = `/${pathname.replace(/^\/+|\/+$/g, "")}`
    .replace(/\/{2,}/g, "/");
  const basePath = normalizedPath === "/" ? "" : normalizedPath;

  if (locale === options.defaultLocale && !options.prefixDefaultLocale) {
    return `${basePath || "/"}${suffix}`;
  }

  return `/${locale}${basePath}${suffix}`;
}

function switchLocalePath(
  options: Required<LocalizationOptions>,
  locale: string,
  path: string
) {
  if (!Object.hasOwn(options.locales, locale)) {
    throw new RangeError(`Unknown VeloDom locale "${locale || "<empty>"}"`);
  }

  const { pathname, suffix } = splitPathSuffix(path);
  const normalizedPath = `/${pathname.replace(/^\/+|\/+$/g, "")}`
    .replace(/\/{2,}/g, "/");
  const knownLocale = Object.keys(options.locales).find(candidate => (
    normalizedPath === `/${candidate}`
    || normalizedPath.startsWith(`/${candidate}/`)
  ));
  const sourcePath = knownLocale
    ? normalizedPath.slice(knownLocale.length + 1) || "/"
    : normalizedPath;

  return localizePath(options, locale, `${sourcePath}${suffix}`);
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

    const path = localizePath(options, locale, source.path);
    const alternates = Object.fromEntries(Object.entries(options.locales).map(([
      alternateLocale,
      alternateDefinition
    ]) => [
      alternateDefinition.lang,
      localizePath(options, alternateLocale, source.path)
    ]));

    return {
      ...seo,
      canonical: seo.canonical || path,
      alternates: {
        ...alternates,
        ...seo.alternates
      },
      lang: seo.lang || definition.lang,
      path
    };
  }));
}

function splitPathSuffix(path: string) {
  const value = String(path || "").trim();
  const hashIndex = value.indexOf("#");
  const beforeHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : value.slice(hashIndex);
  const queryIndex = beforeHash.indexOf("?");

  return {
    pathname: queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex),
    suffix: queryIndex === -1 ? hash : `${beforeHash.slice(queryIndex)}${hash}`
  };
}

function requireLocale(value: string) {
  const locale = String(value || "").trim();

  if (!locale) {
    throw new TypeError("VeloDom locale formatters need a locale");
  }

  try {
    Intl.getCanonicalLocales(locale);
  } catch {
    throw new RangeError(`Invalid VeloDom locale "${locale}"`);
  }

  return locale;
}

function normalizeDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("VeloDom date formatters need a valid date value");
  }

  return date;
}

function requireFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`VeloDom ${label} must be a finite number`);
  }

  return value;
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
