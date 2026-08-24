/**
 * ----------------------------------------
 * Module: Module Hook Runner
 * ----------------------------------------
 *
 * Invokes modern object-context hooks and legacy positional hooks through one
 * compatibility boundary for pages and components.
 * ----------------------------------------
 */

import { VD_PROTECTED_STATE_KEYS } from "./constants.ts";
import { mergeState } from "./reactive.ts";
import { isPlainObject } from "./shared/object.ts";

/**
 * Merges an optional `export const state` module seed before lifecycle hooks.
 *
 * A plain object keeps small pages and components declarative while preserving
 * `init()` for lifecycle work and asynchronous setup. Internal reactive keys
 * remain protected just as they are for component exposes and expressions.
 */
export function mergeModuleStateSeed(
  state: Record<string, unknown>,
  module: unknown,
  label: "page" | "component"
) {
  const seed = module && typeof module === "object"
    ? (module as Record<string, unknown>).state
    : undefined;

  if (seed === undefined) return state;

  if (!isPlainObject(seed)) {
    throw new TypeError(
      `VeloDom ${label} state export must be a plain object`
    );
  }

  Object.keys(seed).forEach(name => {
    if (VD_PROTECTED_STATE_KEYS.includes(name)) {
      throw new TypeError(
        `VeloDom ${label} state export cannot replace protected state "${name}"`
      );
    }
  });

  return mergeState(state, seed);
}

/** Runs a page or component initialization hook. */
export async function runModuleInit(init, args) {
  return runModuleHook(init, args);
}

/** Runs any optional module lifecycle hook using its declared signature. */
export async function runModuleHook(hook, args) {
  if (typeof hook !== "function") {
    return undefined;
  }

  if (prefersObjectArgument(hook)) {
    return hook(args);
  }

  return hook(
    args.el,
    args.props,
    args.refs,
    args.state,
    args.ctx
  );
}

function prefersObjectArgument(hook) {
  const source = Function.prototype.toString.call(hook).trim();

  return (
    /^[^(]*\(\s*\{/.test(source)
    || /^\(\s*\{/.test(source)
    || /^[^(]*\(\s*[_$A-Za-z][\w$]*\s*=\s*\{/.test(source)
  );
}
