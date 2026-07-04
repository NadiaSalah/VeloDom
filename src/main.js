import "./style.css";
import {
  createApp,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  VD_AUTH
} from "./core/index.js";
import routes from "./api/routes.js";
import middleware from "./api/middleware.js";
import { createViteAdapter } from "./adapters/vite.js";

createApp({
  adapter: createViteAdapter(),
  auth: {
    defaultProvider: VD_AUTH.PROVIDERS.SERVER,
    providers: {
      [VD_AUTH.PROVIDERS.SERVER]: createServerSessionAuthProvider(),
      [VD_AUTH.PROVIDERS.DEMO]: createLocalStorageAuthProvider()
    }
  },
  routes,
  middleware
}).mount();
