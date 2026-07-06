import {
  createApp,
  type VeloDomApp
} from "velodom";
import { createViteAdapter } from "velodom/vite";

const app: VeloDomApp = createApp({
  adapter: createViteAdapter()
});

void app.mount();
