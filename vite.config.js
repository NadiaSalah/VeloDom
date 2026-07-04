import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { velodom } from "velodom/vite-plugin";

export default defineConfig({
  server: {
    historyApiFallback: true,
  },
  plugins: [
    velodom(),
    tailwindcss()
  ],
});
