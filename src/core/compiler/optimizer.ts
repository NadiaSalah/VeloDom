/**
 * ----------------------------------------
 * Module: Template Optimizer Pipeline
 * ----------------------------------------
 *
 * Validates and runs compiler optimizer extensions, then creates conservative
 * runtime feature manifests used for lazy directive feature loading.
 * ----------------------------------------
 */

import {
  VD_COMPILER_FEATURES,
  VD_COMPILER_OPTIMIZER_RESULT_KEYS
} from "../constants.ts";
import type {
  DirectiveMetadata,
  RuntimeFeatureManifest,
  TemplateCompileResult,
  TemplateOptimizer,
  TemplateOptimizerContext,
  TemplateOptimizerResult
} from "./types.ts";

/** Creates a validated named optimizer definition. */
export function defineTemplateOptimizer(
  name: string,
  optimize: TemplateOptimizer["optimize"]
): TemplateOptimizer {
  const normalizedName = String(name || "").trim();

  if (!normalizedName) {
    throw new TypeError("VeloDom template optimizer requires a name");
  }

  if (typeof optimize !== "function") {
    throw new TypeError(
      `VeloDom template optimizer "${normalizedName}" requires an optimize function`
    );
  }

  return Object.freeze({
    name: normalizedName,
    optimize
  });
}

/**
 * Runs optimizers in registration order.
 *
 * Architecture note: optimizers remain synchronous so standalone compilation
 * is deterministic across Node, Vite, tests, and future CLI integrations.
 */
export function runTemplateOptimizers(
  initialResult: Omit<TemplateCompileResult, "manifest">,
  context: Omit<TemplateOptimizerContext, "addRuntimeFeature">,
  optimizers: TemplateOptimizer[] = []
): TemplateCompileResult {
  if (!Array.isArray(optimizers)) {
    throw new TypeError("VeloDom compiler optimizers must be an array");
  }

  const additionalFeatures = new Set<string>();
  let current: TemplateCompileResult = {
    ...initialResult,
    manifest: createRuntimeFeatureManifest(
      initialResult.metadata,
      [],
      initialResult.ast
    )
  };

  optimizers.forEach((optimizer, index) => {
    validateOptimizer(optimizer, index);

    const optimizerContext: TemplateOptimizerContext = {
      ...context,
      addRuntimeFeature(feature) {
        const normalized = String(feature || "").trim();

        if (!normalized) {
          throw new TypeError(
            `VeloDom template optimizer "${optimizer.name}" added an empty runtime feature`
          );
        }

        additionalFeatures.add(normalized);
      }
    };
    let patch;

    try {
      patch = optimizer.optimize(current, optimizerContext);
    } catch (error) {
      throw new Error(
        `VeloDom template optimizer "${optimizer.name}" failed: ${error?.message || error}`,
        {
          cause: error
        }
      );
    }

    if (patch instanceof Promise) {
      patch.catch(() => {});
      throw new TypeError(
        `VeloDom template optimizer "${optimizer.name}" must be synchronous`
      );
    }

    if (patch !== undefined) {
      const optimizerPatch = patch as TemplateOptimizerResult;

      validateOptimizerResult(optimizer.name, optimizerPatch);
      current = {
        ...current,
        ...optimizerPatch
      };
      validateCompileResult(optimizer.name, current);
    }

    current = {
      ...current,
      manifest: createRuntimeFeatureManifest(
        current.metadata,
        additionalFeatures,
        current.ast
      )
    };
  });

  return current;
}

/** Builds a deterministic runtime manifest from metadata and template tags. */
export function createRuntimeFeatureManifest(
  metadata: DirectiveMetadata[],
  additionalFeatures: Iterable<string> = [],
  ast?: TemplateCompileResult["ast"]
): RuntimeFeatureManifest {
  const directives = new Set<string>();
  const features = new Set<string>(additionalFeatures);

  metadata.forEach(entry => {
    directives.add(entry.name);

    const feature = resolveRuntimeFeature(entry.name);

    if (feature) {
      features.add(feature);
    }
  });

  ast?.children.forEach(node => {
    const tagName = String(node.tagName || "").toLowerCase();

    if (tagName === "vd-component" || tagName === "component") {
      features.add(VD_COMPILER_FEATURES.COMPONENTS);
    }

    if (
      tagName === "vd-child"
      || tagName === "child"
      || tagName === "chiled"
    ) {
      features.add(VD_COMPILER_FEATURES.SLOTS);
    }
  });

  return {
    directives: [...directives].sort(),
    features: [...features].sort()
  };
}

function validateOptimizer(optimizer: TemplateOptimizer, index: number) {
  if (
    !optimizer
    || typeof optimizer !== "object"
    || typeof optimizer.name !== "string"
    || !optimizer.name.trim()
    || typeof optimizer.optimize !== "function"
  ) {
    throw new TypeError(
      `VeloDom compiler optimizer at index ${index} must have a name and optimize function`
    );
  }
}

function validateOptimizerResult(
  optimizerName: string,
  patch: TemplateOptimizerResult
) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError(
      `VeloDom template optimizer "${optimizerName}" must return an object or undefined`
    );
  }

  Object.keys(patch).forEach(key => {
    if (!VD_COMPILER_OPTIMIZER_RESULT_KEYS.includes(key)) {
      throw new TypeError(
        `VeloDom template optimizer "${optimizerName}" returned unsupported key "${key}"`
      );
    }
  });
}

function validateCompileResult(
  optimizerName: string,
  result: TemplateCompileResult
) {
  if (typeof result.html !== "string") {
    throwInvalidResult(optimizerName, "html", "a string");
  }

  if (!result.ast || typeof result.ast !== "object") {
    throwInvalidResult(optimizerName, "ast", "an object");
  }

  if (!Array.isArray(result.metadata)) {
    throwInvalidResult(optimizerName, "metadata", "an array");
  }

  if (!Array.isArray(result.diagnostics)) {
    throwInvalidResult(optimizerName, "diagnostics", "an array");
  }
}

function throwInvalidResult(
  optimizerName: string,
  key: string,
  expected: string
): never {
  throw new TypeError(
    `VeloDom template optimizer "${optimizerName}" must return ${key} as ${expected}`
  );
}

function resolveRuntimeFeature(directive: string) {
  if (directive.startsWith("data-vd-on")) {
    return VD_COMPILER_FEATURES.EVENTS;
  }

  if (directive.startsWith("data-vd-prop-")) {
    return VD_COMPILER_FEATURES.COMPONENTS;
  }

  switch (directive) {
    case "data-vd-if":
    case "data-vd-elseif":
    case "data-vd-else":
      return VD_COMPILER_FEATURES.CONDITIONALS;
    case "data-vd-show":
      return VD_COMPILER_FEATURES.VISIBILITY;
    case "data-vd-text":
      return VD_COMPILER_FEATURES.TEXT;
    case "data-vd-alt":
    case "data-vd-attr":
    case "data-vd-checked":
    case "data-vd-class":
    case "data-vd-disabled":
    case "data-vd-href":
    case "data-vd-src":
    case "data-vd-style":
    case "data-vd-value":
      return VD_COMPILER_FEATURES.BINDINGS;
    case "data-vd-model":
      return VD_COMPILER_FEATURES.MODEL;
    case "data-vd-for":
      return VD_COMPILER_FEATURES.LOOPS;
    case "data-vd-request":
    case "data-vd-request-config":
    case "data-vd-request-state":
    case "data-vd-auto-state":
    case "data-vd-params":
    case "data-vd-target":
    case "data-vd-state":
    case "data-vd-loading":
    case "data-vd-error":
      return VD_COMPILER_FEATURES.REQUESTS;
    case "data-vd-component":
    case "data-vd-key":
    case "data-vd-path":
    case "data-vd-props":
      return VD_COMPILER_FEATURES.COMPONENTS;
    case "data-vd-child":
    case "data-vd-get-child":
      return VD_COMPILER_FEATURES.SLOTS;
    case "data-vd-ref":
      return VD_COMPILER_FEATURES.REFS;
    case "data-vd-nav":
    case "data-vd-prefetch":
      return VD_COMPILER_FEATURES.NAVIGATION;
    case "data-vd-rtl-flip":
      return VD_COMPILER_FEATURES.RTL_FLIP;
    default:
      return "";
  }
}
