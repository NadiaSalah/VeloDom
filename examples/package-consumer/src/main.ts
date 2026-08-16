import {
  createApp,
  type VeloDomApp
} from "velodom";
import type {
  TestMountResult
} from "velodom/testing";
import { createViteAdapter } from "velodom/vite";

const _testingTypeSmoke: TestMountResult | null = null;
const app: VeloDomApp = createApp({
  adapter: createViteAdapter()
});

void _testingTypeSmoke;
void app.mount();
