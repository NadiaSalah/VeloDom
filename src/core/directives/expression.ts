/**
 * ----------------------------------------
 * Module: Directive Expression Bridge
 * ----------------------------------------
 *
 * Connects directive state scopes and writable paths to the safe expression
 * engine, including structured runtime diagnostics and protected-key checks.
 * ----------------------------------------
 */

import {
  VD,
  VD_PROTECTED_STATE_KEYS
} from "../constants.ts";
import { reportUserActionError } from "../errors/error-reporter.ts";
import { evaluateExpression } from "../expression/index.ts";
import { findProtectedStatePathKey } from "../shared/path.ts";

type ExpressionState = Record<string, unknown> & {
  _subscribe(callback: () => void): () => void;
  _notify(): void;
};

interface ExpressionEvaluationMeta {
  directive?: string;
}

/** Creates a loop-local scope that inherits from parent reactive state. */
export function createScope(
  parent: ExpressionState,
  locals: Record<string, unknown>
): ExpressionState {
  return new Proxy(locals, {
    get(target, key) {
      if (key === "_subscribe") return parent._subscribe;
      if (key === "_notify") return parent._notify;
      if (key in target) return Reflect.get(target, key);

      return Reflect.get(parent, key);
    },

    set(target, key, value) {
      if (key in target) {
        Reflect.set(target, key, value);
        parent._notify();
        return true;
      }

      Reflect.set(parent, key, value);
      return true;
    },

    has(target, key) {
      return key in target || key in parent;
    }
  }) as ExpressionState;
}

/** Evaluates a directive expression and reports structured failures. */
export function evaluate(
  expression: string,
  state: ExpressionState,
  event: Event | null = null,
  el: Element | null = null,
  props: Record<string, unknown> = {},
  meta: ExpressionEvaluationMeta = {}
): unknown {
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

/** Reads a nested value from application state. */
export function readValue(
  path: unknown,
  state: ExpressionState
): unknown {
  const normalizedPath = resolvePathKeys(path, state);

  if (!normalizedPath) return undefined;

  return normalizedPath
    .split(".")
    .reduce<unknown>((value, key) => (
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[key]
        : undefined
    ), state);
}

/** Writes a nested state value after validating the path and target. */
export function writeValue(
  path: unknown,
  state: ExpressionState,
  value: unknown
) {
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

  (target as Record<string, unknown>)[last] = value;
  state._notify();
}

/** Returns whether a value can be consumed by vd-for. */
export function isIterable(value: unknown): value is Iterable<unknown> {
  const candidate = value as {
    [Symbol.iterator]?: unknown;
  } | null;

  return Boolean(
    candidate
    && typeof candidate[Symbol.iterator] === "function"
  );
}

function resolvePathKeys(
  path: unknown,
  state: ExpressionState
) {
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
