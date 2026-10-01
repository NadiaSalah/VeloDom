/**
 * ----------------------------------------
 * Module: Storefront Bootstrap
 * ----------------------------------------
 *
 * Mounts the example with optional, application-owned cart and direction
 * plugins. Neither capability is required by VeloDom Core.
 * ----------------------------------------
 */

import "./style.css";
import {
  createDirectionPlugin,
  createServerSessionAuthProvider,
  createValidationPlugin
} from "velodom";
import { mountVeloDom } from "velodom/vite";
import { cart } from "#app/domain/cart/cart-store.js";
import { confirmEditDeparture } from "#app/domain/forms/unsaved-edit.js";

await mountVeloDom({
  router: { beforeEach: confirmEditDeparture },
  auth: {
    defaultProvider: "store-session",
    providers: {
      "store-session": createServerSessionAuthProvider({
        sessionUrl: "/__fixture-api/session",
        credentials: "same-origin"
      })
    }
  },
  plugins: [
    cart.plugin,
    createValidationPlugin(),
    createDirectionPlugin({
      defaultLocale: "en",
      locales: {
        en: { lang: "en", direction: "ltr" },
        ar: { lang: "ar", direction: "rtl" }
      }
    })
  ]
});
