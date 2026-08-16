/**
 * ----------------------------------------
 * Module: Request Authentication
 * ----------------------------------------
 *
 * Builds provider-based auth runtimes, resolves request sessions and roles,
 * and supplies optional server-session and localStorage provider helpers.
 * ----------------------------------------
 */

import {
  VD_AUTH,
  VD_REQUEST
} from "../constants.ts";
import { isPlainObject } from "../shared/object.ts";
import type {
  AuthProvider,
  AuthSessionPayload,
  StateRecord,
  UnknownRecord
} from "../types.ts";

interface AuthRuntime {
  defaultProvider: string;
  providers: Record<string, AuthProvider>;
}

interface NormalizedAuthConfig {
  enabled: boolean;
  provider: string;
  options: UnknownRecord;
}

interface ResolveSessionOptions {
  runtime?: AuthRuntime;
  signal?: AbortSignal;
  routeName?: string;
  state?: StateRecord | null;
  el?: Element | null;
}

interface ServerAuthOptions {
  credentials: RequestCredentials;
  sessionUrl: string;
}

/** Creates a validated authentication provider registry. */
export function createAuthRuntime(config: unknown = {}): AuthRuntime {
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
  ) as Record<string, AuthProvider>;

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

/** Normalizes a route auth declaration against the configured runtime. */
export function normalizeRequestAuthConfig(
  value: unknown,
  runtime = createAuthRuntime()
): NormalizedAuthConfig | null {
  if (value === undefined || value === false) {
    return {
      enabled: false,
      provider: "",
      options: {}
    };
  }

  let provider = runtime.defaultProvider;
  let options: UnknownRecord = {};

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

/** Resolves and normalizes the authenticated session for one request. */
export async function resolveRequestSession(
  authConfig: NormalizedAuthConfig | null,
  {
    runtime = createAuthRuntime(),
    signal,
    routeName = "",
    state = null,
    el = null
  }: ResolveSessionOptions = {}
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

/** Creates an auth provider backed by a server session endpoint. */
export function createServerSessionAuthProvider(
  defaults: unknown = {}
): AuthProvider {
  const base = normalizeServerOptions(defaults);

  return async function serverSessionAuthProvider(context) {
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

/** Creates a browser-only localStorage auth provider for demonstrations. */
export function createLocalStorageAuthProvider(
  defaults: unknown = {}
): AuthProvider {
  if (!isPlainObject(defaults)) {
    throw new TypeError(
      "localStorage auth provider options must be a plain object"
    );
  }

  const storageKey = String(
    defaults.storageKey || VD_AUTH.STORAGE_KEY
  ).trim();
  const requireToken = defaults.requireToken !== false;

  if (!storageKey) {
    throw new TypeError("localStorage auth provider requires a storage key");
  }

  return function localStorageAuthProvider(context) {
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

    let payload: unknown;

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
      && !String(
        isPlainObject(payload)
          ? payload.token || ""
          : ""
      ).trim()
    ) {
      throw createAuthError(
        "Authentication token is missing",
        `Store a token in localStorage key "${routeStorageKey}".`
      );
    }

    return payload as AuthSessionPayload;
  };
}

/** Normalizes provider payloads into the session shape used by requests. */
export function normalizeAuthSession(payload: unknown, source = "") {
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
  const user = isPlainObject(payload.user)
    ? payload.user
    : null;
  const nestedRoles = Array.isArray(user?.roles)
    ? user.roles
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

/** Returns the framework's default server-session endpoint. */
export function getDefaultAuthSessionUrl() {
  return VD_AUTH.SESSION_URL;
}

function normalizeServerOptions(value: unknown): ServerAuthOptions {
  if (!isPlainObject(value)) {
    throw new TypeError("Server auth provider options must be a plain object");
  }

  const sessionUrl = String(
    value.sessionUrl || VD_AUTH.SESSION_URL
  ).trim();
  const credentials = String(
    value.credentials || VD_AUTH.DEFAULT_CREDENTIALS
  );

  if (!sessionUrl) {
    throw new TypeError("Server auth provider requires a session URL");
  }

  if (!VD_AUTH.CREDENTIALS.some(value => value === credentials)) {
    throw new TypeError(`Invalid auth credentials mode "${credentials}"`);
  }

  return {
    sessionUrl,
    credentials: credentials as RequestCredentials
  };
}

function createAuthError(
  message: string,
  hint: string,
  cause: unknown = null
) {
  const error = new Error(message);
  error.__vdStage = VD_REQUEST.STAGES.AUTH;
  error.__vdHint = hint;

  if (cause) {
    error.cause = cause;
  }

  return error;
}
