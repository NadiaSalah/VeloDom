/**
 * ----------------------------------------
 * Module: Optional Development Inspector
 * ----------------------------------------
 *
 * Renders a tiny standalone inspector only when an application explicitly
 * imports this development helper and registers the devtools bridge. The
 * production runtime never loads this module through createApp().
 * ----------------------------------------
 */

import { VD_DEVTOOLS } from "./constants.ts";
import type { DevtoolsBridge } from "./types.ts";

/** Options for mounting the standalone, opt-in browser inspector. */
export interface DevtoolsInspectorOptions {
  /** Bridge global configured through createDevtoolsPlugin(). */
  globalName?: string;
  /** Existing element that receives the inspector. Defaults to document.body. */
  target?: HTMLElement;
}

/** Handle returned by the optional standalone development inspector. */
export interface DevtoolsInspectorHandle {
  /** Re-reads the bridge snapshot and updates the inspector text. */
  refresh(): void;
  /** Removes inspector elements and listeners. */
  destroy(): void;
}

/**
 * Mounts a simple read-only development inspector. It fails clearly when the
 * application did not register createDevtoolsPlugin(), preventing hidden
 * globals or production behavior.
 */
export function mountDevtoolsInspector(
  options: DevtoolsInspectorOptions = {}
): DevtoolsInspectorHandle {
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("VeloDom devtools inspector requires a browser document.");
  }

  const globalName = options.globalName || VD_DEVTOOLS.GLOBAL_NAME;
  const bridge = getBridge(globalName);
  const target = options.target || document.body;
  const panel = document.createElement("aside");
  const title = document.createElement("strong");
  const output = document.createElement("pre");
  const refreshButton = document.createElement("button");

  panel.setAttribute(VD_DEVTOOLS.INSPECTOR_ATTRIBUTE, "");
  panel.setAttribute("aria-label", VD_DEVTOOLS.INSPECTOR_TITLE);
  title.textContent = VD_DEVTOOLS.INSPECTOR_TITLE;
  refreshButton.type = "button";
  refreshButton.textContent = VD_DEVTOOLS.REFRESH_LABEL;
  panel.append(title, refreshButton, output);
  target.append(panel);

  const refresh = () => {
    output.textContent = JSON.stringify(bridge.inspect(), null, 2);
  };
  const onRefresh = () => refresh();

  refreshButton.addEventListener("click", onRefresh);
  refresh();

  return {
    refresh,
    destroy() {
      refreshButton.removeEventListener("click", onRefresh);
      panel.remove();
    }
  };
}

function getBridge(globalName: string): DevtoolsBridge {
  const value = (window as unknown as Record<string, unknown>)[globalName];

  if (!isDevtoolsBridge(value)) {
    throw new Error(
      `VeloDom devtools bridge "${globalName}" is unavailable. ` +
      "Register createDevtoolsPlugin() before mounting the inspector."
    );
  }

  return value;
}

function isDevtoolsBridge(value: unknown): value is DevtoolsBridge {
  return Boolean(value)
    && typeof value === "object"
    && typeof (value as DevtoolsBridge).inspect === "function";
}
