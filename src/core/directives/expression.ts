import {
  VD,
  VD_PROTECTED_STATE_KEYS
} from "../constants.ts";
import { reportUserActionError } from "../errors/error-reporter.ts";
import { evaluateExpression } from "../expression/index.ts";
import { findProtectedStatePathKey } from "../shared/path.ts";

export function createScope(parent, locals) {
  return new Proxy(locals, {
    get(target, key) {
      if (key === "_subscribe") return parent._subscribe;
      if (key === "_notify") return parent._notify;
      if (key in target) return target[key];

      return parent[key];
    },

    set(target, key, value) {
      if (key in target) {
        target[key] = value;
        parent._notify();
        return true;
      }

      parent[key] = value;
      return true;
    },

    has(target, key) {
      return key in target || key in parent;
    }
  });
}

export function evaluate(
  expression,
  state,
  event = null,
  el = null,
  props = {},
  meta: any = {}
) {
  try {
    return evaluateExpression(expression, {
      state,
      event,
      props,
      el
    });
  } catch (error) {
    reportUserActionError(error, {
      title: "Expression Evaluation Error",
      directive: meta.directive || "expression",
      expression,
      file: "src/core/directives/expression.ts",
      el,
      hint: "Check expression syntax and make sure referenced variables exist."
    });

    return "";
  }
}

export function readValue(path, state) {
  const normalizedPath = resolvePathKeys(path, state);

  if (!normalizedPath) return undefined;

  return normalizedPath
    .split(".")
    .reduce((value, key) => value?.[key], state);
}

export function writeValue(path, state, value) {
  const protectedKey = findProtectedStatePathKey(path);

  if (protectedKey) {
    reportUserActionError(`Protected state key "${protectedKey}" cannot be written`, {
      title: "Protected State Path",
      directive: VD.MODEL,
      expression: String(path || ""),
      file: "src/core/directives/expression.ts",
      hint: "Use normal application state keys. Prototype and framework-owned keys are reserved."
    });

    return;
  }

  const normalizedPath = resolvePathKeys(path, state);

  if (!normalizedPath) {
    reportUserActionError("Empty state path", {
      title: "Invalid State Path",
      directive: VD.MODEL,
      expression: String(path || ""),
      file: "src/core/directives/expression.ts",
      level: "warn",
      hint: "Provide a valid target path like posts or home.posts."
    });

    return;
  }

  const keys = normalizedPath.split(".");

  if (keys.length === 1) {
    state[keys[0]] = value;
    return;
  }

  const last = keys.pop();
  const target = keys.reduce((current, key) => current?.[key], state);

  if (!target) {
    reportUserActionError("Model path target does not exist", {
      title: "Invalid Model Path",
      directive: VD.MODEL,
      expression: normalizedPath,
      file: "src/core/directives/expression.ts",
      level: "warn",
      hint: "Create the nested object before binding. Example: state.user = {}."
    });

    return;
  }

  target[last] = value;
  state._notify();
}

export function isIterable(value) {
  return Boolean(value && typeof value[Symbol.iterator] === "function");
}

function resolvePathKeys(path, state) {
  const cleaned = String(path || "")
    .trim()
    .replace(/\[(\w+)\]/g, ".$1")
    .replace(/^\.+|\.+$/g, "");

  if (!cleaned) return "";

  const parts = cleaned.split(".").filter(Boolean);

  if (parts.some(key => (
    VD_PROTECTED_STATE_KEYS.includes(key)
    || key.startsWith("__vd")
  ))) {
    return "";
  }

  if (parts.length <= 1) {
    return parts[0] || "";
  }

  if (parts[0] in state) {
    return parts.join(".");
  }

  return parts.slice(1).join(".");
}
