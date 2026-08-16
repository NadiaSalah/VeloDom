/**
 * ----------------------------------------
 * Module: Module Hook Runner
 * ----------------------------------------
 *
 * Invokes modern object-context hooks and legacy positional hooks through one
 * compatibility boundary for pages and components.
 * ----------------------------------------
 */

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
