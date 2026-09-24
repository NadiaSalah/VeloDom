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
  createValidationPlugin
} from "velodom";
import { mountVeloDom } from "velodom/vite";
import { cart } from "#app/domain/cart/cart-store.js";

await mountVeloDom({
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
