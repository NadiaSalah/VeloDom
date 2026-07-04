import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { velodom } from "./packages/vite-plugin/src/index.ts";

export default defineConfig({
  server: {
    historyApiFallback: true,
  },
  plugins: [
    velodom(),
    tailwindcss()
  ],
});
