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
import { VD_LOCALIZATION } from "./constants.ts";

/** Primitive values accepted by named localization placeholders. */
export type LocaleInterpolationValue = string | number | boolean;

/** Explicit plural message selected through the platform `Intl.PluralRules`. */
export interface LocalePluralMessage {
  $plural: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
}

/** A nested message dictionary whose leaves are strings or explicit plurals. */
export type LocaleDictionary = {
  [key: string]: string | LocalePluralMessage | LocaleDictionary;
};

/** Dot-separated leaf keys inferred from one application message dictionary. */
export type LocaleMessageKey<T extends LocaleDictionary> = {
  [Key in Extract<keyof T, string>]: T[Key] extends string | LocalePluralMessage
    ? Key
    : T[Key] extends LocaleDictionary
      ? `${Key}.${LocaleMessageKey<T[Key]>}`
      : never;
}[Extract<keyof T, string>];

/** One application-owned locale definition. */
export interface LocaleDefinition {
  /** Explicit document direction; validated against the locale language. */
  direction?: "ltr" | "rtl";
  /** Language tag written into generated static SEO documents. */
  lang?: string;
  /** Typed application messages for this locale. */
  messages: LocaleDictionary;
}

interface NormalizedLocaleDefinition {
  direction: "ltr" | "rtl";
  lang: string;
  messages: LocaleDictionary;
}

interface NormalizedLocalizationOptions {
  defaultLocale: string;
  locales: Record<string, NormalizedLocaleDefinition>;
  prefixDefaultLocale: boolean;
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
  code: string;
  kind: "direction" | "extra" | "missing" | "unknown" | "unused";
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
  t(key: TKey, params?: Record<string, LocaleInterpolationValue>): string;
  /** Selects and interpolates a plural message with `Intl.PluralRules`. */
  plural(
    key: TKey,
    count: number,
    params?: Record<string, LocaleInterpolationValue>
  ): string;
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
  readonly keys: readonly TKey[];
  /** Resolves one string message for a named locale. */
  t(
    locale: TLocale,
    key: TKey,
    params?: Record<string, LocaleInterpolationValue>
  ): string;
  /** Selects one explicit plural form through the locale's native plural rules. */
  plural(
    locale: TLocale,
    key: TKey,
    count: number,
    params?: Record<string, LocaleInterpolationValue>
  ): string;
  /** Returns the statically normalized writing direction for one locale. */
  direction(locale: TLocale): "ltr" | "rtl";
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

/** One editor-friendly completion derived from an application dictionary. */
export interface LocaleKeyCompletion {
  detail: string;
  kind: "message" | "plural";
  label: string;
}

/** Preserves inferred dictionary keys while documenting an application dictionary. */
export function defineLocaleDictionary<T extends LocaleDictionary>(dictionary: T): T {
  validateDictionary(dictionary, "dictionary");
  return dictionary;
}

/** Defines an explicit plural leaf while preserving its inferred categories. */
export function definePluralMessage<
  const TForms extends Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }
>(forms: TForms): LocalePluralMessage & { $plural: TForms } {
  validatePluralForms(forms, "plural message");
  return { $plural: forms };
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
  const defaultDefinition = normalized.locales[normalized.defaultLocale];
  const keys = [...flattenDictionary(defaultDefinition?.messages || {}).keys()]
    .sort((left, right) => left.localeCompare(right)) as LocaleMessageKey<
      TLocales[TDefaultLocale]["messages"]
    >[];

  return {
    defaultLocale: normalized.defaultLocale,
    locales,
    diagnostics,
    keys,
    t(locale, key, params) {
      return resolveMessage(normalized, locale, key, params);
    },
    plural(locale, key, count, params) {
      return resolvePluralMessage(normalized, locale, key, count, params);
    },
    direction(locale) {
      return requireLocaleDefinition(normalized, locale).direction;
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
export function inspectLocalization(
  options: LocalizationOptions,
  usedKeys?: readonly string[]
): LocalizationDiagnostic[] {
  const normalized = normalizeOptions(options);

  return inspectLocaleDictionaries(normalized, usedKeys);
}

/** Produces editor completion records from one application-owned dictionary. */
export function getLocaleKeyCompletions(
  dictionary: LocaleDictionary
): LocaleKeyCompletion[] {
  validateDictionary(dictionary, "dictionary");

  return [...flattenDictionary(dictionary)]
    .map(([label, value]) => ({
      detail: isPluralMessage(value)
        ? "VeloDom plural localization key"
        : "VeloDom localization key",
      kind: isPluralMessage(value) ? "plural" as const : "message" as const,
      label
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

/** Extracts statically quoted localization keys from application source text. */
export function extractLocaleKeyUsage(sources: readonly string[]): string[] {
  const keys = new Set<string>();
  const receiverCall = /\b[A-Za-z_$][\w$]*\.(?:t|plural)\(\s*(?:[^,()]|\([^)]*\))+?,\s*(["'])([^"']+)\1/g;
  const directCall = /(?<!\.)\b(?:t|plural)\(\s*(["'])([^"']+)\1/g;

  for (const source of sources) {
    for (const match of String(source || "").matchAll(receiverCall)) {
      if (match[2]?.trim()) keys.add(match[2].trim());
    }
    for (const match of String(source || "").matchAll(directCall)) {
      if (match[2]?.trim()) keys.add(match[2].trim());
    }
  }

  return [...keys].sort((left, right) => left.localeCompare(right));
}

/** Normalizes the options. */
function normalizeOptions(options: LocalizationOptions): NormalizedLocalizationOptions {
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

  const normalizedLocales: Record<string, NormalizedLocaleDefinition> = {};

  for (const [rawLocale, definition] of Object.entries(locales)) {
    const locale = rawLocale.trim();

    if (!locale || !definition || typeof definition !== "object") {
      throw new TypeError("VeloDom locale definitions need a name and messages");
    }

    validateDictionary(definition.messages, `locale "${locale}" messages`);
    const lang = requireLocale(String(definition.lang || locale).trim() || locale);
    const direction = definition.direction || inferLocaleDirection(lang);

    if (direction !== "ltr" && direction !== "rtl") {
      throw new TypeError(
        `Locale "${locale}" direction must be "ltr" or "rtl"`
      );
    }
    normalizedLocales[locale] = {
      direction,
      lang,
      messages: definition.messages
    };
  }

  return {
    defaultLocale,
    locales: normalizedLocales,
    prefixDefaultLocale: options.prefixDefaultLocale === true
  };
}

/** Inspects the locale dictionaries. */
function inspectLocaleDictionaries(
  options: NormalizedLocalizationOptions,
  usedKeys?: readonly string[]
): LocalizationDiagnostic[] {
  const baselineDefinition = options.locales[options.defaultLocale];

  if (!baselineDefinition) {
    throw new TypeError(
      `VeloDom default locale "${options.defaultLocale}" is not defined`
    );
  }

  const baseline = flattenDictionary(baselineDefinition.messages);
  const diagnostics: LocalizationDiagnostic[] = [];

  for (const [locale, definition] of Object.entries(options.locales)) {
    const expectedDirection = inferLocaleDirection(definition.lang);

    if (definition.direction !== expectedDirection) {
      diagnostics.push({
        code: VD_LOCALIZATION.CODES.DIRECTION,
        kind: "direction",
        locale,
        key: "",
        severity: "error",
        message: `Locale "${locale}" uses ${definition.lang} but declares ${definition.direction}; expected ${expectedDirection}`
      });
    }
  }

  for (const [locale, definition] of Object.entries(options.locales)) {
    if (locale === options.defaultLocale) continue;

    const messages = flattenDictionary(definition.messages);

    for (const key of baseline.keys()) {
      if (!messages.has(key)) {
        diagnostics.push({
          code: VD_LOCALIZATION.CODES.MISSING_KEY,
          kind: "missing",
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
          code: VD_LOCALIZATION.CODES.EXTRA_KEY,
          kind: "extra",
          locale,
          key,
          severity: "warning",
          message: `Locale "${locale}" has extra message "${key}"`
        });
      }
    }
  }

  if (usedKeys !== undefined) {
    const used = new Set(usedKeys.map(key => String(key || "").trim()).filter(Boolean));

    for (const key of baseline.keys()) {
      if (!used.has(key)) {
        diagnostics.push({
          code: VD_LOCALIZATION.CODES.UNUSED_KEY,
          kind: "unused",
          locale: options.defaultLocale,
          key,
          severity: "warning",
          message: `Default locale message "${key}" has no statically quoted usage`
        });
      }
    }

    for (const key of used) {
      if (!baseline.has(key)) {
        diagnostics.push({
          code: VD_LOCALIZATION.CODES.UNKNOWN_KEY,
          kind: "unknown",
          locale: options.defaultLocale,
          key,
          severity: "error",
          message: `Localization key "${key}" is used but absent from the default locale`
        });
      }
    }
  }

  return diagnostics.sort((left, right) => (
    left.locale.localeCompare(right.locale)
    || left.key.localeCompare(right.key)
  ));
}

/** Resolves the message. */
function resolveMessage(
  options: NormalizedLocalizationOptions,
  locale: string,
  key: string,
  params: Record<string, LocaleInterpolationValue> = {}
) {
  const definition = requireLocaleDefinition(options, locale);

  const normalizedKey = String(key || "").trim();
  const value = flattenDictionary(definition.messages).get(normalizedKey);

  if (value === undefined) {
    throw new ReferenceError(
      `Locale "${locale}" does not define message "${normalizedKey || "<empty>"}"`
    );
  }

  if (isPluralMessage(value)) {
    throw new TypeError(
      `Locale message "${normalizedKey}" is plural; use plural(locale, key, count)`
    );
  }

  return interpolateMessage(value, params, normalizedKey);
}

/** Resolves an explicit plural form through the locale language's rules. */
function resolvePluralMessage(
  options: NormalizedLocalizationOptions,
  locale: string,
  key: string,
  count: number,
  params: Record<string, LocaleInterpolationValue> = {}
) {
  if (!Number.isFinite(count)) {
    throw new TypeError("VeloDom plural counts must be finite numbers");
  }

  const definition = requireLocaleDefinition(options, locale);
  const normalizedKey = String(key || "").trim();
  const value = flattenDictionary(definition.messages).get(normalizedKey);

  if (!isPluralMessage(value)) {
    throw new TypeError(`Locale message "${normalizedKey || "<empty>"}" is not plural`);
  }

  const category = new Intl.PluralRules(definition.lang).select(count);
  const template = value.$plural[category] ?? value.$plural.other;

  return interpolateMessage(template, { ...params, count }, normalizedKey);
}

/** Requires a locale definition shared by text, plural, and direction reads. */
function requireLocaleDefinition(
  options: NormalizedLocalizationOptions,
  locale: string
) {
  const normalized = String(locale || "").trim();
  const definition = options.locales[normalized];

  if (!definition) {
    throw new RangeError(`Unknown VeloDom locale "${locale || "<empty>"}"`);
  }
  return definition;
}

/** Localizes the path. */
function localizePath(
  options: NormalizedLocalizationOptions,
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

/** Switches the locale path. */
function switchLocalePath(
  options: NormalizedLocalizationOptions,
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

/** Creates the localized SEO entries. */
function createLocalizedSeoEntries(
  options: NormalizedLocalizationOptions,
  sources: readonly LocalizedSeoSource[]
) {
  return sources.flatMap(source => Object.entries(options.locales).map(([
    locale,
    definition
  ]) => {
    const context: LocalizedSeoContext = {
      locale,
      lang: definition.lang,
      t: (key, params) => resolveMessage(options, locale, key, params),
      plural: (key, count, params) => resolvePluralMessage(
        options,
        locale,
        key,
        count,
        params
      )
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

/** Splits the path suffix. */
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

/** Requires the locale. */
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

/** Normalizes the date. */
function normalizeDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("VeloDom date formatters need a valid date value");
  }

  return date;
}

/** Requires the finite number. */
function requireFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`VeloDom ${label} must be a finite number`);
  }

  return value;
}

/** Validates the dictionary. */
function validateDictionary(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`VeloDom ${label} must be a nested object`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (!key.trim()) {
      throw new TypeError(`VeloDom ${label} cannot contain an empty key`);
    }

    if (typeof child === "string") continue;
    if (isPluralMessage(child)) {
      validatePluralForms(child.$plural, `${label}.${key}`);
      continue;
    }
    validateDictionary(child, `${label}.${key}`);
  }
}

/** Validates one deliberately small plural-form record. */
function validatePluralForms(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`VeloDom ${label} must contain plural forms`);
  }

  const forms = value as Record<string, unknown>;

  if (typeof forms.other !== "string") {
    throw new TypeError(`VeloDom ${label} must define an "other" form`);
  }

  for (const [category, message] of Object.entries(forms)) {
    if (!VD_LOCALIZATION.PLURAL_CATEGORIES.includes(category as Intl.LDMLPluralRule)) {
      throw new TypeError(`Unknown VeloDom plural category "${category}"`);
    }
    if (typeof message !== "string") {
      throw new TypeError(`VeloDom plural form "${category}" must be a string`);
    }
  }
}

/** Recognizes the explicit plural wrapper without treating nested groups as plurals. */
function isPluralMessage(value: unknown): value is LocalePluralMessage {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.hasOwn(value, "$plural")
  );
}

/** Flattens the dictionary. */
function flattenDictionary(
  dictionary: LocaleDictionary,
  prefix = "",
  result = new Map<string, string | LocalePluralMessage>()
) {
  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string" || isPluralMessage(value)) {
      result.set(path, value);
    } else {
      flattenDictionary(value, path, result);
    }
  }

  return result;
}

/** Replaces named primitive placeholders and preserves doubled literal braces. */
function interpolateMessage(
  template: string,
  params: Record<string, LocaleInterpolationValue>,
  key: string
) {
  const openToken = "\u0000VD_OPEN_BRACE\u0000";
  const closeToken = "\u0000VD_CLOSE_BRACE\u0000";
  const protectedTemplate = template
    .replaceAll("{{", openToken)
    .replaceAll("}}", closeToken);
  const result = protectedTemplate.replace(
    /\{([A-Za-z_$][\w$]*)\}/g,
    (_match, name: string) => {
      if (!Object.hasOwn(params, name)) {
        throw new ReferenceError(
          `Locale message "${key}" requires interpolation value "${name}"`
        );
      }
      const value = params[name];

      if (!["string", "number", "boolean"].includes(typeof value)) {
        throw new TypeError(
          `Locale message "${key}" interpolation value "${name}" must be primitive`
        );
      }
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new TypeError(
          `Locale message "${key}" interpolation value "${name}" must be finite`
        );
      }
      return String(value);
    }
  );

  return result.replaceAll(openToken, "{").replaceAll(closeToken, "}");
}

/** Infers the HTML writing direction from the canonical language subtag. */
function inferLocaleDirection(lang: string): "ltr" | "rtl" {
  const language = String(lang || "")
    .trim()
    .split(/[-_]/, 1)[0]
    ?.toLowerCase() || "";

  return (VD_LOCALIZATION.RTL_LANGUAGES as readonly string[]).includes(language)
    ? "rtl"
    : "ltr";
}

/** Formats the localization diagnostics. */
function formatLocalizationDiagnostics(diagnostics: LocalizationDiagnostic[]) {
  return [
    "VeloDom localization is incomplete:",
    ...diagnostics.map(diagnostic => `- ${diagnostic.message}`)
  ].join("\n");
}
