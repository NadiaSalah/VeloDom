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

export const VD_MIDDLEWARE = Object.freeze({
  MODE: Symbol("vdMiddlewareMode"),
  MODES: Object.freeze({
    TRANSFORM: "transform",
    PIPELINE: "pipeline"
  })
});

export const VD_INTERNAL = Object.freeze({
  CLEANUP_KEY: "__vdCleanup",
  REQUEST_ABORT: Symbol("VD_REQUEST_ABORT"),
  PAGE_NOT_FOUND_CODE: "VD_PAGE_NOT_FOUND"
});

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
