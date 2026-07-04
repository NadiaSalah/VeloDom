export async function runModuleInit(init, args) {
  return runModuleHook(init, args);
}

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
