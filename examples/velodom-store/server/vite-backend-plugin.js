/**
 * ----------------------------------------
 * Module: Store Backend Vite Plugin
 * ----------------------------------------
 *
 * Mounts the deterministic backend fixture only in the example's local dev and
 * preview servers. Production applications replace this plugin with their API.
 * ----------------------------------------
 */

import { createStoreBackendFixture } from "./backend-fixture.js";
import { handleStoreBackendNodeRequest } from "./node-backend.js";

/** Creates the local-only Vite middleware plugin for the store example. */
export function storeBackendFixturePlugin() {
  const backend = createStoreBackendFixture();
  const install = server => {
    server.middlewares.use(async (request, response, next) => {
      if (await handleStoreBackendNodeRequest(request, response, backend)) return;

      next();
    });
  };

  return {
    name: "velodom-store-backend-fixture",
    configurePreviewServer: install,
    configureServer: install
  };
}
