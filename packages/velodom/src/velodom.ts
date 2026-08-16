/**
 * ----------------------------------------
 * Module: Application Factory
 * ----------------------------------------
 *
 * Composes routing, requests, authentication, middleware, plugins, and global
 * error handling behind VeloDom's public createApp API.
 * ----------------------------------------
 */

import { createPageRouter } from "./page-router.ts";
import { reportUserActionError } from "./errors/error-reporter.ts";
import { configureRequestRuntime } from "./requests/request-router.ts";
import { createPluginManager } from "./plugins.ts";
import type {
  VeloDomApp,
  VeloDomAppOptions
} from "./types.ts";

/** Creates a VeloDom application from injected resources and policies. */
export function createApp(options: VeloDomAppOptions): VeloDomApp {
  configureRequestRuntime({
    routes: options.routes,
    middleware: options.middleware,
    auth: options.auth,
    hooks: options.requestHooks
  });
  const app = {} as VeloDomApp;
  const router = createPageRouter(
    options.adapter,
    options.router,
    options.errorBoundary || null,
    app
  );
  registerGlobalErrorHandlers();
  const plugins = createPluginManager(
    options.plugins || [],
    () => ({
      app,
      navigate: router.navigate
    })
  );

  Object.assign(app, {
    async mount() {
      await plugins.setup();
      return router.init();
    },

    async destroy() {
      await router.destroy();
      await plugins.destroy();
    },
    navigate: router.navigate
  });

  return app;
}

let handlersRegistered = false;

function registerGlobalErrorHandlers() {
  if (handlersRegistered) return;

  handlersRegistered = true;

  window.addEventListener("error", (event) => {
    reportUserActionError(event?.error || event, {
      title: "Unexpected Runtime Error",
      hint: "Inspect the stack location and fix the failing expression or handler.",
      fatal: true
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();

    reportUserActionError(event?.reason || event, {
      title: "Unhandled Promise Rejection",
      hint: "Await promises in handlers and add try/catch around async logic.",
      fatal: true
    });
  });
}
