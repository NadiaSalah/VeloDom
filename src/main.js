import "./style.css";
import {
  createApp
} from "velodom";
import { createViteAdapter } from "velodom/vite";
import routes from "./api/routes.js";

createApp({
  adapter: createViteAdapter(),
  routes
}).mount();
