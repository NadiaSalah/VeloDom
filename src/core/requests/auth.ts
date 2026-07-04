import {
  VD_AUTH,
  VD_REQUEST
} from "../constants.ts";

export function createAuthRuntime(config: any = {}) {
  if (!isPlainObject(config)) {
    throw new TypeError("VeloDom auth configuration must be a plain object");
  }

  const configuredProviders = config.providers ?? {};

  if (!isPlainObject(configuredProviders)) {
    throw new TypeError("VeloDom auth providers must be a plain object");
  }

  const providers = Object.assign(
    Object.create(null),
    {
      [VD_AUTH.PROVIDERS.SERVER]: createServerSessionAuthProvider()
    },
    configuredProviders
  );

  Object.entries(providers).forEach(([name, provider]) => {
    if (!name.trim() || typeof provider !== "function") {
      throw new TypeError(`Auth provider "${name}" must be a function`);
    }
  });

  const defaultProvider = String(
    config.defaultProvider || VD_AUTH.PROVIDERS.SERVER
  ).trim();

  if (!Object.hasOwn(providers, defaultProvider)) {
    throw new TypeError(
      `Default auth provider "${defaultProvider}" is not registered`
    );
  }

  return {
    defaultProvider,
    providers
  };
}

export function normalizeRequestAuthConfig(value, runtime = createAuthRuntime()) {
  if (value === undefined || value === false) {
    return {
      enabled: false,
      provider: "",
      options: {}
    };
  }

  let provider = runtime.defaultProvider;
  let options: any = {};

  if (typeof value === "string") {
    provider = value.trim();
  } else if (isPlainObject(value)) {
    provider = String(
      value.provider
      || value.mode
      || runtime.defaultProvider
    ).trim();
    options = {
      ...value
    };
  } else if (value !== true) {
    return null;
  }

  if (!provider || !Object.hasOwn(runtime.providers, provider)) {
    return null;
  }

  return {
    enabled: true,
    provider,
    options
  };
}

export async function resolveRequestSession(
  authConfig,
  {
    runtime = createAuthRuntime(),
    signal,
    routeName = "",
    state = null,
    el = null
  }: any = {}
) {
  if (!authConfig?.enabled) {
    return null;
  }

  const provider = runtime.providers[authConfig.provider];

  if (typeof provider !== "function") {
    throw createAuthError(
      `Auth provider "${authConfig.provider}" is not registered`,
      "Register the provider through createApp({ auth: { providers: { ... } } })."
    );
  }

  let payload;

  try {
    payload = await provider({
      routeName,
      state,
      el,
      signal,
      options: authConfig.options || {}
    });
  } catch (error) {
    if (error?.name === "AbortError" || error?.__vdStage) {
      throw error;
    }

    throw createAuthError(
      error?.message || `Auth provider "${authConfig.provider}" failed`,
      `Check the "${authConfig.provider}" auth provider implementation.`,
      error
    );
  }

  return normalizeAuthSession(payload, authConfig.provider);
}

export function createServerSessionAuthProvider(defaults: any = {}) {
  const base = normalizeServerOptions(defaults);

  return async function serverSessionAuthProvider(context: any = {}) {
    const options = normalizeServerOptions({
      ...base,
      ...(context.options || {})
    });
    let response;

    try {
      response = await fetch(options.sessionUrl, {
        method: "GET",
        credentials: options.credentials,
        signal: context.signal,
        headers: {
          Accept: "application/json"
        }
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }

      throw createAuthError(
        error?.message || `Auth session request failed for ${options.sessionUrl}`,
        "Check the session endpoint, network connection, and CORS credentials configuration.",
        error
      );
    }

    if (!response.ok) {
      throw createAuthError(
        `Auth session request failed (${response.status}) for ${options.sessionUrl}`,
        "Create a backend session endpoint that returns the current authenticated user and roles."
      );
    }

    try {
      return await response.json();
    } catch (error) {
      throw createAuthError(
        "Auth session endpoint returned invalid JSON",
        "Return JSON like { authenticated: true, user: { roles: [\"admin\"] } }.",
        error
      );
    }
  };
}

export function createLocalStorageAuthProvider(defaults: any = {}) {
  const storageKey = String(
    defaults.storageKey || VD_AUTH.STORAGE_KEY
  ).trim();
  const requireToken = defaults.requireToken !== false;

  if (!storageKey) {
    throw new TypeError("localStorage auth provider requires a storage key");
  }

  return function localStorageAuthProvider(context: any = {}) {
    if (typeof window === "undefined" || !window.localStorage) {
      throw createAuthError(
        "localStorage is not available",
        "The localStorage auth provider requires a browser environment."
      );
    }

    const routeStorageKey = String(
      context.options?.storageKey || storageKey
    ).trim();
    const raw = window.localStorage.getItem(routeStorageKey);

    if (!raw) {
      return null;
    }

    let payload;

    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw createAuthError(
        `Invalid JSON in localStorage key "${routeStorageKey}"`,
        `Store valid JSON in localStorage["${routeStorageKey}"].`,
        error
      );
    }

    if (
      requireToken
      && context.options?.requireToken !== false
      && !String(payload?.token || "").trim()
    ) {
      throw createAuthError(
        "Authentication token is missing",
        `Store a token in localStorage key "${routeStorageKey}".`
      );
    }

    return payload;
  };
}

export function normalizeAuthSession(payload, source = "") {
  if (payload === null || payload === undefined || payload === false) {
    return null;
  }

  if (!isPlainObject(payload)) {
    throw createAuthError(
      `Auth provider "${source}" must return an object or null`,
      "Return { authenticated, user, token, roles } or null."
    );
  }

  const explicitAuthenticated = typeof payload.authenticated === "boolean"
    ? payload.authenticated
    : typeof payload.loggedIn === "boolean"
      ? payload.loggedIn
      : null;
  const authenticated = explicitAuthenticated
    ?? Boolean(payload.user || payload.token);
  const directRoles = Array.isArray(payload.roles)
    ? payload.roles
    : [];
  const nestedRoles = Array.isArray(payload.user?.roles)
    ? payload.user.roles
    : [];

  return {
    source,
    raw: payload,
    authenticated,
    token: typeof payload.token === "string"
      ? payload.token.trim()
      : "",
    roles: [...new Set([...directRoles, ...nestedRoles]
      .map(role => String(role || "").trim())
      .filter(Boolean))]
  };
}

export function getDefaultAuthSessionUrl() {
  return VD_AUTH.SESSION_URL;
}

function normalizeServerOptions(value) {
  if (!isPlainObject(value)) {
    throw new TypeError("Server auth provider options must be a plain object");
  }

  const sessionUrl = String(
    value.sessionUrl || VD_AUTH.SESSION_URL
  ).trim();
  const credentials = value.credentials || VD_AUTH.DEFAULT_CREDENTIALS;

  if (!sessionUrl) {
    throw new TypeError("Server auth provider requires a session URL");
  }

  if (!VD_AUTH.CREDENTIALS.includes(credentials)) {
    throw new TypeError(`Invalid auth credentials mode "${credentials}"`);
  }

  return {
    sessionUrl,
    credentials
  };
}

function createAuthError(message, hint, cause = null) {
  const error = new Error(message);
  error.__vdStage = VD_REQUEST.STAGES.AUTH;
  error.__vdHint = hint;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
