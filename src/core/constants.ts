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
  PARAMS: "data-vd-params",
  TARGET: "data-vd-target",
  STATE: "data-vd-state",
  LOADING: "data-vd-loading",
  ERROR: "data-vd-error",
  COMPONENT_TAG_SELECTOR: "vd-component[name], component[name]",
  SLOT_TAG_SELECTOR: "vd-child, child, chiled",

  selector(name) {
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
