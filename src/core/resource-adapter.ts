/**
 * ----------------------------------------
 * Module: Resource Adapter Validation
 * ----------------------------------------
 *
 * Validates injected page/component resource maps so the generic runtime never
 * depends directly on filesystem or build-tool conventions.
 * ----------------------------------------
 */

import { isPlainObject } from "./shared/object.ts";
import { normalizeSeoConfig } from "./seo.ts";
import type {
  RuntimeFeatureManifest
} from "./compiler/types.ts";
import type {
  PageConfig,
  ResourceLoader,
  UnknownRecord
} from "./types.ts";

interface ResourceGroupValidationOptions {
  allowConfigs: boolean;
  requireHtml: boolean;
}

/** Fully validated lazy resources for one page/component group. */
export interface ValidatedResourceGroup {
  html: Record<string, ResourceLoader<string>>;
  modules: Record<string, ResourceLoader<UnknownRecord>>;
  styles: Record<string, ResourceLoader<string>>;
  configs: Record<string, PageConfig>;
  manifests: Record<
    string,
    ResourceLoader<RuntimeFeatureManifest | undefined>
  >;
}

/** Validated runtime resource adapter with page and component groups. */
export interface ValidatedResourceAdapter {
  pages: ValidatedResourceGroup;
  components: ValidatedResourceGroup;
}

/** Validates an injected adapter and returns normalized resource groups. */
export function validateResourceAdapter(
  adapter: unknown
): ValidatedResourceAdapter {
  if (!isPlainObject(adapter)) {
    throw createAdapterError(
      "VeloDom requires a resource adapter",
      "Pass createViteAdapter() through createApp({ adapter })."
    );
  }

  const pages = validateResourceGroup(adapter.pages, "pages", {
    requireHtml: true,
    allowConfigs: true
  });
  const components = validateResourceGroup(
    adapter.components || {},
    "components",
    {
      requireHtml: false,
      allowConfigs: false
    }
  );

  return {
    pages,
    components
  };
}

function validateResourceGroup(
  value: unknown,
  label: string,
  options: ResourceGroupValidationOptions
): ValidatedResourceGroup {
  if (!isPlainObject(value)) {
    throw createAdapterError(
      `Adapter "${label}" resources must be an object`,
      `Provide adapter.${label}.html, modules, and styles resource maps.`
    );
  }

  const html = validateLoaderMap<string>(
    value.html || {},
    `${label}.html`
  );
  const modules = validateLoaderMap<UnknownRecord>(
    value.modules || {},
    `${label}.modules`
  );
  const styles = validateLoaderMap<string>(
    value.styles || {},
    `${label}.styles`
  );
  const manifests = validateLoaderMap<
    RuntimeFeatureManifest | undefined
  >(
    value.manifests || {},
    `${label}.manifests`
  );
  const configs = options.allowConfigs
    ? validateConfigMap(value.configs || {}, `${label}.configs`)
    : Object.create(null);

  if (options.requireHtml && Object.keys(html).length === 0) {
    throw createAdapterError(
      "Adapter did not discover any pages",
      "Create at least one page folder with index.html."
    );
  }

  return {
    html,
    modules,
    styles,
    configs,
    manifests
  };
}

function validateLoaderMap<T>(
  value: unknown,
  label: string
): Record<string, ResourceLoader<T>> {
  if (!isPlainObject(value)) {
    throw createAdapterError(
      `Adapter resource map "${label}" must be an object`,
      "Use a folder-name to loader-function map."
    );
  }

  Object.entries(value).forEach(([name, loader]) => {
    if (!name.trim() || typeof loader !== "function") {
      throw createAdapterError(
        `Adapter resource "${label}.${name}" must be a loader function`,
        "Return lazy loader functions from the build adapter."
      );
    }
  });

  return value as Record<string, ResourceLoader<T>>;
}

function validateConfigMap(
  value: unknown,
  label: string
): Record<string, PageConfig> {
  if (!isPlainObject(value)) {
    throw createAdapterError(
      `Adapter resource map "${label}" must be an object`,
      "Use a folder-name to page-config object map."
    );
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, config]) => {
      if (!name.trim() || !isPlainObject(config)) {
        throw createAdapterError(
          `Adapter config "${label}.${name}" must be a plain object`,
          "Export a default object from config.js."
        );
      }

      return [
        name,
        {
          ...config,
          seo: normalizeSeoConfig(
            config.seo,
            `Adapter config "${label}.${name}".seo`
          )
        } as PageConfig
      ];
    })
  );
}

function createAdapterError(message: string, hint: string) {
  const error = new Error(message);
  error.code = "VD_INVALID_ADAPTER";
  error.__vdStage = "adapter";
  error.__vdHint = hint;
  return error;
}
