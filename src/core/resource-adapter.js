export function validateResourceAdapter(adapter) {
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

function validateResourceGroup(value, label, options) {
  if (!isPlainObject(value)) {
    throw createAdapterError(
      `Adapter "${label}" resources must be an object`,
      `Provide adapter.${label}.html, modules, and styles resource maps.`
    );
  }

  const html = validateLoaderMap(value.html || {}, `${label}.html`);
  const modules = validateLoaderMap(value.modules || {}, `${label}.modules`);
  const styles = validateLoaderMap(value.styles || {}, `${label}.styles`);
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
    configs
  };
}

function validateLoaderMap(value, label) {
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

  return value;
}

function validateConfigMap(value, label) {
  if (!isPlainObject(value)) {
    throw createAdapterError(
      `Adapter resource map "${label}" must be an object`,
      "Use a folder-name to page-config object map."
    );
  }

  Object.entries(value).forEach(([name, config]) => {
    if (!name.trim() || !isPlainObject(config)) {
      throw createAdapterError(
        `Adapter config "${label}.${name}" must be a plain object`,
        "Export a default object from config.js."
      );
    }
  });

  return value;
}

function createAdapterError(message, hint) {
  const error = new Error(message);
  error.code = "VD_INVALID_ADAPTER";
  error.__vdStage = "adapter";
  error.__vdHint = hint;
  return error;
}

function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
