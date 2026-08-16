import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { velodom } from "velodom/vite-plugin";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(
          new URL("./src", import.meta.url)
        )
      }
    ]
  },
  server: {
    historyApiFallback: true
  },
  plugins: [
    velodom(),
    tailwindcss()
  ]
});
