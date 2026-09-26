/**
 * ----------------------------------------
 * Module: Framework Constants
 * ----------------------------------------
 *
 * Centralizes immutable directive names, protected keys, request stages,
 * compiler features, and internal runtime identifiers used across VeloDom.
 * ----------------------------------------
 */

/** Normalized runtime directive and custom-element names. */
export const VD = Object.freeze({
  REF: "data-vd-ref",
  SCOPE: "data-vd-scope",
  HOSTLESS: "data-vd-hostless",
  IF: "data-vd-if",
  SHOW: "data-vd-show",
  ELSEIF: "data-vd-elseif",
  ELSE: "data-vd-else",
  FOR: "data-vd-for",
  MODEL: "data-vd-model",
  TEXT: "data-vd-text",
  PRE: "data-vd-pre",
  SRC: "data-vd-src",
  HREF: "data-vd-href",
  STYLE: "data-vd-style",
  CLASS: "data-vd-class",
  ALT: "data-vd-alt",
  DISABLED: "data-vd-disabled",
  CHECKED: "data-vd-checked",
  VALUE: "data-vd-value",
  ATTR: "data-vd-attr",
  PATH: "data-vd-path",
  NAV: "data-vd-nav",
  PREFETCH: "data-vd-prefetch",
  VALIDATE: "data-vd-validate",
  FORM: "data-vd-form",
  FORM_STATUS: "data-vd-form-status",
  FORM_ERROR: "data-vd-form-error",
  CHILD: "data-vd-child",
  GET_CHILD: "data-vd-get-child",
  ON: "data-vd-on",
  PROP: "data-vd-prop-",
  PROPS: "data-vd-props",
  COMPONENT: "data-vd-component",
  KEY: "data-vd-key",
  REQUEST: "data-vd-request",
  REQUEST_CONFIG: "data-vd-request-config",
  REQUEST_STATE: "data-vd-request-state",
  DEBOUNCE: "data-vd-debounce",
  THROTTLE: "data-vd-throttle",
  AUTO_STATE: "data-vd-auto-state",
  PARAMS: "data-vd-params",
  TARGET: "data-vd-target",
  STATE: "data-vd-state",
  LOADING: "data-vd-loading",
  ERROR: "data-vd-error",
  RTL_FLIP: "data-vd-rtl-flip",
  COMPONENT_TAG_SELECTOR: "vd-component[name], component[name]",
  SLOT_TAG_SELECTOR: "vd-child, child, chiled",

  selector(name: string) {
    return `[${name}]`;
  }
});

/** Public resource-adapter contract version and supported capabilities. */
export const VD_ADAPTER = Object.freeze({
  VERSION: 1,
  CAPABILITIES: Object.freeze([
    "resource-discovery",
    "page-config",
    "page-data",
    "layouts",
    "compiler-manifests"
  ])
});

/** Build-intelligence artifact names and schema versions. */
export const VD_BUILD = Object.freeze({
  METADATA_FILE: "velodom-build-meta.json",
  METADATA_VERSION: 1
});

/** Idempotent optional-feature installer manifest contract. */
export const VD_FEATURE_INSTALLER = Object.freeze({
  FEATURES: Object.freeze(["i18n", "lab", "pwa", "tests"]),
  MANIFEST_FILE: ".velodom/features.json",
  MANIFEST_VERSION: 1
});

/** Build and browser markers used by optional page-data transfer. */
export const VD_PAGE_DATA = Object.freeze({
  ATTRIBUTE: "data-vd-page-data",
  PAGE_ATTRIBUTE: "data-vd-page-data-page",
  ROUTE_ATTRIBUTE: "data-vd-page-data-route",
  SCRIPT_SELECTOR: "script[data-vd-page-data]",
  STATE_KEY: "data",
  CACHE_KEY_PREFIX: "page-data:",
  MODES: Object.freeze({
    BUILD: "build",
    CLIENT: "client",
    SERVER: "server"
  })
});

/** Names used only by opt-in development inspection helpers. */
export const VD_DEVTOOLS = Object.freeze({
  GLOBAL_NAME: "__VELODOM_DEVTOOLS__",
  INSPECTOR_ATTRIBUTE: "data-velodom-inspector",
  INSPECTOR_TITLE: "VeloDom inspector",
  REFRESH_LABEL: "Refresh"
});

/** Authentication provider names, defaults, aliases, and valid credentials. */
export const VD_AUTH = Object.freeze({
  STORAGE_KEY: "vd-user-session",
  SESSION_URL: "/api/auth/session",
  DEFAULT_CREDENTIALS: "include",
  MODES: Object.freeze({
    NONE: "none",
    SERVER: "server",
    LOCAL_STORAGE: "localStorage"
  }),
  PROVIDERS: Object.freeze({
    SERVER: "server",
    DEMO: "demo"
  }),
  SERVER_ALIASES: Object.freeze([
    "server",
    "cookie"
  ]),
  LOCAL_STORAGE_ALIASES: Object.freeze([
    "localStorage",
    "demo"
  ]),
  CREDENTIALS: Object.freeze([
    "omit",
    "same-origin",
    "include"
  ])
});

/** Middleware execution modes and their internal marker. */
export const VD_MIDDLEWARE = Object.freeze({
  MODE: Symbol("vdMiddlewareMode"),
  MODES: Object.freeze({
    TRANSFORM: "transform",
    PIPELINE: "pipeline"
  })
});

/** Private runtime keys and sentinel values. */
export const VD_INTERNAL = Object.freeze({
  ABORT_ERROR_NAME: "AbortError",
  REQUEST_ABORT_MESSAGE: "Request aborted",
  CLEANUP_KEY: "__vdCleanup",
  REQUEST_ABORT: Symbol("VD_REQUEST_ABORT"),
  PAGE_NOT_FOUND_CODE: "VD_PAGE_NOT_FOUND"
});

/** Router-owned browser history and hash navigation values. */
export const VD_ROUTER = Object.freeze({
  CONTENTEDITABLE_ATTRIBUTE: "contenteditable",
  DISABLED_ATTRIBUTE: "disabled",
  FOCUSABLE_CONTROL_TAGS: Object.freeze([
    "button",
    "input",
    "select",
    "textarea"
  ]),
  FOCUSABLE_LINK_TAGS: Object.freeze([
    "a",
    "area"
  ]),
  FOCUS_TARGET_SELECTORS: Object.freeze([
    "[data-vd-focus]",
    "h1",
    "[role=\"main\"]",
    "main",
    "#app"
  ]),
  HISTORY_AUTO: "auto",
  HISTORY_MANUAL: "manual",
  HISTORY_POP: "pop",
  HISTORY_PUSH: "push",
  HISTORY_REPLACE: "replace",
  HASHCHANGE_EVENT: "hashchange",
  HREF_ATTRIBUTE: "href",
  MANAGED_FOCUS_ATTRIBUTE: "data-vd-focus-managed",
  POPSTATE_EVENT: "popstate",
  PREFETCH_EVENTS: Object.freeze([
    "mouseover",
    "focusin",
    "touchstart"
  ]),
  PREFETCH_SELECTOR: `${VD.selector(VD.NAV)}${VD.selector(VD.PREFETCH)}`,
  PROGRAMMATIC_TABINDEX: "-1",
  SCROLL_TOP: 0,
  SUMMARY_TAG: "summary",
  TABINDEX_ATTRIBUTE: "tabindex",
  TRUE_VALUE: "true"
});

/** Attributes and browser events owned by the optional validation plugin. */
export const VD_VALIDATION = Object.freeze({
  FIELD_INVALID_ATTRIBUTE: "data-vd-field-invalid",
  FORM_SELECTOR: `form${VD.selector(VD.VALIDATE)}`,
  INVALID_ATTRIBUTE: "data-vd-invalid",
  INPUT_EVENT: "input",
  SUBMIT_EVENT: "submit"
});

/** Attributes and event names for optional progressive native forms. */
export const VD_FORMS = Object.freeze({
  ERROR_ATTRIBUTE: "data-vd-form-error",
  ERROR_FIELD_ATTRIBUTE: "data-vd-form-field-error",
  ERROR_EVENT: "vd:form-error",
  FORM_SELECTOR: `form${VD.selector(VD.FORM)}`,
  LOADING_ATTRIBUTE: "data-vd-form-loading",
  STATE_ATTRIBUTE: "data-vd-form-state",
  STATUS_SELECTOR: VD.selector(VD.FORM_STATUS),
  SUBMIT_EVENT: "submit",
  SUCCESS_EVENT: "vd:form-success"
});

/** Names and app properties used by the optional shared-state plugin. */
export const VD_SHARED_STATE = Object.freeze({
  APP_PROPERTY: "shared",
  DEFAULT_NAME: "default"
});

/** Defaults used by optional cache, retry, and devtools helpers. */
export const VD_OPTIONAL_TOOLS = Object.freeze({
  DEFAULT_CACHE_TTL_MS: 0,
  DEFAULT_CACHE_MAX_ENTRIES: 100,
  DEFAULT_DEVTOOLS_GLOBAL: "__VELODOM_DEVTOOLS__",
  DEFAULT_RETRIES: 1,
  DEFAULT_RETRY_DELAY_MS: 0,
  GET_METHOD: "GET"
});

/** Source labels and filenames used by generic resource-adapter diagnostics. */
export const VD_RESOURCE_ADAPTER = Object.freeze({
  CODE: "VD_INVALID_ADAPTER",
  STAGE: "adapter",
  CREATE_APP_FILE: "createApp({ adapter })",
  EMPTY_NAME: "<empty>",
  UNKNOWN_FOLDER: "<unknown>",
  GROUPS: Object.freeze({
    COMPONENTS: "components",
    LAYOUTS: "layouts",
    PAGES: "pages"
  }),
  TYPES: Object.freeze({
    CONFIGS: "configs",
    DATA: "data",
    HTML: "html",
    MANIFESTS: "manifests",
    MODULES: "modules",
    STYLES: "styles"
  }),
  ROOTS: Object.freeze({
    COMPONENTS: "src/components",
    LAYOUTS: "src/layouts",
    PAGES: "src/pages"
  }),
  FILES: Object.freeze({
    CONFIG: "config.js",
    CONFIG_VARIANTS: Object.freeze([
      "config.ts",
      "config.js",
      "page.config.ts",
      "page.config.js"
    ]),
    DATA: "data.js",
    DATA_VARIANTS: Object.freeze([
      "data.ts",
      "data.js"
    ]),
    HTML: "index.html",
    MODULE: "script.js",
    STYLE: "style.css"
  })
});

/** Layout placeholder tags used when wrapping page templates. */
export const VD_LAYOUT = Object.freeze({
  DEFAULT: "default",
  PAGE_TAG_SELECTOR: "vd-page"
});

/** Attributes and element values owned by the SEO runtime and static renderer. */
export const VD_SEO = Object.freeze({
  DEFAULT_LANG_ATTRIBUTE: "data-vd-default-lang",
  DEFAULT_TITLE_ATTRIBUTE: "data-vd-default-title",
  FALLBACK_ATTRIBUTE: "data-vd-seo-fallback",
  MANAGED_ATTRIBUTE: "data-vd-seo",
  JSON_LD_TYPE: "application/ld+json",
  STATIC_CONTENT_ATTRIBUTE: "data-vd-static-content",
  STATIC_HYDRATION_ATTRIBUTE: "data-vd-static-hydration"
});

/** Tags and virtual query names used by optional VeloDom single-file modules. */
export const VD_SINGLE_FILE = Object.freeze({
  EXTENSION: ".vd",
  STYLE_FILENAME: "style.css",
  TAGS: Object.freeze({
    CONFIG: "config",
    SCRIPT: "script",
    STYLE: "style",
    TEMPLATE: "template"
  }),
  QUERIES: Object.freeze({
    CONFIG: "vd-config",
    SCRIPT: "vd-script",
    STYLE: "vd-style",
    TEMPLATE: "vd-template"
  })
});

/** Attributes owned by recoverable error-boundary fallback rendering. */
export const VD_ERROR_BOUNDARY = Object.freeze({
  ATTRIBUTE: "data-vd-error-boundary"
});

/** Stable runtime diagnostic identities and opt-in overlay limits. */
export const VD_ERROR = Object.freeze({
  DEFAULT_CODE: "VD_RUNTIME_ERROR",
  DEFAULT_GROUP: "runtime",
  MAX_SOURCE_FRAMES: 8,
  OVERLAY_ATTRIBUTE: "data-vd-error-overlay",
  OVERLAY_LIMIT: 50,
  GROUPS: Object.freeze([
    "compiler",
    "router",
    "request",
    "component",
    "runtime"
  ]),
  CODES: Object.freeze({
    BOUNDARY_CRASH: "VD_RUNTIME_BOUNDARY_CRASH",
    COMPONENT_CRASH: "VD_COMPONENT_CRASH",
    COMPONENT_RECURSION: "VD_COMPONENT_RECURSION",
    EXPRESSION: "VD_RUNTIME_EXPRESSION",
    NAVIGATION_CRASH: "VD_ROUTER_NAVIGATION_CRASH",
    NAVIGATION_PATH: "VD_ROUTER_NAVIGATION_PATH",
    REQUEST_CONFIG: "VD_REQUEST_CONFIG",
    REQUEST_FAILED: "VD_REQUEST_FAILED",
    RUNTIME: "VD_RUNTIME_ERROR"
  })
});

/** Stable optional plugin-manifest vocabulary for the V1 package contract. */
export const VD_PLUGIN = Object.freeze({
  FRAMEWORK_VERSION: "1.0.0",
  CAPABILITIES: Object.freeze(["browser", "build", "node"]),
  CODES: Object.freeze({
    CAPABILITY: "VD_PLUGIN_CAPABILITY",
    COMPATIBILITY: "VD_PLUGIN_COMPATIBILITY",
    CONFLICT: "VD_PLUGIN_CONFLICT",
    DUPLICATE: "VD_PLUGIN_DUPLICATE",
    MANIFEST: "VD_PLUGIN_MANIFEST",
    SHAPE: "VD_PLUGIN_SHAPE"
  })
});

/** Request event names, stages, and public error codes. */
export const VD_REQUEST = Object.freeze({
  DEBOUNCE_KEYS: Object.freeze([
    "debounceMs",
    "debounce"
  ]),
  THROTTLE_KEYS: Object.freeze([
    "throttleMs",
    "throttle"
  ]),
  RETRY_KEYS: Object.freeze([
    "retries",
    "retry"
  ]),
  RETRY_DELAY_KEYS: Object.freeze([
    "retryDelayMs",
    "delayMs"
  ]),
  AUTH_REDIRECT_KEYS: Object.freeze([
    "authRedirect",
    "redirectOnAuthFailure"
  ]),
  STATUS_SUFFIXES: Object.freeze({
    RESULT: "Result",
    LOADING: "Loading",
    ERROR: "Error"
  }),
  EVENTS: Object.freeze({
    SUCCESS: "vd:request:success",
    ERROR: "vd:request:error"
  }),
  STAGES: Object.freeze({
    AUTH: "auth",
    MIDDLEWARE: "middleware",
    REQUEST: "request",
    CONFIG: "config"
  }),
  CODES: Object.freeze({
    INVALID_CONFIG: "invalid-request-config"
  })
});

/** Locale and direction values used by the optional direction plugin. */
export const VD_DIRECTION = Object.freeze({
  DEFAULT_LOCALE: "en",
  DEFAULT_LANG: "en",
  DEFAULT_DIRECTION: "ltr",
  RTL_FLIP_SELECTOR: `[${VD.RTL_FLIP}]`,
  RTL_ROOT_SELECTOR: "html[dir=\"rtl\"]",
  STATE_KEY: "$direction",
  TRANSFORM_VARIABLE: "--vd-icon-transform",
  DIRECTIONS: Object.freeze([
    "ltr",
    "rtl",
    "auto"
  ])
});

/** Static localization diagnostics, plural categories, and script directions. */
export const VD_LOCALIZATION = Object.freeze({
  CODES: Object.freeze({
    DIRECTION: "VD_I18N_DIRECTION",
    EXTRA_KEY: "VD_I18N_EXTRA_KEY",
    MISSING_KEY: "VD_I18N_MISSING_KEY",
    UNKNOWN_KEY: "VD_I18N_UNKNOWN_KEY",
    UNUSED_KEY: "VD_I18N_UNUSED_KEY"
  }),
  PLURAL_CATEGORIES: Object.freeze([
    "zero",
    "one",
    "two",
    "few",
    "many",
    "other"
  ]),
  RTL_LANGUAGES: Object.freeze([
    "ar",
    "ckb",
    "dv",
    "fa",
    "he",
    "ku",
    "ps",
    "sd",
    "ug",
    "ur",
    "yi"
  ])
});

/** CSS diagnostics that guide applications toward RTL-safe logical properties. */
export const VD_RTL_CSS = Object.freeze({
  CODE: "VD_RTL_PHYSICAL_CSS",
  PHYSICAL_PROPERTY_ALTERNATIVES: Object.freeze({
    left: "inset-inline-start",
    right: "inset-inline-end",
    "margin-left": "margin-inline-start",
    "margin-right": "margin-inline-end",
    "padding-left": "padding-inline-start",
    "padding-right": "padding-inline-end",
    "border-left": "border-inline-start",
    "border-right": "border-inline-end",
    "border-left-color": "border-inline-start-color",
    "border-right-color": "border-inline-end-color",
    "border-left-style": "border-inline-start-style",
    "border-right-style": "border-inline-end-style",
    "border-left-width": "border-inline-start-width",
    "border-right-width": "border-inline-end-width"
  }),
  TEXT_ALIGN_VALUES: Object.freeze({
    left: "start",
    right: "end"
  })
});

/** Build-only thresholds and stable codes for CSS and asset intelligence. */
export const VD_CSS_ASSET_INTELLIGENCE = Object.freeze({
  ASSET_EXTENSIONS: Object.freeze([
    ".avif",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".webp",
    ".woff",
    ".woff2"
  ]),
  IMAGE_EXTENSIONS: Object.freeze([
    ".avif",
    ".gif",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".webp"
  ]),
  MAX_ASSET_BYTES: 250 * 1024,
  LARGE_IMAGE_WIDTH: 1200,
  LCP_CANDIDATE_BYTES: 100 * 1024,
  CODES: Object.freeze({
    DUPLICATE_ASSET: "VD_ASSET_DUPLICATE",
    LARGE_ASSET: "VD_ASSET_OVERSIZED",
    LCP_HINT: "VD_ASSET_LCP_HINT",
    MISSING_DIMENSIONS: "VD_ASSET_DIMENSIONS",
    RESPONSIVE_VARIANTS: "VD_ASSET_RESPONSIVE",
    UNUSED_ASSET: "VD_ASSET_UNUSED",
    DUPLICATE_CSS: "VD_CSS_DUPLICATE_RULE",
    UNUSED_SELECTOR: "VD_CSS_POSSIBLY_UNUSED_SELECTOR"
  })
});

/** Stable names, defaults, and diagnostics for the opt-in PWA build plugin. */
export const VD_PWA = Object.freeze({
  CACHE_PREFIX: "velodom-pwa",
  MANIFEST_FILE: "manifest.webmanifest",
  OFFLINE_FILE: "offline.html",
  REGISTRATION_FILE: "velodom-pwa-register.js",
  SERVICE_WORKER_FILE: "velodom-sw.js",
  DEFAULT_STRATEGIES: Object.freeze([
    Object.freeze({
      cacheName: "pages",
      match: "navigation",
      strategy: "network-only"
    }),
    Object.freeze({
      cacheName: "assets",
      match: "same-origin-assets",
      strategy: "stale-while-revalidate"
    })
  ]),
  DISPLAY_MODES: Object.freeze([
    "browser",
    "fullscreen",
    "minimal-ui",
    "standalone",
    "window-controls-overlay"
  ]),
  MATCHERS: Object.freeze([
    "navigation",
    "same-origin",
    "same-origin-assets",
    "path-prefix"
  ]),
  STRATEGIES: Object.freeze([
    "cache-first",
    "cache-only",
    "network-first",
    "network-only",
    "stale-while-revalidate"
  ]),
  CODES: Object.freeze({
    ICONS: "VD_PWA_ICONS",
    ICON_SIZE: "VD_PWA_ICON_SIZE",
    MANIFEST: "VD_PWA_MANIFEST",
    NAME: "VD_PWA_NAME",
    PATH: "VD_PWA_PATH",
    SCOPE: "VD_PWA_SCOPE",
    START_URL: "VD_PWA_START_URL"
  })
});

/** HTML shell diagnostics used by build integrations. */
export const VD_HTML_SHELL = Object.freeze({
  UTF8_CODE: "VD_HTML_SHELL_UTF8",
  UTF8_PATTERN: "utf-8"
});

/** State keys that application bindings and expose APIs may not replace. */
export const VD_PROTECTED_STATE_KEYS = Object.freeze([
  "__proto__",
  "prototype",
  "constructor",
  "components",
  "emit",
  "on",
  "off",
  "once",
  "_subscribe",
  "_notify",
  "_dispose",
  "$allowExternalWrite",
  "$direction",
  "__vdPageName"
]);

/** Keyboard modifiers recognized by event directives. */
export const VD_EVENT_KEY_MODIFIERS = Object.freeze([
  "enter",
  "tab",
  "delete",
  "esc",
  "space",
  "up",
  "down",
  "left",
  "right"
]);

/** Identifiers and members blocked by the safe expression evaluator. */
export const VD_EXPRESSION = Object.freeze({
  BLOCKED_IDENTIFIERS: Object.freeze([
    "Function",
    "document",
    "eval",
    "globalThis",
    "window"
  ]),
  BLOCKED_MEMBERS: Object.freeze([
    "__proto__",
    "prototype",
    "constructor",
    "caller",
    "callee",
    "arguments",
    "apply",
    "bind",
    "call",
    "eval",
    "Function",
    "setInterval",
    "setTimeout",
    "importScripts"
  ])
});

/** Coarse compiler feature names used by runtime manifests. */
export const VD_COMPILER_FEATURES = Object.freeze({
  BINDINGS: "bindings",
  COMPONENTS: "components",
  CONDITIONALS: "conditionals",
  EVENTS: "events",
  LOOPS: "loops",
  MODEL: "model",
  NAVIGATION: "navigation",
  REFS: "refs",
  REQUESTS: "requests",
  RTL_FLIP: "rtl-flip",
  SLOTS: "slots",
  TEXT: "text",
  VISIBILITY: "visibility"
});

/** Static accessibility diagnostics emitted by the template compiler. */
export const VD_ACCESSIBILITY = Object.freeze({
  CODES: Object.freeze({
    ANCHOR_HREF: "VD_A11Y_ANCHOR_HREF",
    CONTROL_NAME: "VD_A11Y_CONTROL_NAME",
    HEADING_ORDER: "VD_A11Y_HEADING_ORDER",
    IMG_ALT: "VD_A11Y_IMG_ALT",
    IMG_DIMENSIONS: "VD_A11Y_IMG_DIMENSIONS",
    NON_SEMANTIC_CLICK: "VD_A11Y_NON_SEMANTIC_CLICK"
  }),
  FORM_CONTROL_TAGS: Object.freeze([
    "input",
    "select",
    "textarea"
  ]),
  HEADING_TAGS: Object.freeze([
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6"
  ]),
  INTERACTIVE_TAGS: Object.freeze([
    "a",
    "button",
    "details",
    "input",
    "select",
    "summary",
    "textarea"
  ]),
  KEYBOARD_EVENT_PREFIXES: Object.freeze([
    "data-vd-onkeydown",
    "data-vd-onkeyup",
    "vd-on:keydown",
    "vd-on:keyup"
  ]),
  PRESENTATIONAL_ROLES: Object.freeze([
    "none",
    "presentation"
  ])
});

/** Static security diagnostics emitted by the template compiler. */
export const VD_SECURITY = Object.freeze({
  CODES: Object.freeze({
    ENV_SECRET: "VD_SECURITY_ENV_SECRET",
    JAVASCRIPT_URL: "VD_SECURITY_JAVASCRIPT_URL",
    PASSWORD_GET: "VD_SECURITY_PASSWORD_GET",
    TARGET_NOOPENER: "VD_SECURITY_TARGET_NOOPENER"
  })
});

/** Compile-result fields that optimizer extensions may replace. */
export const VD_COMPILER_OPTIMIZER_RESULT_KEYS = Object.freeze([
  "html",
  "ast",
  "metadata",
  "diagnostics"
]);

/** Bounded build-time cache settings for Vite template compilation. */
export const VD_COMPILER_CACHE = Object.freeze({
  MAX_ENTRIES: 256
});

/** Manifest features implemented by lazy directive runtime modules. */
export const VD_DIRECTIVE_RUNTIME_FEATURES = Object.freeze([
  VD_COMPILER_FEATURES.CONDITIONALS,
  VD_COMPILER_FEATURES.TEXT,
  VD_COMPILER_FEATURES.VISIBILITY,
  VD_COMPILER_FEATURES.BINDINGS,
  VD_COMPILER_FEATURES.MODEL,
  VD_COMPILER_FEATURES.EVENTS,
  VD_COMPILER_FEATURES.REQUESTS,
  VD_COMPILER_FEATURES.LOOPS
]);
