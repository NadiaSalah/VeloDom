import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as compilerApi from "../../../packages/velodom/src/compiler/index.ts";
import * as assetsApi from "../../../packages/velodom/src/assets.ts";
import * as devtoolsApi from "../../../packages/velodom/src/devtools.ts";
import * as contentApi from "../../../packages/velodom/src/content.ts";
import * as runtimeApi from "../../../packages/velodom/src/index.ts";
import * as testingApi from "../../../packages/velodom/src/testing.ts";
import * as vitePluginApi from "../../../packages/velodom/src/vite-plugin/index.ts";

const adapterEntrySource = await readSource("../../../packages/velodom/src/adapters/vite.ts");
const assetsEntrySource = await readSource("../../../packages/velodom/src/assets.ts");
const devtoolsEntrySource = await readSource("../../../packages/velodom/src/devtools.ts");
const rootEntrySource = await readSource("../../../packages/velodom/src/index.ts");
const compilerEntrySource = await readSource("../../../packages/velodom/src/compiler/index.ts");
const contentEntrySource = await readSource("../../../packages/velodom/src/content.ts");
const testingEntrySource = await readSource("../../../packages/velodom/src/testing.ts");
const vitePluginEntrySource = await readSource("../../../packages/velodom/src/vite-plugin/index.ts");
const manifest = JSON.parse(await readSource("../../../packages/velodom/package.json"));

test("runtime public exports are frozen for the V1 package boundary", () => {
  assert.deepEqual(Object.keys(runtimeApi).sort(), [
    "ApiError",
    "VD_AUTH",
    "VD_MIDDLEWARE",
    "VD_REQUEST",
    "assertResourceAdapterConformance",
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
    "definePageConfig",
    "definePlugin",
    "defineRequestMiddleware",
    "defineRequestRoute",
    "defineResourceAdapter",
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
    "DevtoolsBridge",
    "DevtoolsSnapshot",
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
    "PageDataContext",
    "PageDataLoader",
    "PagePrerenderConfig",
    "PageScriptContext",
    "PluginContext",
    "PrerenderEntry",
    "PrerenderRenderContext",
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
    "ResourceAdapterCapability",
    "ResourceAdapterVersion",
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
    "analyzeVeloDomDocument",
    "compileTemplate",
    "createRuntimeFeatureManifest",
    "defineTemplateOptimizer",
    "getVeloDomDirectiveCompletions",
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
  assert.deepEqual(readTypeExportNames(compilerEntrySource, "../language-service.ts"), [
    "VeloDomDirectiveCompletion",
    "VeloDomLanguageAnalysis",
    "VeloDomLanguageDocument"
  ]);
});

test("content public exports are frozen for build-time integrations", () => {
  assert.deepEqual(Object.keys(contentApi).sort(), [
    "createContentCollection",
    "createContentRssFeed",
    "createContentSearchIndex",
    "createContentSeoEntries",
    "createContentSitemap",
    "loadContentCollection",
    "parseMarkdownContent"
  ]);
  assert.deepEqual(readInterfaceExportNames(contentEntrySource), [
    "ContentCollection",
    "ContentCollectionOptions",
    "ContentEntry",
    "ContentFileLoadOptions",
    "ContentGenerationOptions",
    "ContentRssOptions",
    "ContentSearchRecord",
    "ContentSitemapEntry",
    "ContentSource"
  ]);
  assert.deepEqual(readTypeExportNames(contentEntrySource, "local"), [
    "ContentFrontmatter",
    "ContentFrontmatterValue"
  ]);
});

test("asset public exports remain build-time only", () => {
  assert.deepEqual(Object.keys(assetsApi).sort(), [
    "createResponsiveImageAttributes",
    "inspectImageAsset",
    "inspectImageDirectory"
  ]);
  assert.deepEqual(readInterfaceExportNames(assetsEntrySource), [
    "AssetImageDirectoryOptions",
    "AssetImageDirectoryReport",
    "AssetImageInspection",
    "ResponsiveImageAttributes",
    "ResponsiveImageOptions",
    "ResponsiveImageVariant"
  ]);
  assert.deepEqual(readTypeExportNames(assetsEntrySource, "local"), [
    "ImageFormat"
  ]);
});

test("optional devtools inspector remains an explicit subpath", () => {
  assert.deepEqual(Object.keys(devtoolsApi), [
    "mountDevtoolsInspector"
  ]);
  assert.deepEqual(readInterfaceExportNames(devtoolsEntrySource), [
    "DevtoolsInspectorHandle",
    "DevtoolsInspectorOptions"
  ]);
});

test("vite adapter and plugin public exports are frozen", () => {
  assert.deepEqual(readFunctionExportNames(adapterEntrySource), [
    "createViteAdapter",
    "createViteApp",
    "mountVeloDom"
  ]);
  assert.deepEqual(readTypeExportNames(adapterEntrySource, "local"), [
    "ViteAppOptions"
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
    "./assets",
    "./compiler",
    "./content",
    "./devtools",
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
  if (specifier === "local") {
    return [...source.matchAll(/export\s+type\s+(\w+)/g)]
      .map(match => match[1])
      .sort();
  }

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
