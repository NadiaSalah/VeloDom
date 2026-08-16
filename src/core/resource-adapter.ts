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
import { VD_ADAPTER, VD_RESOURCE_ADAPTER } from "./constants.ts";
import { normalizeSeoConfig } from "./seo.ts";
import type {
  RuntimeFeatureManifest
} from "./compiler/types.ts";
import type {
  PageConfig,
  ResourceAdapter,
  ResourceAdapterCapability,
  ResourceLoader,
  UnknownRecord
} from "./types.ts";

interface ResourceGroupValidationOptions {
  allowConfigs: boolean;
  requireHtml: boolean;
}

interface VeloDomAnnotatedError extends Error {
  __vdFile?: string;
  __vdHint?: string;
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
  version: number;
  capabilities: ResourceAdapterCapability[];
  pages: ValidatedResourceGroup;
  components: ValidatedResourceGroup;
  layouts: ValidatedResourceGroup;
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

  const version = validateAdapterVersion(adapter.version);
  const capabilities = validateAdapterCapabilities(adapter.capabilities);

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
  const layouts = validateResourceGroup(
    adapter.layouts || {},
    "layouts",
    {
      requireHtml: false,
      allowConfigs: false
    }
  );

  return {
    version,
    capabilities,
    pages,
    components,
    layouts
  };
}

/**
 * Checks an adapter implementation against the stable VeloDom resource
 * contract without mounting an application. Adapter authors can run this in
 * their own conformance fixtures.
 */
export function assertResourceAdapterConformance(
  adapter: ResourceAdapter
): void {
  validateResourceAdapter(adapter);
}

function validateAdapterVersion(value: unknown) {
  if (value === undefined) return VD_ADAPTER.VERSION;

  if (value !== VD_ADAPTER.VERSION) {
    throw createAdapterError(
      `Unsupported resource adapter contract version: ${String(value)}`,
      `Use version: ${VD_ADAPTER.VERSION} or omit the version for legacy adapter compatibility.`
    );
  }

  return value;
}

function validateAdapterCapabilities(
  value: unknown
): ResourceAdapterCapability[] {
  if (value === undefined) return [];

  if (!Array.isArray(value)) {
    throw createAdapterError(
      "Adapter capabilities must be an array of known capability names",
      "Use adapter capabilities only to document supported resource features."
    );
  }

  const supported = new Set<string>(VD_ADAPTER.CAPABILITIES);
  const capabilities = [...new Set(value)];

  if (capabilities.some(capability => (
    typeof capability !== "string" || !supported.has(capability)
  ))) {
    throw createAdapterError(
      "Adapter capabilities include an unsupported capability name",
      `Supported capabilities: ${VD_ADAPTER.CAPABILITIES.join(", ")}.`
    );
  }

  return capabilities as ResourceAdapterCapability[];
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
        "Return lazy loader functions from the build adapter.",
        `${VD_RESOURCE_ADAPTER.STAGE}.${label}.${name || VD_RESOURCE_ADAPTER.EMPTY_NAME}`
      );
    }
  });

  return Object.fromEntries(
    Object.entries(value).map(([name, loader]) => {
      const file = getResourceSourceFile(label, name);

      return [
        name,
        createSourceAwareLoader<T>(
          loader as ResourceLoader<T>,
          file,
          `Check ${file} and its default/named exports.`
        )
      ];
    })
  );
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
        normalizePageConfig(config, label, name)
      ];
    })
  );
}

function normalizePageConfig(
  config: UnknownRecord,
  label: string,
  name: string
): PageConfig {
  const file = getResourceSourceFile(label, name);

  try {
    const layout = normalizeLayoutName(config.layout, label, name);

    return {
      ...config,
      ...(layout !== undefined ? { layout } : {}),
      seo: normalizeSeoConfig(
        config.seo,
        `Adapter config "${label}.${name}".seo`
      )
    } as PageConfig;
  } catch (error) {
    throw attachSourceToError(
      error,
      file,
      `Check the page configuration exported from ${file}.`
    );
  }
}

function normalizeLayoutName(
  value: unknown,
  label: string,
  name: string
) {
  if (value === undefined) return undefined;
  if (value === false) return false;
  if (typeof value !== "string") {
    throw createAdapterError(
      `Adapter config "${label}.${name}".layout must be a layout name or false`,
      "Use layout: \"default\" or layout: false in page config.",
      getResourceSourceFile(label, name)
    );
  }

  const layout = value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");

  if (!layout || layout.includes("..")) {
    throw createAdapterError(
      `Adapter config "${label}.${name}".layout must be a safe non-empty path`,
      "Use a layout name such as default, blog, or dashboard/admin.",
      getResourceSourceFile(label, name)
    );
  }

  return layout;
}

function createSourceAwareLoader<T>(
  loader: ResourceLoader<T>,
  file: string,
  hint: string
): ResourceLoader<T> {
  return async () => {
    try {
      return await loader();
    } catch (error) {
      throw attachSourceToError(error, file, hint);
    }
  };
}

function attachSourceToError(
  error: unknown,
  file: string,
  hint: string
) {
  const normalized = error instanceof Error
    ? error
    : new Error(String(error));
  const annotated = normalized as VeloDomAnnotatedError;

  annotated.__vdFile = annotated.__vdFile || file;
  annotated.__vdHint = annotated.__vdHint || hint;
  return annotated;
}

function getResourceSourceFile(label: string, name: string) {
  const [group, type] = label.split(".");
  const root = getResourceRoot(group);
  const folder = name || VD_RESOURCE_ADAPTER.UNKNOWN_FOLDER;

  switch (type) {
    case VD_RESOURCE_ADAPTER.TYPES.HTML:
      return `${root}/${folder}/${VD_RESOURCE_ADAPTER.FILES.HTML}`;
    case VD_RESOURCE_ADAPTER.TYPES.MODULES:
      return `${root}/${folder}/${VD_RESOURCE_ADAPTER.FILES.MODULE}`;
    case VD_RESOURCE_ADAPTER.TYPES.STYLES:
      return `${root}/${folder}/${VD_RESOURCE_ADAPTER.FILES.STYLE}`;
    case VD_RESOURCE_ADAPTER.TYPES.CONFIGS:
      return `${root}/${folder}/${VD_RESOURCE_ADAPTER.FILES.CONFIG}`;
    case VD_RESOURCE_ADAPTER.TYPES.MANIFESTS:
      return `${root}/${folder}/${VD_RESOURCE_ADAPTER.FILES.HTML}`;
    default:
      return `${VD_RESOURCE_ADAPTER.STAGE}.${label}.${folder}`;
  }
}

function getResourceRoot(group: string) {
  if (group === VD_RESOURCE_ADAPTER.GROUPS.COMPONENTS) {
    return VD_RESOURCE_ADAPTER.ROOTS.COMPONENTS;
  }

  if (group === VD_RESOURCE_ADAPTER.GROUPS.LAYOUTS) {
    return VD_RESOURCE_ADAPTER.ROOTS.LAYOUTS;
  }

  return VD_RESOURCE_ADAPTER.ROOTS.PAGES;
}

function createAdapterError(
  message: string,
  hint: string,
  file: string = VD_RESOURCE_ADAPTER.CREATE_APP_FILE
) {
  const error = new Error(message) as VeloDomAnnotatedError & {
    code?: string;
    __vdStage?: string;
  };
  error.code = VD_RESOURCE_ADAPTER.CODE;
  error.__vdStage = VD_RESOURCE_ADAPTER.STAGE;
  error.__vdHint = hint;
  error.__vdFile = file;
  return error;
}
