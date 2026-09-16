/**
 * ----------------------------------------
 * Module: Optional PWA Build Integration
 * ----------------------------------------
 *
 * Validates application-owned web app manifests and generates explicit,
 * reviewable service-worker assets when a project opts in. Importing VeloDom
 * or using its normal Vite plugin never registers a service worker.
 * ----------------------------------------
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Plugin,
  ResolvedConfig
} from "vite";
import { VD_PWA } from "./constants.ts";

/** One icon declared by an application-owned web app manifest. */
export interface PwaManifestIcon {
  purpose?: string;
  sizes: string;
  src: string;
  type?: string;
}

/** Web app manifest fields validated by VeloDom's optional build plugin. */
export interface PwaManifest {
  background_color?: string;
  description?: string;
  dir?: "auto" | "ltr" | "rtl";
  display?: "browser" | "fullscreen" | "minimal-ui" | "standalone" | "window-controls-overlay";
  icons: readonly PwaManifestIcon[];
  id?: string;
  lang?: string;
  name?: string;
  scope?: string;
  short_name?: string;
  start_url: string;
  theme_color?: string;
  [key: string]: unknown;
}

/** Stable installability or manifest diagnostic. */
export interface PwaDiagnostic {
  code: string;
  hint: string;
  message: string;
  path: string;
  severity: "error" | "warning";
}

/** Cache strategy algorithms supplied by the optional service worker. */
export type PwaCacheStrategyName =
  | "cache-first"
  | "cache-only"
  | "network-first"
  | "network-only"
  | "stale-while-revalidate";

/** Bounded request groups accepted by declarative PWA cache routes. */
export type PwaCacheMatch =
  | "navigation"
  | "path-prefix"
  | "same-origin"
  | "same-origin-assets";

/** One explicit service-worker cache route. */
export interface PwaCacheStrategy {
  cacheName: string;
  match: PwaCacheMatch;
  pathPrefix?: string;
  strategy: PwaCacheStrategyName;
}

/** Pure service-worker generation options for advanced build integrations. */
export interface PwaServiceWorkerOptions {
  cachePrefix?: string;
  offlineFallback?: string;
  precache?: string[];
  strategies?: readonly PwaCacheStrategy[];
  version?: string;
}

/** Enabled service-worker options used by the Vite build plugin. */
export interface PwaServiceWorkerBuildOptions extends PwaServiceWorkerOptions {
  filename?: string;
  offlineFilename?: string;
  offlineHtml?: string;
  register?: boolean;
  registrationFilename?: string;
  scope?: string;
}

/** Options for the fully opt-in VeloDom PWA Vite plugin. */
export interface VeloDomPwaOptions {
  manifest: PwaManifest;
  manifestFilename?: string;
  serviceWorker?: false | PwaServiceWorkerBuildOptions;
}

/** Options for generating a small external service-worker registration file. */
export interface PwaRegistrationOptions {
  scope?: string;
  serviceWorkerUrl: string;
}

/** Preserves inferred manifest fields after validating the static contract. */
export function definePwaManifest<const TManifest extends PwaManifest>(
  manifest: TManifest
): TManifest {
  const errors = inspectPwaManifest(manifest).filter(item => item.severity === "error");

  if (errors.length) {
    throw new TypeError([
      "Invalid VeloDom PWA manifest:",
      ...errors.map(error => `- [${error.code}] ${error.message}`)
    ].join("\n"));
  }
  return manifest;
}

/** Returns deterministic installability diagnostics without writing files. */
export function inspectPwaManifest(value: unknown): PwaDiagnostic[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [diagnostic(
      VD_PWA.CODES.MANIFEST,
      "error",
      "manifest",
      "The PWA manifest must be an object.",
      "Pass an application-owned object to definePwaManifest()."
    )];
  }

  const manifest = value as Partial<PwaManifest>;
  const diagnostics: PwaDiagnostic[] = [];
  const name = normalizedString(manifest.name);
  const shortName = normalizedString(manifest.short_name);

  if (!name && !shortName) {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.NAME,
      "error",
      "name",
      "A PWA manifest needs name or short_name.",
      "Add a visible application name; providing both fields gives better install UI."
    ));
  } else if (!name || !shortName) {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.NAME,
      "warning",
      name ? "short_name" : "name",
      `The manifest omits ${name ? "short_name" : "name"}.`,
      "Provide both long and compact application names."
    ));
  }

  inspectManifestPath(diagnostics, "start_url", manifest.start_url, true);
  if (manifest.scope !== undefined) {
    inspectManifestPath(diagnostics, "scope", manifest.scope, true);
  }
  if (manifest.id !== undefined) {
    inspectManifestPath(diagnostics, "id", manifest.id, true);
  }
  inspectManifestScope(diagnostics, manifest);

  if (
    manifest.display !== undefined
    && !VD_PWA.DISPLAY_MODES.includes(manifest.display)
  ) {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.MANIFEST,
      "error",
      "display",
      `Unsupported PWA display mode "${String(manifest.display)}".`,
      `Use one of: ${VD_PWA.DISPLAY_MODES.join(", ")}.`
    ));
  } else if (!manifest.display || manifest.display === "browser") {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.MANIFEST,
      "warning",
      "display",
      "The manifest does not request an app-like display mode.",
      "Use standalone or minimal-ui when installable app presentation is intended."
    ));
  }

  inspectManifestIcons(diagnostics, manifest.icons);
  return diagnostics.sort((left, right) => (
    left.severity.localeCompare(right.severity)
    || left.path.localeCompare(right.path)
    || left.code.localeCompare(right.code)
  ));
}

/** Preserves cache-route inference after validating every bounded strategy. */
export function definePwaCacheStrategies<
  const TStrategies extends readonly PwaCacheStrategy[]
>(strategies: TStrategies): TStrategies {
  validateStrategies(strategies);
  return strategies;
}

/** Generates a self-contained service worker from declarative cache routes. */
export function createPwaServiceWorker(options: PwaServiceWorkerOptions = {}): string {
  const cachePrefix = normalizeCacheToken(options.cachePrefix || VD_PWA.CACHE_PREFIX, "cachePrefix");
  const version = normalizeCacheToken(options.version || "v1", "version");
  const strategies = [...(options.strategies || VD_PWA.DEFAULT_STRATEGIES)] as PwaCacheStrategy[];
  const offlineFallback = options.offlineFallback
    ? requireAppPath(options.offlineFallback, "offlineFallback")
    : "";
  const precache = [...new Set([
    ...(options.precache || []).map((path, index) => requireAppPath(path, `precache[${index}]`)),
    ...(offlineFallback ? [offlineFallback] : [])
  ])];

  validateStrategies(strategies);
  const routes = strategies.map(strategy => ({
    cache: `${cachePrefix}-${version}-${normalizeCacheToken(strategy.cacheName, "cacheName")}`,
    match: strategy.match,
    pathPrefix: strategy.pathPrefix || "",
    strategy: strategy.strategy
  }));
  const ownedCaches = [...new Set([
    `${cachePrefix}-${version}-precache`,
    ...routes.map(route => route.cache)
  ])];

  return `/* Generated by the opt-in VeloDom PWA build plugin. */
const CACHE_PREFIX = ${JSON.stringify(`${cachePrefix}-`)};
const PRECACHE = ${JSON.stringify(`${cachePrefix}-${version}-precache`)};
const OWNED_CACHES = ${JSON.stringify(ownedCaches)};
const PRECACHE_URLS = ${JSON.stringify(precache)};
const OFFLINE_FALLBACK = ${JSON.stringify(offlineFallback)};
const ROUTES = ${JSON.stringify(routes)};

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names
        .filter(name => name.startsWith(CACHE_PREFIX) && !OWNED_CACHES.includes(name))
        .map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const route = ROUTES.find(candidate => matches(candidate, request, url));
  if (!route) return;
  event.respondWith(runStrategy(route, request));
});

function matches(route, request, url) {
  if (route.match === "navigation") return request.mode === "navigate";
  if (url.origin !== self.location.origin) return false;
  if (route.match === "same-origin") return true;
  if (route.match === "same-origin-assets") {
    return ["font", "image", "script", "style"].includes(request.destination);
  }
  return route.match === "path-prefix" && url.pathname.startsWith(route.pathPrefix);
}

async function runStrategy(route, request) {
  const cache = await caches.open(route.cache);
  if (route.strategy === "cache-only") {
    return (await cache.match(request)) || offlineResponse(request);
  }
  if (route.strategy === "cache-first") {
    return (await cache.match(request)) || fetchAndCache(cache, request);
  }
  if (route.strategy === "network-first") {
    try { return await fetchAndCache(cache, request); }
    catch { return (await cache.match(request)) || offlineResponse(request); }
  }
  if (route.strategy === "stale-while-revalidate") {
    const cached = await cache.match(request);
    const fresh = fetchAndCache(cache, request);
    if (cached) {
      fresh.catch(() => undefined);
      return cached;
    }
    return fresh;
  }
  try { return await fetch(request); }
  catch { return offlineResponse(request); }
}

async function fetchAndCache(cache, request) {
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function offlineResponse(request) {
  if (request.mode === "navigate" && OFFLINE_FALLBACK) {
    const response = await caches.match(OFFLINE_FALLBACK);
    if (response) return response;
  }
  return Response.error();
}
`;
}

/** Generates a small external browser registration module. */
export function createPwaRegistrationScript(options: PwaRegistrationOptions): string {
  const serviceWorkerUrl = requireSameOriginPath(
    options.serviceWorkerUrl,
    "serviceWorkerUrl"
  );
  const scope = options.scope ? requireAppPath(options.scope, "scope") : "/";

  return `if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(${JSON.stringify(serviceWorkerUrl)}, {
      scope: ${JSON.stringify(scope)}
    }).catch(error => {
      console.error("[VeloDom] PWA service worker registration failed", error);
    });
  }, { once: true });
}
`;
}

/**
 * Creates an opt-in Vite build plugin. A service worker and registration module
 * are emitted only when the serviceWorker option is an explicit object.
 */
export function velodomPwa(options: VeloDomPwaOptions): Plugin {
  let config: ResolvedConfig | undefined;
  const manifestFilename = normalizeOutputFile(
    options.manifestFilename || VD_PWA.MANIFEST_FILE,
    "manifestFilename"
  );
  const serviceWorker = options.serviceWorker || false;
  const serviceWorkerFilename = serviceWorker
    ? normalizeOutputFile(serviceWorker.filename || VD_PWA.SERVICE_WORKER_FILE, "serviceWorker.filename")
    : "";
  const registrationFilename = serviceWorker
    ? normalizeOutputFile(
      serviceWorker.registrationFilename || VD_PWA.REGISTRATION_FILE,
      "serviceWorker.registrationFilename"
    )
    : "";
  const offlineFilename = serviceWorker && serviceWorker.offlineHtml
    ? normalizeOutputFile(
      serviceWorker.offlineFilename || VD_PWA.OFFLINE_FILE,
      "serviceWorker.offlineFilename"
    )
    : "";
  const offlineFallback = serviceWorker
    ? serviceWorker.offlineFallback
      || (offlineFilename ? `/${offlineFilename}` : "")
    : "";

  return {
    name: "velodom-pwa",
    apply: "build",

    configResolved(resolved) {
      config = resolved;
    },

    buildStart() {
      for (const item of inspectPwaManifest(options.manifest)) {
        const message = `[${item.code}] ${item.message} ${item.hint}`;

        if (item.severity === "error") this.error(message);
        else this.warn(message);
      }
      if (serviceWorker) {
        createPwaServiceWorker({
          ...serviceWorker,
          offlineFallback
        });
      }
    },

    generateBundle(_output, bundle) {
      this.emitFile({
        type: "asset",
        fileName: manifestFilename,
        source: `${JSON.stringify(options.manifest, null, 2)}\n`
      });

      if (!serviceWorker) return;
      if (
        offlineFallback
        && !serviceWorker.offlineHtml
        && !bundle[offlineFallback.replace(/^\//, "")]
        && !hasPublicFallback(config, offlineFallback)
      ) {
        this.error(
          `PWA offline fallback "${offlineFallback}" is not present in the build. Provide offlineHtml or a public asset.`
        );
      }
      if (serviceWorker.offlineHtml) {
        this.emitFile({
          type: "asset",
          fileName: offlineFilename,
          source: serviceWorker.offlineHtml
        });
      }
      this.emitFile({
        type: "asset",
        fileName: serviceWorkerFilename,
        source: createPwaServiceWorker({
          ...serviceWorker,
          offlineFallback
        })
      });
      if (serviceWorker.register !== false) {
        this.emitFile({
          type: "asset",
          fileName: registrationFilename,
          source: createPwaRegistrationScript({
            scope: serviceWorker.scope || defaultRegistrationScope(config?.base),
            serviceWorkerUrl: withBase(config?.base || "/", serviceWorkerFilename)
          })
        });
      }
    },

    transformIndexHtml() {
      const tags: Array<{
        attrs: Record<string, string>;
        injectTo: "head";
        tag: string;
      }> = [{
        attrs: {
          href: withBase(config?.base || "/", manifestFilename),
          rel: "manifest"
        },
        injectTo: "head",
        tag: "link"
      }];
      const themeColor = normalizedString(options.manifest.theme_color);

      if (themeColor) {
        tags.push({
          attrs: { content: themeColor, name: "theme-color" },
          injectTo: "head",
          tag: "meta"
        });
      }
      if (serviceWorker && serviceWorker.register !== false) {
        tags.push({
          attrs: {
            src: withBase(config?.base || "/", registrationFilename),
            type: "module"
          },
          injectTo: "head",
          tag: "script"
        });
      }
      return tags;
    }
  };
}

/** Validates a manifest path and appends a source-located diagnostic. */
function inspectManifestPath(
  diagnostics: PwaDiagnostic[],
  path: string,
  value: unknown,
  required: boolean
) {
  if (!normalizedString(value)) {
    if (required) diagnostics.push(diagnostic(
      path === "start_url" ? VD_PWA.CODES.START_URL : VD_PWA.CODES.PATH,
      "error",
      path,
      `The PWA manifest requires ${path}.`,
      `Use an app-relative path such as ${path === "start_url" ? "/" : "/app/"}.`
    ));
    return;
  }
  try {
    requireAppPath(String(value), path);
  } catch (error) {
    diagnostics.push(diagnostic(
      path === "start_url" ? VD_PWA.CODES.START_URL : VD_PWA.CODES.PATH,
      "error",
      path,
      error instanceof Error ? error.message : String(error),
      "Keep install routes on the current application origin."
    ));
  }
}

/** Checks whether the start URL sits beneath an explicit manifest scope. */
function inspectManifestScope(
  diagnostics: PwaDiagnostic[],
  manifest: Partial<PwaManifest>
) {
  const startUrl = normalizedString(manifest.start_url);
  const scope = normalizedString(manifest.scope);

  if (!startUrl || !scope || !isAppPath(startUrl) || !isAppPath(scope)) return;
  const scopePrefix = scope.endsWith("/") ? scope : `${scope}/`;

  if (startUrl !== scope && !startUrl.startsWith(scopePrefix)) {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.SCOPE,
      "error",
      "scope",
      `Manifest start_url "${startUrl}" is outside scope "${scope}".`,
      "Choose a scope that contains the start URL."
    ));
  }
}

/** Checks icon paths, sizes, and the conventional installability sizes. */
function inspectManifestIcons(
  diagnostics: PwaDiagnostic[],
  icons: unknown
) {
  if (!Array.isArray(icons) || icons.length === 0) {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.ICONS,
      "error",
      "icons",
      "The PWA manifest needs at least one icon.",
      "Provide application-owned 192x192 and 512x512 icons."
    ));
    return;
  }

  const declaredSizes = new Set<string>();

  icons.forEach((rawIcon, index) => {
    const path = `icons[${index}]`;

    if (!rawIcon || typeof rawIcon !== "object" || Array.isArray(rawIcon)) {
      diagnostics.push(diagnostic(
        VD_PWA.CODES.ICONS,
        "error",
        path,
        `${path} must be an icon object.`,
        "Provide src, sizes, and an optional MIME type/purpose."
      ));
      return;
    }
    const icon = rawIcon as Partial<PwaManifestIcon>;
    try {
      requireAppPath(String(icon.src || ""), `${path}.src`);
    } catch (error) {
      diagnostics.push(diagnostic(
        VD_PWA.CODES.PATH,
        "error",
        `${path}.src`,
        error instanceof Error ? error.message : String(error),
        "Use a same-origin app-relative icon URL."
      ));
    }
    const sizes = normalizedString(icon.sizes);

    if (!sizes || !/^(?:any|\d+x\d+)(?:\s+(?:any|\d+x\d+))*$/i.test(sizes)) {
      diagnostics.push(diagnostic(
        VD_PWA.CODES.ICON_SIZE,
        "error",
        `${path}.sizes`,
        `${path}.sizes must contain values such as "192x192" or "any".`,
        "Declare the intrinsic icon sizes accurately."
      ));
    } else {
      sizes.toLowerCase().split(/\s+/).forEach(size => declaredSizes.add(size));
    }
  });

  if (!declaredSizes.has("any") && !declaredSizes.has("192x192")) {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.ICON_SIZE,
      "warning",
      "icons",
      "No 192x192 (or any-size) icon is declared.",
      "Add a 192x192 icon for common install surfaces."
    ));
  }
  if (!declaredSizes.has("any") && !declaredSizes.has("512x512")) {
    diagnostics.push(diagnostic(
      VD_PWA.CODES.ICON_SIZE,
      "warning",
      "icons",
      "No 512x512 (or any-size) icon is declared.",
      "Add a 512x512 icon for common install surfaces."
    ));
  }
}

/** Validates bounded cache routes before serializing them into JavaScript. */
function validateStrategies(strategies: readonly PwaCacheStrategy[]) {
  if (!Array.isArray(strategies) || strategies.length === 0) {
    throw new TypeError("VeloDom PWA cache strategies must be a non-empty array");
  }
  const names = new Set<string>();

  strategies.forEach((route, index) => {
    if (!route || typeof route !== "object") {
      throw new TypeError(`VeloDom PWA strategy ${index} must be an object`);
    }
    if (!VD_PWA.MATCHERS.includes(route.match)) {
      throw new TypeError(`Unknown VeloDom PWA cache matcher "${String(route.match)}"`);
    }
    if (!VD_PWA.STRATEGIES.includes(route.strategy)) {
      throw new TypeError(`Unknown VeloDom PWA cache strategy "${String(route.strategy)}"`);
    }
    const cacheName = normalizeCacheToken(route.cacheName, `strategies[${index}].cacheName`);

    if (names.has(cacheName)) {
      throw new TypeError(`Duplicate VeloDom PWA cache name "${cacheName}"`);
    }
    names.add(cacheName);
    if (route.match === "path-prefix") {
      requireAppPath(route.pathPrefix || "", `strategies[${index}].pathPrefix`);
    } else if (route.pathPrefix) {
      throw new TypeError(`VeloDom PWA ${route.match} matcher cannot define pathPrefix`);
    }
  });
}

/** Creates one stable PWA diagnostic record. */
function diagnostic(
  code: string,
  severity: PwaDiagnostic["severity"],
  path: string,
  message: string,
  hint: string
): PwaDiagnostic {
  return { code, hint, message, path, severity };
}

/** Restricts runtime and cache paths to the current application origin. */
function requireAppPath(value: string, label: string) {
  const path = normalizedString(value);

  if (!isAppPath(path)) {
    throw new TypeError(`VeloDom PWA ${label} must be an app-relative path`);
  }
  return path;
}

/** Accepts safe root-relative or dot-relative URLs for emitted build assets. */
function requireSameOriginPath(value: string, label: string) {
  const path = normalizedString(value);

  if (isAppPath(path)) return path;
  if (
    !path.startsWith("./")
    || path.startsWith("//")
    || path.includes("\\")
    || path.includes("\0")
  ) {
    throw new TypeError(`VeloDom PWA ${label} must be a same-origin path`);
  }
  const pathname = path.split(/[?#]/, 1)[0] || "";
  let decoded: string;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new TypeError(`VeloDom PWA ${label} must be a same-origin path`);
  }
  if (decoded.split("/").some(segment => segment === "..")) {
    throw new TypeError(`VeloDom PWA ${label} must be a same-origin path`);
  }
  return path;
}

/** Recognizes app-relative URLs without protocol-relative ambiguity. */
function isAppPath(value: string) {
  const path = value.split(/[?#]/, 1)[0] || "";
  let decoded: string;

  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }

  return value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("\\")
    && !value.includes("\0")
    && !decoded.split("/").some(segment => segment === "." || segment === "..");
}

/** Validates cache and version labels before using them as cache names. */
function normalizeCacheToken(value: string, label: string) {
  const token = normalizedString(value);

  if (!/^[A-Za-z0-9._-]+$/.test(token)) {
    throw new TypeError(`VeloDom PWA ${label} must use letters, numbers, dot, dash, or underscore`);
  }
  return token;
}

/** Keeps emitted filenames relative to Vite's output directory. */
function normalizeOutputFile(value: string, label: string) {
  const file = normalizedString(value).replaceAll("\\", "/").replace(/^\/+/, "");

  if (!file || file.split("/").some(segment => !segment || segment === "." || segment === "..")) {
    throw new TypeError(`VeloDom PWA ${label} must be a safe output-relative filename`);
  }
  return file;
}

/** Joins an emitted asset filename to Vite's configured public base. */
function withBase(base: string, file: string) {
  const prefix = base.endsWith("/") ? base : `${base}/`;

  return `${prefix}${file}`.replace(/([^:]\/)\/{2,}/g, "$1");
}

/** Uses a safe root scope when Vite emits dot-relative asset URLs. */
function defaultRegistrationScope(base: string | undefined) {
  return base && isAppPath(base) ? base : "/";
}

/** Checks an explicit offline fallback copied from Vite's public directory. */
function hasPublicFallback(config: ResolvedConfig | undefined, path: string) {
  if (!config || typeof config.publicDir !== "string" || !config.publicDir) return false;
  const file = path.split(/[?#]/, 1)[0]?.replace(/^\/+/, "") || "";

  return Boolean(file) && existsSync(resolve(config.publicDir, file));
}

/** Converts optional manifest text to a trimmed string. */
function normalizedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
