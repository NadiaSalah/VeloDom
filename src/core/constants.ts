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
  AUTO_STATE: "data-vd-auto-state",
  PARAMS: "data-vd-params",
  TARGET: "data-vd-target",
  STATE: "data-vd-state",
  LOADING: "data-vd-loading",
  ERROR: "data-vd-error",
  COMPONENT_TAG_SELECTOR: "vd-component[name], component[name]",
  SLOT_TAG_SELECTOR: "vd-child, child, chiled",

  selector(name: string) {
    return `[${name}]`;
  }
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

/** Names and app properties used by the optional shared-state plugin. */
export const VD_SHARED_STATE = Object.freeze({
  APP_PROPERTY: "shared",
  DEFAULT_NAME: "default"
});

/** Defaults used by optional cache, retry, and devtools helpers. */
export const VD_OPTIONAL_TOOLS = Object.freeze({
  DEFAULT_CACHE_TTL_MS: 0,
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
    PAGES: "pages"
  }),
  TYPES: Object.freeze({
    CONFIGS: "configs",
    HTML: "html",
    MANIFESTS: "manifests",
    MODULES: "modules",
    STYLES: "styles"
  }),
  ROOTS: Object.freeze({
    COMPONENTS: "src/components",
    PAGES: "src/pages"
  }),
  FILES: Object.freeze({
    CONFIG: "config.js",
    HTML: "index.html",
    MODULE: "script.js",
    STYLE: "style.css"
  })
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

/** Request event names, stages, and public error codes. */
export const VD_REQUEST = Object.freeze({
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

/** Compile-result fields that optimizer extensions may replace. */
export const VD_COMPILER_OPTIMIZER_RESULT_KEYS = Object.freeze([
  "html",
  "ast",
  "metadata",
  "diagnostics"
]);

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
