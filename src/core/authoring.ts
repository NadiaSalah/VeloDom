/**
 * ----------------------------------------
 * Module: Optional Authoring Declarations
 * ----------------------------------------
 *
 * Gives JavaScript and TypeScript application authors small identity helpers
 * that preserve inferred types without introducing a separate configuration
 * language or browser runtime behavior.
 * ----------------------------------------
 */

import type {
  PageConfig,
  RequestRoute,
  ResourceAdapter,
  VeloDomPlugin
} from "./types.ts";

/**
 * Declares a page config with inference in TypeScript and JSDoc-aware editors.
 */
export function definePageConfig<TConfig extends PageConfig>(
  config: TConfig
): TConfig {
  return config;
}

/**
 * Declares one application request route without changing its runtime shape.
 */
export function defineRequestRoute<TRoute extends RequestRoute>(
  route: TRoute
): TRoute {
  return route;
}

/**
 * Declares an optional application plugin without changing its runtime shape.
 */
export function definePlugin<TPlugin extends VeloDomPlugin>(
  plugin: TPlugin
): TPlugin {
  return plugin;
}

/**
 * Declares a build-tool resource adapter without adding a runtime wrapper.
 */
export function defineResourceAdapter<TAdapter extends ResourceAdapter>(
  adapter: TAdapter
): TAdapter {
  return adapter;
}
