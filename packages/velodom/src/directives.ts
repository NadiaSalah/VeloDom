/**
 * ----------------------------------------
 * Module: Directive Runtime Registry
 * ----------------------------------------
 *
 * Loads manifest-selected directive feature chunks, caches their applicators,
 * and coordinates reactive updates after initial preparation.
 * ----------------------------------------
 */

import {
  VD_COMPILER_FEATURES,
  VD_DIRECTIVE_RUNTIME_FEATURES
} from "./constants.ts";
import type {
  DirectiveCleanup,
  DirectiveFeature,
  DirectiveRoot,
  DirectiveRuntimeContext,
  DirectiveRuntimeOptions,
  DirectiveState
} from "./directives/runtime.ts";

const featureCache = new Map<string, DirectiveFeature>();

/**
 * Prepares and applies the directive features required by one DOM subtree.
 *
 * Architecture note: initial setup is asynchronous for code splitting.
 * Ordinary bindings update synchronously; directives that discover lazy
 * resources may return explicit setup work for the owner to await.
 */
export async function applyDirectives(
  root: DirectiveRoot = document,
  state: DirectiveState,
  options: DirectiveRuntimeOptions = {}
): Promise<DirectiveCleanup> {
  const featureNames = selectDirectiveFeatures(options.features);
  const features = await Promise.all(
    featureNames.map(loadDirectiveFeature)
  );

  return applyLoadedDirectives(
    root,
    state,
    options,
    features
  );
}

/** Applies the loaded directives. */
function applyLoadedDirectives(
  root: DirectiveRoot,
  state: DirectiveState,
  options: DirectiveRuntimeOptions,
  features: DirectiveFeature[]
): DirectiveCleanup | Promise<DirectiveCleanup> {
  const cleanups: DirectiveCleanup[] = [];
  const context: DirectiveRuntimeContext = {
    props: options.props ?? {},
    root: options.el ?? root,
    page: options.page ?? "",
    getPageState: options.getPageState ?? null,
    hasPage: options.hasPage ?? null,
    navigate: options.navigate ?? null
  };
  const applyNested = (
    nestedRoot: DirectiveRoot,
    nestedState: DirectiveState,
    nestedOptions: DirectiveRuntimeOptions = {}
  ) => applyLoadedDirectives(
    nestedRoot,
    nestedState,
    {
      ...options,
      ...nestedOptions,
      features: options.features
    },
    features
  );

  const pending = features.map(feature => feature({
      root,
      state,
      cleanups,
      context,
      mountComponents: options.mountComponents ?? null,
      applyNested
    }))
    .filter(isPromiseLike);

  const cleanup = () => {
    cleanups.forEach(cleanup => cleanup());
  };

  return pending.length > 0
    ? Promise.all(pending).then(() => cleanup)
    : cleanup;
}

/** Returns whether a directive feature scheduled asynchronous setup work. */
function isPromiseLike(value: unknown): value is Promise<void> {
  return Boolean(
    value
    && typeof (value as Promise<void>).then === "function"
  );
}

/** Selects the directive features. */
function selectDirectiveFeatures(features?: string[]) {
  if (!features) {
    return [...VD_DIRECTIVE_RUNTIME_FEATURES];
  }

  const selected = new Set(features);

  return VD_DIRECTIVE_RUNTIME_FEATURES.filter(feature => (
    selected.has(feature)
  ));
}

/** Loads the directive feature. */
async function loadDirectiveFeature(
  feature: string
): Promise<DirectiveFeature> {
  const cached = featureCache.get(feature);

  if (cached) return cached;

  const loaded = await importDirectiveFeature(feature);

  featureCache.set(feature, loaded);
  return loaded;
}

/** Imports the directive feature. */
async function importDirectiveFeature(
  feature: string
): Promise<DirectiveFeature> {
  switch (feature) {
    case VD_COMPILER_FEATURES.CONDITIONALS:
      return (await import(
        "./directives/features/conditionals.ts"
      )).applyConditionals;
    case VD_COMPILER_FEATURES.TEXT:
      return (await import(
        "./directives/features/text.ts"
      )).applyText;
    case VD_COMPILER_FEATURES.VISIBILITY:
      return (await import(
        "./directives/features/visibility.ts"
      )).applyVisibility;
    case VD_COMPILER_FEATURES.BINDINGS:
      return (await import(
        "./directives/features/bindings.ts"
      )).applyBindings;
    case VD_COMPILER_FEATURES.MODEL:
      return (await import(
        "./directives/features/model.ts"
      )).applyModel;
    case VD_COMPILER_FEATURES.EVENTS:
      return (await import(
        "./directives/features/events.ts"
      )).applyEvents;
    case VD_COMPILER_FEATURES.REQUESTS:
      return (await import(
        "./directives/features/requests.ts"
      )).applyRequestDirectives;
    case VD_COMPILER_FEATURES.LOOPS:
      return (await import(
        "./directives/features/loops.ts"
      )).applyLoops;
    default:
      throw new TypeError(
        `Unsupported VeloDom directive runtime feature "${feature}"`
      );
  }
}
