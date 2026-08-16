import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as compilerApi from "../../src/core/compiler/index.ts";
import * as runtimeApi from "../../src/core/index.ts";
import * as testingApi from "../../src/core/testing.ts";
import * as vitePluginApi from "../../src/core/vite-plugin/index.ts";

const adapterEntrySource = await readSource("../../src/core/adapters/vite.ts");
const rootEntrySource = await readSource("../../src/core/index.ts");
const compilerEntrySource = await readSource("../../src/core/compiler/index.ts");
const testingEntrySource = await readSource("../../src/core/testing.ts");
const vitePluginEntrySource = await readSource("../../src/core/vite-plugin/index.ts");
const manifest = JSON.parse(await readSource("../../package.json"));

test("runtime public exports are frozen for the V1 package boundary", () => {
  assert.deepEqual(Object.keys(runtimeApi).sort(), [
    "ApiError",
    "VD_AUTH",
    "VD_MIDDLEWARE",
    "VD_REQUEST",
    "createApp",
    "createAuthRuntime",
    "createDevtoolsPlugin",
    "createDirectionPlugin",
    "createLocalStorageAuthProvider",
    "createPluginManager",
    "createRequestCache",
    "createRtlFlipStyles",
    "createServerSessionAuthProvider",
    "createSharedState",
    "createValidationPlugin",
    "defineRequestMiddleware",
    "normalizeAuthSession",
    "requestJson",
    "withRequestRetry"
  ]);
});

test("runtime public type exports are frozen for application authors", () => {
  assert.deepEqual(readTypeExportNames(rootEntrySource, "./types.ts"), [
    "AuthOptions",
    "AuthProvider",
    "AuthProviderContext",
    "AuthSessionPayload",
    "ComponentExpose",
    "ComponentScriptContext",
    "DevtoolsPluginOptions",
    "DirectionController",
    "DirectionLocaleDefinition",
    "DirectionPluginOptions",
    "DirectionValue",
    "ErrorBoundaryContext",
    "ErrorBoundaryFallback",
    "ErrorBoundaryHook",
    "LifecycleContext",
    "NavigationGuard",
    "PageConfig",
    "PageScriptContext",
    "PluginContext",
    "RequestAfterHook",
    "RequestBeforeHook",
    "RequestCache",
    "RequestCacheOptions",
    "RequestContext",
    "RequestHookOptions",
    "RequestLifecyclePayload",
    "RequestMiddleware",
    "RequestRetryOptions",
    "RequestRoute",
    "RequestRouteRegistry",
    "ResourceAdapter",
    "ResourceGroup",
    "RouteHandler",
    "RouteLocation",
    "RouterOptions",
    "RtlFlipStyleOptions",
    "SeoConfig",
    "SeoEntriesContext",
    "SeoEntriesHook",
    "SeoMetadata",
    "SeoOpenGraph",
    "SeoRouteEntry",
    "SeoSummary",
    "SeoTwitterCard",
    "SharedState",
    "SharedStateHandle",
    "SharedStateMethods",
    "SharedStatePluginOptions",
    "StateRecord",
    "UnknownRecord",
    "ValidationPluginOptions",
    "VeloDomApp",
    "VeloDomAppOptions",
    "VeloDomPlugin"
  ]);
  assert.deepEqual(readTypeExportNames(rootEntrySource, "./requests/index.ts"), [
    "ApiErrorOptions",
    "JsonRequestOptions"
  ]);
});

test("compiler public exports are frozen for build integrations", () => {
  assert.deepEqual(Object.keys(compilerApi).sort(), [
    "compileTemplate",
    "createRuntimeFeatureManifest",
    "defineTemplateOptimizer",
    "runTemplateOptimizers"
  ]);
  assert.deepEqual(readTypeExportNames(compilerEntrySource, "./types.ts"), [
    "CompilerDiagnostic",
    "CompilerMode",
    "CompilerOptions",
    "DirectiveMetadata",
    "RuntimeFeatureManifest",
    "SourceLocation",
    "TemplateAst",
    "TemplateCompileResult",
    "TemplateOptimizer",
    "TemplateOptimizerContext",
    "TemplateOptimizerResult"
  ]);
});

test("vite adapter and plugin public exports are frozen", () => {
  assert.deepEqual(readFunctionExportNames(adapterEntrySource), [
    "createViteAdapter"
  ]);
  assert.deepEqual(Object.keys(vitePluginApi).sort(), [
    "createTemplateModule",
    "velodom"
  ]);
  assert.deepEqual(readInterfaceExportNames(vitePluginEntrySource), [
    "TemplateModuleOptions",
    "VeloDomSeoBuildOptions",
    "VeloDomVitePluginOptions"
  ]);
});

test("testing utilities public exports are frozen", () => {
  assert.deepEqual(Object.keys(testingApi).sort(), [
    "mountTestComponent",
    "mountTestPage"
  ]);
  assert.deepEqual(readInterfaceExportNames(testingEntrySource), [
    "TestComponentDefinition",
    "TestComponentMountOptions",
    "TestMountResult",
    "TestPageMountOptions"
  ]);
});

test("package subpath exports are frozen", () => {
  assert.deepEqual(Object.keys(manifest.exports).sort(), [
    ".",
    "./compiler",
    "./package.json",
    "./testing",
    "./vite",
    "./vite-plugin"
  ]);
});

test("SSR and hydration are not public V1 package capabilities", () => {
  const deferredPatterns = [
    /hydrate/i,
    /ssr/i,
    /serverRender/i,
    /renderToString/i
  ];
  const publicNames = [
    ...Object.keys(runtimeApi),
    ...Object.keys(compilerApi),
    ...Object.keys(vitePluginApi),
    ...Object.keys(manifest.exports)
  ];

  assert.deepEqual(
    publicNames.filter(name => (
      deferredPatterns.some(pattern => pattern.test(name))
    )),
    []
  );
});

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function readTypeExportNames(source, specifier) {
  const escapedSpecifier = specifier.replaceAll(".", "\\.");
  const pattern = new RegExp(
    `export\\s+type\\s+\\{([^}]*)\\}\\s+from\\s+"${escapedSpecifier}";`
  );
  const match = source.match(pattern);

  assert.ok(match, `Expected type export block for ${specifier}`);

  return match[1]
    .split(",")
    .map(name => name.trim())
    .filter(Boolean);
}

function readInterfaceExportNames(source) {
  return [...source.matchAll(/export\s+interface\s+(\w+)/g)]
    .map(match => match[1])
    .sort();
}

function readFunctionExportNames(source) {
  return [...source.matchAll(/export\s+function\s+(\w+)/g)]
    .map(match => match[1])
    .sort();
}
