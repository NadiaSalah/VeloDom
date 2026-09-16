/**
 * ----------------------------------------
 * Module: Development Error Overlay
 * ----------------------------------------
 *
 * Renders an explicitly mounted, development-only view of structured runtime
 * reports. It observes errors only; application error boundaries keep complete
 * ownership of recovery and fallback UI.
 * ----------------------------------------
 */

import { VD_ERROR } from "../constants.ts";
import { subscribeErrorReports } from "../errors/error-reporter.ts";
import type {
  ErrorDiagnosticGroup,
  VeloDomErrorReport
} from "../types.ts";

/** Options for the explicitly mounted development error overlay. */
export interface VeloDomErrorOverlayOptions {
  limit?: number;
  target?: HTMLElement;
}

/** Controls one mounted error overlay without affecting app recovery. */
export interface VeloDomErrorOverlayHandle {
  add(report: VeloDomErrorReport): void;
  clear(): void;
  destroy(): void;
  readonly reports: readonly VeloDomErrorReport[];
}

/** Groups reports by stable compiler/router/request/component/runtime owner. */
export function groupVeloDomErrorReports(
  reports: readonly VeloDomErrorReport[]
): Map<ErrorDiagnosticGroup, VeloDomErrorReport[]> {
  const grouped = new Map<ErrorDiagnosticGroup, VeloDomErrorReport[]>();

  VD_ERROR.GROUPS.forEach(group => grouped.set(group as ErrorDiagnosticGroup, []));
  reports.forEach(report => grouped.get(report.group)?.push(report));
  return grouped;
}

/**
 * Mounts the optional development overlay. Import this from `velodom/devtools`
 * only in a development entry; normal runtime imports never mount or style it.
 */
export function mountVeloDomErrorOverlay(
  options: VeloDomErrorOverlayOptions = {}
): VeloDomErrorOverlayHandle {
  if (typeof document === "undefined") {
    throw new Error("VeloDom error overlay requires a browser document.");
  }
  const limit = normalizeLimit(options.limit);
  const reports: VeloDomErrorReport[] = [];
  const target = options.target || document.body;
  const panel = document.createElement("aside");
  const header = document.createElement("header");
  const title = document.createElement("strong");
  const actions = document.createElement("div");
  const clearButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const output = document.createElement("div");

  panel.setAttribute(VD_ERROR.OVERLAY_ATTRIBUTE, "");
  panel.setAttribute("aria-label", "VeloDom development errors");
  panel.setAttribute("aria-live", "polite");
  panel.hidden = true;
  title.textContent = "VeloDom diagnostics";
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  actions.append(clearButton, closeButton);
  header.append(title, actions);
  panel.append(header, output);
  applyOverlayStyles(panel, header, output, actions);
  target.append(panel);

  const render = () => renderReports(panel, output, reports);
  const add = (report: VeloDomErrorReport) => {
    reports.push(report);
    if (reports.length > limit) reports.splice(0, reports.length - limit);
    render();
  };
  const clear = () => {
    reports.splice(0);
    render();
  };
  const unsubscribe = subscribeErrorReports(add);
  const destroy = () => {
    unsubscribe();
    clearButton.removeEventListener("click", clear);
    closeButton.removeEventListener("click", destroy);
    panel.remove();
  };

  clearButton.addEventListener("click", clear);
  closeButton.addEventListener("click", destroy);

  return {
    add,
    clear,
    destroy,
    get reports() {
      return [...reports];
    }
  };
}

/** Renders grouped report summaries without creating application controls. */
function renderReports(
  panel: HTMLElement,
  output: HTMLElement,
  reports: readonly VeloDomErrorReport[]
) {
  output.replaceChildren();
  panel.hidden = reports.length === 0;
  if (reports.length === 0) return;

  groupVeloDomErrorReports(reports).forEach((items, group) => {
    if (items.length === 0) return;
    const section = document.createElement("details");
    const summary = document.createElement("summary");

    section.open = true;
    summary.textContent = `${group} (${items.length})`;
    section.append(summary);
    items.slice().reverse().forEach(report => {
      const article = document.createElement("article");
      const heading = document.createElement("strong");
      const message = document.createElement("p");
      const source = document.createElement("code");
      const ownership = document.createElement("small");

      heading.textContent = `${report.code} · ${report.title}`;
      message.textContent = report.rawMessage;
      source.textContent = `${report.location.file}:${report.location.line}:${report.location.column}`;
      ownership.textContent = report.ownership.length
        ? report.ownership.map(item => `${item.kind}:${item.name}`).join(" > ")
        : "ownership unavailable";
      article.append(heading, message, source, ownership);
      section.append(article);
    });
    output.append(section);
  });
}

/** Applies isolated inline presentation without a framework stylesheet. */
function applyOverlayStyles(
  panel: HTMLElement,
  header: HTMLElement,
  output: HTMLElement,
  actions: HTMLElement
) {
  Object.assign(panel.style, {
    background: "#0b1220",
    border: "1px solid #334155",
    borderRadius: "14px",
    bottom: "16px",
    boxShadow: "0 24px 70px rgba(2, 6, 23, 0.45)",
    color: "#e2e8f0",
    font: "13px/1.5 ui-sans-serif, system-ui, sans-serif",
    maxHeight: "min(70vh, 640px)",
    maxWidth: "min(92vw, 720px)",
    overflow: "auto",
    padding: "14px",
    position: "fixed",
    right: "16px",
    width: "520px",
    zIndex: "2147483647"
  });
  Object.assign(header.style, {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px"
  });
  Object.assign(actions.style, { display: "flex", gap: "6px" });
  Object.assign(output.style, { display: "grid", gap: "10px" });
}

/** Bounds retained reports so long development sessions stay predictable. */
function normalizeLimit(value: number | undefined) {
  if (value === undefined) return VD_ERROR.OVERLAY_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new TypeError("VeloDom error overlay limit must be an integer from 1 to 500");
  }
  return value;
}
