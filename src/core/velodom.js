import { createPageRouter } from "./page-router.js";
import { reportUserActionError } from "./errors/error-reporter.js";
import { configureRequestRuntime } from "./requests/request-router.js";
import { createPluginManager } from "./plugins.js";

export function createApp(options = {}) {

  configureRequestRuntime({
    routes: options.routes,
    middleware: options.middleware,
    auth: options.auth
  });
  const router = createPageRouter(
    options.adapter,
    options.router
  );
  registerGlobalErrorHandlers();
  let app;
  const plugins = createPluginManager(
    options.plugins || [],
    () => ({
      app,
      navigate: router.navigate
    })
  );

  app = {

    async mount() {
      await plugins.setup();
      return router.init();
    },

    async destroy() {
      await router.destroy();
      await plugins.destroy();
    },
    navigate: router.navigate

  };

  return app;
}

let handlersRegistered = false;

function registerGlobalErrorHandlers() {
  if (handlersRegistered) return;

  handlersRegistered = true;

  window.addEventListener("error", (event) => {
    reportUserActionError(event?.error || event, {
      title: "Unexpected Runtime Error",
      file: "src/core/velodom.js",
      line: 27,
      hint: "Inspect the stack location and fix the failing expression or handler.",
      fatal: true
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();

    reportUserActionError(event?.reason || event, {
      title: "Unhandled Promise Rejection",
      file: "src/core/velodom.js",
      line: 33,
      hint: "Await promises in handlers and add try/catch around async logic.",
      fatal: true
    });
  });
}
