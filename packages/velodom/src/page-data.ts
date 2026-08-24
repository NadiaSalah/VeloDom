/**
 * ----------------------------------------
 * Module: Page Data Contract
 * ----------------------------------------
 *
 * Resolves conventional page data modules in the browser and transfers
 * explicitly supplied build data through safe JSON script markers. The module
 * contains no fetching policy: applications own data access and future build
 * or server adapters use the same public loader contract.
 * ----------------------------------------
 */

import { VD_PAGE_DATA } from "./constants.ts";
import type {
  PageDataContext,
  PageDataLoader,
  ResourceLoader,
  RouteLocation,
  UnknownRecord
} from "./types.ts";

/** Resolves the preferred `load` export or default export from a page data module. */
export function resolvePageDataLoader(
  module: UnknownRecord,
  page: string
): PageDataLoader {
  const loader = module.load || module.default;

  if (typeof loader !== "function") {
    throw new TypeError(
      `Page data module for "${page}" must export load(context) or a default function`
    );
  }

  return loader as PageDataLoader;
}

/** Loads application-owned client data for one resolved page route. */
export async function loadClientPageData(
  loader: ResourceLoader<UnknownRecord> | undefined,
  context: Omit<PageDataContext, "mode">
): Promise<unknown> {
  if (!loader) return undefined;

  const module = await loader();
  const load = resolvePageDataLoader(module, context.page);

  return load({
    ...context,
    mode: VD_PAGE_DATA.MODES.CLIENT
  });
}

/** Renders build-only page data for direct static-route visits. */
export function renderPageDataTransfer(
  page: string,
  route: string,
  data: unknown
): string {
  if (data === undefined) return "";

  return [
    `<script type="application/json" ${VD_PAGE_DATA.ATTRIBUTE}`,
    ` ${VD_PAGE_DATA.PAGE_ATTRIBUTE}="${escapeAttribute(page)}"`,
    ` ${VD_PAGE_DATA.ROUTE_ATTRIBUTE}="${escapeAttribute(route)}">`,
    serializePageData(data, route),
    "</script>"
  ].join("");
}

/** Reads and consumes matching build data before the router replaces `#app`. */
export function consumePageDataTransfer(
  doc: Document,
  page: string,
  route: RouteLocation
): {
  found: boolean;
  data: unknown;
} {
  const node = doc.querySelector(VD_PAGE_DATA.SCRIPT_SELECTOR);

  if (!node || node.tagName !== "SCRIPT") {
    return {
      found: false,
      data: undefined
    };
  }

  const script = node as HTMLScriptElement;
  const expectedPage = script.getAttribute(VD_PAGE_DATA.PAGE_ATTRIBUTE);
  const expectedRoute = script.getAttribute(VD_PAGE_DATA.ROUTE_ATTRIBUTE);

  if (expectedPage !== page || expectedRoute !== route.path) {
    return {
      found: false,
      data: undefined
    };
  }

  try {
    return {
      found: true,
      data: JSON.parse(script.textContent || "null")
    };
  } catch (error) {
    throw new SyntaxError(
      `Invalid static page data for "${route.path}"`,
      {
        cause: error
      }
    );
  } finally {
    script.remove();
  }
}

function serializePageData(data: unknown, route: string) {
  try {
    return JSON.stringify(data)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  } catch (error) {
    throw new TypeError(
      `Static page data for "${route}" must be JSON-serializable`,
      {
        cause: error
      }
    );
  }
}

function escapeAttribute(value: string) {
  return value.replace(/[&"'<>]/g, character => ({
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&#39;",
    "<": "&lt;",
    ">": "&gt;"
  })[character] || character);
}
