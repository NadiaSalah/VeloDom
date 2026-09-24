/**
 * ----------------------------------------
 * Module: Storefront Vite Configuration
 * ----------------------------------------
 *
 * Keeps the commerce reference consumer on the public VeloDom Vite contract.
 * ----------------------------------------
 */

import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { velodom } from "velodom/vite-plugin";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url))
      }
    ]
  },
  server: {
    historyApiFallback: true
  },
  plugins: [velodom()]
});
