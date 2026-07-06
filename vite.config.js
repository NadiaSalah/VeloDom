import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { velodom } from "./src/core/vite-plugin/index.ts";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "velodom/vite",
        replacement: fileURLToPath(
          new URL("./src/core/adapters/vite.ts", import.meta.url)
        )
      },
      {
        find: "velodom",
        replacement: fileURLToPath(
          new URL("./src/core/index.ts", import.meta.url)
        )
      }
    ]
  },
  server: {
    historyApiFallback: true,
  },
  plugins: [
    velodom(),
    tailwindcss()
  ],
});
