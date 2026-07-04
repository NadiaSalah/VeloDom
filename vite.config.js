import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { velodom } from "./packages/vite-plugin/src/index.js";

export default defineConfig({
  server: {
    historyApiFallback: true,
  },
  plugins: [
    velodom(),
    tailwindcss()
  ],
});
